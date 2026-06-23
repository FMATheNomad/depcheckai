import { globalCache } from '../utils/cache.js';
import { rateLimiter } from '../utils/rate-limit.js';
import { logger } from '../utils/logger.js';

export interface PyPiPackageInfo {
  name: string;
  version: string;
  latestVersion: string;
  description: string;
  author: string;
  authorEmail: string;
  license: string;
  requiresDist: string[];
  homePage: string;
  projectUrls: Record<string, string>;
  releases: Record<string, unknown[]>;
  lastSerial: number;
  classifiers: string[];
}

export interface PyPiDownloadInfo {
  totalDownloads: number;
  lastMonth: number;
  lastWeek: number;
  lastDay: number;
}

const PYPI_API = 'https://pypi.org/pypi';

async function pypiFetch(url: string): Promise<Response> {
  await rateLimiter.waitIfNeeded('pypi');
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'depcheckai/0.1.0' },
  });
  return response;
}

export class PyPiScanner {
  async getPackageInfo(name: string): Promise<PyPiPackageInfo | null> {
    const cacheKey = `pypi:info:${name}`;
    return globalCache.getOrFetch(cacheKey, 3600000, async () => {
      try {
        const url = `${PYPI_API}/${encodeURIComponent(name)}/json`;
        const response = await pypiFetch(url);
        if (response.status === 404) {
          logger.warn(`Package not found on PyPI: ${name}`);
          return null;
        }
        if (!response.ok) {
          logger.warn(`PyPI error for ${name}: ${response.status}`);
          return null;
        }
        const data = await response.json() as Record<string, unknown>;
        const info = data.info as Record<string, unknown> || {};

        return {
          name: info.name as string || name,
          version: info.version as string || '',
          latestVersion: info.version as string || '',
          description: info.summary as string || '',
          author: info.author as string || '',
          authorEmail: info.author_email as string || '',
          license: info.license as string || '',
          requiresDist: (info.requires_dist as string[]) || [],
          homePage: info.home_page as string || '',
          projectUrls: (info.project_urls as Record<string, string>) || {},
          releases: (data.releases as Record<string, unknown[]>) || {},
          lastSerial: data.last_serial as number || 0,
          classifiers: (info.classifiers as string[]) || [],
        };
      } catch (err) {
        logger.warn(`Failed to fetch PyPI info for ${name}:`, err);
        return null;
      }
    });
  }

  async getDownloadStats(name: string): Promise<PyPiDownloadInfo | null> {
    const cacheKey = `pypi:downloads:${name}`;
    return globalCache.getOrFetch(cacheKey, 3600000, async () => {
      try {
        const response = await fetch(
          `https://pypistats.org/api/packages/${encodeURIComponent(name)}/recent`,
          { headers: { 'User-Agent': 'depcheckai/0.1.0' } }
        );
        if (!response.ok) return null;
        const data = await response.json() as Record<string, unknown>;
        const lastMonth = (data.data as Record<string, unknown>)?.last_month as number || 0;
        return {
          totalDownloads: lastMonth,
          lastMonth,
          lastWeek: (data.data as Record<string, unknown>)?.last_week as number || 0,
          lastDay: (data.data as Record<string, unknown>)?.last_day as number || 0,
        };
      } catch {
        return null;
      }
    });
  }
}
