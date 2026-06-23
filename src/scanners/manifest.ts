import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

export type Ecosystem = 'npm' | 'pypi' | 'crates';

export interface Dependency {
  name: string;
  version: string;
  ecosystem: Ecosystem;
}

export interface Manifest {
  path: string;
  ecosystem: Ecosystem;
  dependencies: Dependency[];
}

const MANIFEST_FILES: Record<string, Ecosystem> = {
  'package.json': 'npm',
  'requirements.txt': 'pypi',
  'requirements-dev.txt': 'pypi',
  'Cargo.toml': 'crates',
  'composer.json': 'npm',
};

export class ManifestParser {
  detect(rootPath: string): Manifest[] {
    const manifests: Manifest[] = [];
    for (const [filename, ecosystem] of Object.entries(MANIFEST_FILES)) {
      const fullPath = join(rootPath, filename);
      if (existsSync(fullPath)) {
        try {
          const deps = this.parse(fullPath, ecosystem);
          if (deps.length > 0) {
            manifests.push({ path: fullPath, ecosystem, dependencies: deps });
          }
        } catch (err) {
          logger.warn(`Failed to parse ${fullPath}:`, err);
        }
      }
    }
    return manifests;
  }

  parse(manifestPath: string, eco?: Ecosystem): Dependency[] {
    const content = readFileSync(manifestPath, 'utf-8');
    const detectedEco = eco || this.detectEcosystem(manifestPath);
    if (!detectedEco) {
      logger.warn(`Unknown ecosystem for ${manifestPath}`);
      return [];
    }

    switch (detectedEco) {
      case 'npm': return this.parsePackageJson(content);
      case 'pypi': return this.parseRequirementsTxt(content);
      case 'crates': return this.parseCargoToml(content);
      default: return [];
    }
  }

  private detectEcosystem(filePath: string): Ecosystem | null {
    const filename = filePath.split('/').pop()?.split('\\').pop() || '';
    return MANIFEST_FILES[filename] || null;
  }

  private parsePackageJson(content: string): Dependency[] {
    const deps: Dependency[] = [];
    try {
      const json = JSON.parse(content);
      const allDeps = { ...json.dependencies, ...json.devDependencies };
      for (const [name, ver] of Object.entries(allDeps)) {
        if (typeof ver === 'string') {
          deps.push({ name, version: ver.replace(/^[\^~]/, ''), ecosystem: 'npm' });
        }
      }
    } catch {
      logger.warn('Invalid package.json');
    }
    return deps;
  }

  private parseRequirementsTxt(content: string): Dependency[] {
    const deps: Dependency[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
      const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*(==|>=|<=|~=|!=|>|<)?\s*([0-9a-zA-Z.*-]+)?/);
      if (match) {
        deps.push({
          name: match[1].toLowerCase(),
          version: match[3] || 'latest',
          ecosystem: 'pypi',
        });
      }
    }
    return deps;
  }

  private parseCargoToml(content: string): Dependency[] {
    const deps: Dependency[] = [];
    const lines = content.split('\n');
    let inDependencies = false;
    let inDevDependencies = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('[dependencies]')) {
        inDependencies = true;
        inDevDependencies = false;
        continue;
      }
      if (trimmed.startsWith('[dev-dependencies]')) {
        inDevDependencies = true;
        inDependencies = false;
        continue;
      }
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        inDependencies = false;
        inDevDependencies = false;
        continue;
      }

      if (inDependencies || inDevDependencies) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
        if (match) {
          deps.push({
            name: match[1],
            version: match[2],
            ecosystem: 'crates',
          });
        }
        const tableMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*\{/);
        if (tableMatch) {
          const verMatch = trimmed.match(/version\s*=\s*"([^"]+)"/);
          deps.push({
            name: tableMatch[1],
            version: verMatch ? verMatch[1] : 'latest',
            ecosystem: 'crates',
          });
        }
      }
    }
    return deps;
  }
}
