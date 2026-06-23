import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ScannerOrchestrator } from '../scanners/index.js';
import { Ecosystem } from '../scanners/manifest.js';
import { HealthScoreCalculator } from '../scoring/index.js';
import { RecommendationEngine } from '../recommend/index.js';
import { buildReport } from '../formatters/base.js';
import { TableFormatter } from '../formatters/table.js';
import { JsonFormatter } from '../formatters/json.js';
import { MarkdownFormatter } from '../formatters/markdown.js';

interface ActionInputs {
  'manifest-path': string;
  format: string;
  'fail-on': string;
  ecosystem: string;
}

function getInput(name: string): string {
  const val = process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`];
  return val || '';
}

async function run(): Promise<void> {
  const inputs: ActionInputs = {
    'manifest-path': getInput('manifest-path') || '.',
    format: getInput('format') || 'markdown',
    'fail-on': getInput('fail-on') || 'low',
    ecosystem: getInput('ecosystem') || '',
  };

  const manifestPath = inputs['manifest-path'];
  const format = inputs.format as 'table' | 'json' | 'markdown';
  const failOn = inputs['fail-on'];
  const filterEco = inputs.ecosystem ? (inputs.ecosystem as Ecosystem) : undefined;

  const orchestrator = new ScannerOrchestrator();
  const healthCalc = new HealthScoreCalculator();
  const recommender = new RecommendationEngine();

  let results;

  if (existsSync(join(process.cwd(), manifestPath)) && !manifestPath.endsWith('.json') && !manifestPath.endsWith('.txt') && !manifestPath.endsWith('.toml')) {
    results = await orchestrator.scanDirectory(join(process.cwd(), manifestPath), filterEco);
  } else {
    results = await orchestrator.scanManifest(join(process.cwd(), manifestPath), filterEco);
  }

  if (results.length === 0) {
    console.log('No dependencies found.');
    process.exit(0);
    return;
  }

  const healthScores = new Map<string, ReturnType<HealthScoreCalculator['calculate']>>();
  const recommendations = new Map<string, Awaited<ReturnType<RecommendationEngine['recommend']>>>();

  for (const pkg of results) {
    const key = `${pkg.dependency.ecosystem}:${pkg.dependency.name}`;
    const health = healthCalc.calculate(pkg);
    const rec = await recommender.recommend(pkg, health);
    healthScores.set(key, health);
    recommendations.set(key, rec);
  }

  const report = buildReport(results, healthScores, recommendations);

  let output: string;
  switch (format) {
    case 'json':
      output = JsonFormatter.format(report);
      break;
    case 'markdown':
      output = MarkdownFormatter.format(report);
      break;
    default:
      output = TableFormatter.format(report);
  }

  console.log(output);

  const healthValues = [...healthScores.values()];
  if (healthValues.length > 0) {
    const worstHealth = healthValues.reduce((worst, h) => (h.overall < worst.overall ? h : worst));
    const thresholds: Record<string, number> = { low: 30, medium: 50, high: 70 };
    const threshold = thresholds[failOn] || 30;
    if (worstHealth.overall < threshold) {
      process.exit(1);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error('depcheckai action failed:', err);
  process.exit(1);
});
