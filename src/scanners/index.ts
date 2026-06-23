import { ManifestParser, Dependency, Ecosystem, Manifest } from './manifest.js';
import { NpmScanner, NpmPackageInfo, NpmDownloadInfo } from './npm.js';
import { PyPiScanner, PyPiPackageInfo } from './pypi.js';
import { CratesScanner, CratesPackageInfo } from './crates.js';
import { logger } from '../utils/logger.js';

type RegistryInfo = (NpmPackageInfo | PyPiPackageInfo | CratesPackageInfo) & { ecosystem: Ecosystem };

export interface ScannedPackage {
  dependency: Dependency;
  registryInfo: RegistryInfo | null;
  downloads: number | null;
  githubData: { stars: number; lastCommit: string | null; openIssues: number; contributors: number } | null;
}

export type { Ecosystem, Dependency, Manifest } from './manifest.js';
export { ManifestParser } from './manifest.js';
export { NpmScanner } from './npm.js';
export type { NpmPackageInfo, NpmDownloadInfo } from './npm.js';
export { PyPiScanner } from './pypi.js';
export type { PyPiPackageInfo } from './pypi.js';
export { CratesScanner } from './crates.js';
export type { CratesPackageInfo } from './crates.js';

export class ScannerOrchestrator {
  private manifestParser = new ManifestParser();
  private npmScanner = new NpmScanner();
  private pypiScanner = new PyPiScanner();
  private cratesScanner = new CratesScanner();

  async scanManifest(manifestPath: string, ecosystem?: Ecosystem): Promise<ScannedPackage[]> {
    const manifest = this.manifestParser.parse(manifestPath, ecosystem);
    return this.scanDependencies(manifest, ecosystem);
  }

  async scanDirectory(rootPath: string, filterEco?: Ecosystem): Promise<ScannedPackage[]> {
    const manifests = this.manifestParser.detect(rootPath);
    if (manifests.length === 0) {
      logger.warn('No manifest files found. Supported: package.json, requirements.txt, Cargo.toml');
      return [];
    }

    const allDeps: Dependency[] = [];
    for (const manifest of manifests) {
      if (filterEco && manifest.ecosystem !== filterEco) continue;
      allDeps.push(...manifest.dependencies);
    }

    return this.scanDependencies(allDeps, filterEco);
  }

  async scanDependencies(dependencies: Dependency[], filterEco?: Ecosystem): Promise<ScannedPackage[]> {
    const results: ScannedPackage[] = [];
    const uniqueDeps = this.deduplicate(dependencies);

    for (const dep of uniqueDeps) {
      if (filterEco && dep.ecosystem !== filterEco) continue;
      const scanned = await this.scanSingle(dep);
      results.push(scanned);
    }

    return results;
  }

  async scanSingle(dep: Dependency): Promise<ScannedPackage> {
    logger.debug(`Scanning ${dep.name}@${dep.version} (${dep.ecosystem})`);

    let registryInfo: RegistryInfo | null = null;
    let downloads: number | null = null;
    let githubData: { stars: number; lastCommit: string | null; openIssues: number; contributors: number } | null = null;

    switch (dep.ecosystem) {
      case 'npm': {
        const info = await this.npmScanner.getPackageInfo(dep.name);
        if (info) {
          registryInfo = { ...info, ecosystem: 'npm' as Ecosystem };
          const dl = await this.npmScanner.getDownloads(dep.name);
          downloads = dl?.downloads ?? null;
          if (info.repository?.url) {
            githubData = await this.npmScanner.getGitHubMetadata(info.repository.url);
          }
        }
        break;
      }
      case 'pypi': {
        const info = await this.pypiScanner.getPackageInfo(dep.name);
        if (info) {
          registryInfo = { ...info, ecosystem: 'pypi' as Ecosystem };
          const dl = await this.pypiScanner.getDownloadStats(dep.name);
          downloads = dl?.lastMonth ?? null;
        }
        break;
      }
      case 'crates': {
        const info = await this.cratesScanner.getPackageInfo(dep.name);
        if (info) {
          registryInfo = { ...info, ecosystem: 'crates' as Ecosystem };
          downloads = info.recentDownloads || info.downloads || null;
        }
        break;
      }
    }

    return { dependency: dep, registryInfo, downloads, githubData };
  }

  private deduplicate(deps: Dependency[]): Dependency[] {
    const seen = new Set<string>();
    return deps.filter(dep => {
      const key = `${dep.ecosystem}:${dep.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
