import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

export interface DepcheckConfig {
  ecosystems: string[];
  failOn: 'low' | 'medium' | 'high';
  format: 'table' | 'json' | 'markdown';
  cacheTtlMinutes: number;
  githubToken?: string;
  exclude: string[];
}

const DEFAULT_CONFIG: DepcheckConfig = {
  ecosystems: ['npm', 'pypi', 'crates'],
  failOn: 'low',
  format: 'table',
  cacheTtlMinutes: 60,
  exclude: [],
};

function resolveConfigPath(rootPath: string): string {
  const candidates = [
    join(rootPath, '.depcheckai.json'),
    join(rootPath, '.depcheckai.jsonc'),
    join(rootPath, 'depcheckai.json'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return '';
}

export function loadConfig(rootPath: string): DepcheckConfig {
  const configPath = resolveConfigPath(rootPath);
  if (!configPath) return { ...DEFAULT_CONFIG };

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DepcheckConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    logger.warn(`Failed to parse config at ${configPath}:`, err);
    return { ...DEFAULT_CONFIG };
  }
}

export function generateConfig(): DepcheckConfig {
  return { ...DEFAULT_CONFIG };
}

export function configToJson(config: DepcheckConfig): string {
  return JSON.stringify(config, null, 2);
}
