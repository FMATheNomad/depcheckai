import { Command } from 'commander';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ScannerOrchestrator, ScannedPackage } from './scanners/index.js';
import { Ecosystem } from './scanners/manifest.js';
import { HealthScoreCalculator, HealthScore } from './scoring/index.js';
import { RecommendationEngine, Recommendation } from './recommend/index.js';
import { buildReport, Report } from './formatters/base.js';
import { TableFormatter } from './formatters/table.js';
import { JsonFormatter } from './formatters/json.js';
import { MarkdownFormatter } from './formatters/markdown.js';
import { logger, setLogLevel, createSpinner } from './utils/logger.js';
import { generateConfig, configToJson } from './utils/config.js';
import { globalCache } from './utils/cache.js';

const program = new Command();
const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

program
  .name('depcheck-ai')
  .description('AI-powered dependency health checker')
  .version(pkg.version || '0.1.0')
  .option('--manifest <path>', 'Path to manifest file')
  .option('--eco <ecosystem>', 'Filter by ecosystem (npm, pypi, crates)')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .option('--fail-on <level>', 'Fail CI if score below threshold (low, medium, high)', 'low')
  .option('--verbose', 'Verbose output')
  .option('--silent', 'Silent mode (no output)');

program
  .command('check [package-spec]')
  .description('Check a single package (e.g., lodash, react@18.2.0)')
  .option('--eco <ecosystem>', 'Ecosystem (npm, pypi, crates)')
  .action(async (packageSpec: string | undefined, options: Record<string, unknown>) => {
    if (!packageSpec) {
      logger.error('Package name required. Usage: depcheck-ai check <package>');
      process.exit(1);
    }

    let name = packageSpec;
    let version = 'latest';
    if (name.includes('@')) {
      const parts = name.split('@');
      name = parts[0];
      if (parts.length > 1 && parts[1]) version = parts[1];
    }

    const ecosystem = (options.eco as string) || detectEcosystem(name) || 'npm';
    const ecoNormalized = ecosystem as Ecosystem;

    const orchestrator = new ScannerOrchestrator();
    const healthCalc = new HealthScoreCalculator();
    const recommender = new RecommendationEngine();

    const spinner = createSpinner(`Checking ${packageSpec}...`);
    spinner.start();

    try {
      const dep = { name, version, ecosystem: ecoNormalized };
      const scanned = await orchestrator.scanSingle(dep);

      if (!scanned.registryInfo) {
        spinner.fail(`Package "${name}" not found on ${ecoNormalized}`);
        process.exit(1);
      }

      const health = healthCalc.calculate(scanned);
      const recommendation = await recommender.recommend(scanned, health);

      spinner.succeed(`Checked ${packageSpec}`);

      const report = buildReport(
        [scanned],
        new Map([[`${ecoNormalized}:${scanned.dependency.name}`, health]]),
        new Map([[`${ecoNormalized}:${scanned.dependency.name}`, recommendation]])
      );

      if (options.json || program.opts().json) {
        logger.raw(JsonFormatter.format(report));
      } else if (options.markdown || program.opts().markdown) {
        logger.raw(MarkdownFormatter.format(report));
      } else {
        logger.raw(TableFormatter.format(report));
      }

      const failLevel = (options.failOn as string) || (program.opts().failOn as string) || 'low';
      const exitCode = shouldFail(health, failLevel);
      process.exit(exitCode);
    } catch (err) {
      spinner.fail(`Error checking ${packageSpec}`);
      logger.error(err);
      process.exit(1);
    }
  });

program
  .command('scan')
  .description('Scan dependencies in current directory')
  .option('--manifest <path>', 'Path to manifest file')
  .option('--eco <ecosystem>', 'Filter by ecosystem')
  .option('--json', 'JSON output')
  .option('--markdown', 'Markdown output')
  .option('--fail-on <level>', 'Fail CI if score below threshold')
  .action(async (options: Record<string, unknown>) => {
    await runScan(options);
  });

program
  .command('update')
  .description('Show update recommendations')
  .option('--interactive', 'Interactive mode')
  .action(async (options: Record<string, unknown>) => {
    const merged = { ...program.opts(), ...options };
    const scanned = await performScan(merged);
    const healthCalc = new HealthScoreCalculator();
    const recommender = new RecommendationEngine();

    const healthScores = new Map<string, HealthScore>();
    const recommendations = new Map<string, Recommendation>();

    for (const pkg of scanned) {
      const key = `${pkg.dependency.ecosystem}:${pkg.dependency.name}`;
      const health = healthCalc.calculate(pkg);
      const rec = await recommender.recommend(pkg, health);
      healthScores.set(key, health);
      recommendations.set(key, rec);
    }

    const report = buildReport(scanned, healthScores, recommendations);
    const updates = report.dependencies.filter(
      d => d.recommendation.action === 'update' || d.recommendation.action === 'update-major'
    );

    if (updates.length === 0) {
      logger.success('All dependencies are up to date!');
      return;
    }

    logger.info(`${updates.length} update(s) available:`);
    for (const dep of updates) {
      logger.raw(`  ${dep.name}: ${dep.version} → ${dep.latest} (${dep.recommendation.reason})`);
    }
  });

