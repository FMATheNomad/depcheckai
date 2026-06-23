import { globalCache } from '../utils/cache.js';
import { rateLimiter } from '../utils/rate-limit.js';
import { logger } from '../utils/logger.js';

export interface CratesPackageInfo {
  name: string;
  version: string;
  latestVersion: string;
  description: string;
  downloads: number;
  recentDownloads: number;
  updatedAt: string;
  createdAt: string;
  homepage: string;
  repository: string;
  documentation: string;
  keywords: string[];
  versions: CratesVersion[];
  maxStableVersion?: string;
}

interface CratesVersion {
  num: string;
  created_at: string;
  updated_at: string;
  yanked: boolean;
}

const CRATES_API = 'https://crates.io/api/v1/crates';

async function cratesFetch(url: string): Promise<Response> {
  await rateLimiter.waitIfNeeded('crates');
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'depcheckai/0.1.0',
    },
  });
  return response;
}

export class CratesScanner {
  async getPackageInfo(name: string): Promise<CratesPackageInfo | null> {
    const cacheKey = `crates:info:${name}`;
    return globalCache.getOrFetch(cacheKey, 3600000, async () => {
      try {
        const url = `${CRATES_API}/${encodeURIComponent(name)}`;
        const response = await cratesFetch(url);
        if (response.status === 404) {
          logger.warn(`Package not found on crates.io: ${name}`);
          return null;
        }
        if (!response.ok) {
          logger.warn(`crates.io error for ${name}: ${response.status}`);
          return null;
        }
        const data = await response.json() as Record<string, unknown>;
        const crate = data.crate as Record<string, unknown> || {};
        const versions = data.versions as CratesVersion[] || [];

        const stableVersions = versions.filter(v => !v.yanked && !v.num.includes('-'));
        const maxStable = stableVersions.length > 0
          ? stableVersions.reduce((a, b) => {
            const cmp = a.num.localeCompare(b.num, undefined, { numeric: true });
            return cmp > 0 ? a : b;
          }).num
          : undefined;

        return {
          name: crate.name as string || name,
          version: maxStable || versions[0]?.num || '',
          latestVersion: maxStable || versions[0]?.num || '',
          description: crate.description as string || '',
          downloads: (crate.downloads as number) || 0,
          recentDownloads: (crate.recent_downloads as number) || 0,
          updatedAt: crate.updated_at as string || '',
          createdAt: crate.created_at as string || '',
          homepage: crate.homepage as string || '',
          repository: crate.repository as string || '',
          documentation: crate.documentation as string || '',
          keywords: (crate.keywords as string[]) || [],
          versions: versions.filter(v => !v.yanked),
          maxStableVersion: maxStable,
        };
      } catch (err) {
        logger.warn(`Failed to fetch crates.io info for ${name}:`, err);
        return null;
      }
    });
  }
}
