import { globalCache } from '../utils/cache.js';
import { rateLimiter } from '../utils/rate-limit.js';
import { logger } from '../utils/logger.js';

export interface NpmPackageInfo {
  name: string;
  version: string;
  description: string;
  latestVersion: string;
  allVersions: string[];
  timeCreated: string;
  keywords: string[];
  deprecated: boolean;
  deprecatedMessage?: string;
  repository?: { url: string; type?: string };
  license?: string;
  maintainers?: { name: string; email: string }[];
  lastVersionDate?: string;
}

export interface NpmDownloadInfo {
  downloads: number;
  start: string;
  end: string;
}

const NPM_REGISTRY = 'https://registry.npmjs.org';
const NPM_DOWNLOADS = 'https://api.npmjs.org/downloads';

async function npmFetch(url: string): Promise<Response> {
  await rateLimiter.waitIfNeeded('npm');
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'depcheckai/0.1.0' },
  });
  if (response.status === 429) {
    const reset = parseInt(response.headers.get('x-reset') || '60', 10);
    rateLimiter.updateFromHeaders('npm', 0, Math.floor(Date.now() / 1000) + reset);
    throw new Error('npm registry rate limited');
  }
  return response;
}

export class NpmScanner {
  async getPackageInfo(name: string): Promise<NpmPackageInfo | null> {
    const cacheKey = `npm:info:${name}`;
    return globalCache.getOrFetch(cacheKey, 3600000, async () => {
      try {
        const url = `${NPM_REGISTRY}/${encodeURIComponent(name).toLowerCase()}`;
        const response = await npmFetch(url);
        if (response.status === 404) {
          logger.warn(`Package not found on npm: ${name}`);
          return null;
        }
        if (!response.ok) {
          logger.warn(`npm registry error for ${name}: ${response.status}`);
          return null;
        }
        const data = await response.json() as Record<string, unknown>;

        const distTags = data['dist-tags'] as Record<string, string> || {};
        const versions = data.versions as Record<string, unknown> || {};
        const time = data.time as Record<string, string> || {};

        const latestVersion = distTags.latest || '';
        const currentVersionData = latestVersion ? (versions[latestVersion] as Record<string, unknown> || {}) : {};

        const allVersions = Object.keys(versions);
        const deprecated = (currentVersionData.deprecated as string) ? true : false;
        const deprecatedMessage = currentVersionData.deprecated as string || undefined;

        return {
          name,
          version: latestVersion,
          description: (data.description as string) || '',
          latestVersion,
          allVersions,
          timeCreated: time.created || '',
          keywords: (data.keywords as string[]) || [],
          deprecated,
          deprecatedMessage,
          repository: data.repository as { url: string; type?: string } || undefined,
          license: currentVersionData.license as string || (data.license as string) || undefined,
          maintainers: data.maintainers as { name: string; email: string }[] || [],
          lastVersionDate: time[latestVersion] || undefined,
        };
      } catch (err) {
        logger.warn(`Failed to fetch npm info for ${name}:`, err);
        return null;
      }
    });
  }

  async getDownloads(name: string): Promise<NpmDownloadInfo | null> {
    const cacheKey = `npm:downloads:${name}`;
    return globalCache.getOrFetch(cacheKey, 3600000, async () => {
      try {
        const url = `${NPM_DOWNLOADS}/point/last-month/${encodeURIComponent(name).toLowerCase()}`;
        const response = await npmFetch(url);
        if (!response.ok) return null;
        const data = await response.json() as NpmDownloadInfo;
        return data;
      } catch {
        return null;
      }
    });
  }

  async getGitHubMetadata(repoUrl: string): Promise<{ stars: number; lastCommit: string | null; openIssues: number; contributors: number } | null> {
    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) return null;
    const [, owner, repo] = match;
    const cacheKey = `github:${owner}/${repo}`;

    return globalCache.getOrFetch(cacheKey, 3600000, async () => {
      await rateLimiter.waitIfNeeded('github');
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'depcheckai/0.1.0',
          },
        });

        if (response.status === 403 || response.status === 429) {
          const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10);
          const reset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);
          rateLimiter.updateFromHeaders('github', remaining, reset);
          if (remaining === 0) {
            logger.warn('GitHub API rate limited. Using cached or partial data.');
          }
          return null;
        }

        if (!response.ok) return null;

        const data = await response.json() as Record<string, unknown>;

        return {
          stars: (data.stargazers_count as number) || 0,
          lastCommit: (data.updated_at as string) || null,
          openIssues: (data.open_issues_count as number) || 0,
          contributors: 0,
        };
      } catch {
        return null;
      }
    });
  }
}