program
  .command('audit')
  .description('Full audit (health + security)')
  .option('--manifest <path>', 'Path to manifest file')
  .option('--eco <ecosystem>', 'Filter by ecosystem')
  .option('--json', 'JSON output')
  .option('--markdown', 'Markdown output')
  .option('--fail-on <level>', 'Fail CI if score below threshold')
  .action(async (options: Record<string, unknown>) => {
    await runScan({ ...options, audit: true });
  });

program
  .command('init')
  .description('Generate .depcheck-ai.json config')
  .action(() => {
    const config = generateConfig();
    const configStr = configToJson(config);
    const configPath = join(process.cwd(), '.depcheck-ai.json');
    if (existsSync(configPath)) {
      logger.warn('.depcheck-ai.json already exists. Overwriting.');
    }
    writeFileSync(configPath, configStr, 'utf-8');
    logger.success(`Config generated at ${configPath}`);
  });

const args = process.argv.slice(2);
const knownCommands = ['check', 'scan', 'update', 'audit', 'init', 'help'];
const hasCommand = args.some(a => knownCommands.includes(a));

if (!hasCommand) {
  const scanArgs = ['node', 'depcheck-ai', 'scan', ...args];
  program.parse(scanArgs);
} else {
  program.parse(process.argv);
}

async function runScan(options: Record<string, unknown>) {
  const merged = { ...program.opts(), ...options };
  if (merged.verbose) setLogLevel('debug');
  if (merged.silent) setLogLevel('silent');

  const scanned = await performScan(merged);
  if (scanned.length === 0) {
    logger.warn('No dependencies found to scan.');
    process.exit(0);
    return;
  }

  const healthCalc = new HealthScoreCalculator();
  const recommender = new RecommendationEngine();

  const healthScores = new Map<string, HealthScore>();
  const recommendations = new Map<string, Recommendation>();

  for (const pkg of scanned) {
    const key = `${pkg.dependency.ecosystem}:${pkg.dependency.name}`;
    const health = healthCalc.calculate(pkg);
    const rec = await recommender.recommend(pkg, health);
    healthScores.set(key, health);
    recommendations.set(key, rec);
  }

  const report = buildReport(scanned, healthScores, recommendations);

  if (merged.json) {
    logger.raw(JsonFormatter.format(report));
  } else if (merged.markdown) {
    logger.raw(MarkdownFormatter.format(report));
  } else {
    logger.raw(TableFormatter.format(report));
  }

  if (merged.verbose) {
    const cacheStats = globalCache.stats;
    logger.debug(`Cache: ${cacheStats.size} entries, ${cacheStats.hits} hits, ${cacheStats.misses} misses, ${cacheStats.hitRate}% hit rate`);
  }

  const failLevel = (merged.failOn as string) || 'low';
  const healthValues = [...healthScores.values()];
  const worstHealth = healthValues.length > 0
    ? healthValues.reduce((worst, h) => (h.overall < worst.overall ? h : worst))
    : { overall: 100, level: 'good' as const };
  const exitCode = shouldFail(worstHealth, failLevel);
  process.exit(exitCode);
}

async function performScan(opts: Record<string, unknown>): Promise<ScannedPackage[]> {
  const manifestPath = opts.manifest as string | undefined;
  const filterEco = opts.eco as Ecosystem | undefined;
  const orchestrator = new ScannerOrchestrator();

  if (manifestPath) {
    const fullPath = join(process.cwd(), manifestPath);
    if (!existsSync(fullPath)) {
      logger.fatal(`Manifest file not found: ${fullPath}`);
    }
    const spinner = createSpinner(`Scanning ${manifestPath}...`);
    spinner.start();
    try {
      const results = await orchestrator.scanManifest(fullPath, filterEco);
      spinner.succeed(`Scanned ${manifestPath} — ${results.length} dependencies found`);
      return results;
    } catch (err) {
      spinner.fail(`Failed to scan ${manifestPath}`);
      logger.error(err);
      process.exit(1);
    }
  }

  const spinner = createSpinner('Detecting manifest files...');
  spinner.start();
  try {
    const results = await orchestrator.scanDirectory(process.cwd(), filterEco);
    spinner.succeed(`Scan complete — ${results.length} dependencies found`);
    return results;
  } catch (err) {
    spinner.fail('Scan failed');
    logger.error(err);
    process.exit(1);
  }
}

function shouldFail(health: HealthScore | { overall: number; level: string }, failOn: string): number {
  const thresholds: Record<string, number> = { low: 30, medium: 50, high: 70 };
  const threshold = thresholds[failOn] || 30;
  return health.overall < threshold ? 1 : 0;
}

function detectEcosystem(input: string): string | null {
  if (input.match(/^py/)) return 'pypi';
  if (input.match(/^rs-/)) return 'crates';
  return 'npm';
}
