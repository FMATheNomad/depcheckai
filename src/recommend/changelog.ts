import { globalCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

const BREAKING_KEYWORDS = [
  'breaking change',
  'breaking changes',
  'breaking:',
  'BREAKING CHANGE',
  'BREAKING CHANGES',
  'major change',
  'backwards incompatible',
  'api change',
  'removed',
  'deprecated',
  'migration required',
];

export class ChangelogParser {
  async getBreakingChanges(
    name: string,
    fromVersion: string,
    toVersion: string,
    repoUrl?: string
  ): Promise<string[]> {
    const changes: string[] = [];

    if (repoUrl) {
      const changelog = await this.fetchChangelog(repoUrl);
      if (changelog) {
        const breaking = this.parseBreakingChanges(changelog, fromVersion, toVersion);
        changes.push(...breaking);
      }
    }

    return changes;
  }

  private async fetchChangelog(repoUrl: string): Promise<string | null> {
    const cacheKey = `changelog:${repoUrl}`;
    return globalCache.getOrFetch(cacheKey, 3600000, async () => {
      const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (!match) return null;

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');

      const files = ['CHANGELOG.md', 'changelog.md', 'CHANGELOG', 'changelog', 'ReleaseNotes.md', 'HISTORY.md'];
      for (const file of files) {
        try {
          const response = await fetch(
            `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/${file}`,
            { headers: { 'User-Agent': 'depcheck-ai/0.1.0' } }
          );
          if (response.ok) {
            const text = await response.text();
            if (text.length > 0) return text;
          }

          const responseMaster = await fetch(
            `https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/${file}`,
            { headers: { 'User-Agent': 'depcheck-ai/0.1.0' } }
          );
          if (responseMaster.ok) {
            const text = await responseMaster.text();
            if (text.length > 0) return text;
          }
        } catch {
          continue;
        }
      }
      return null;
    });
  }

  private parseBreakingChanges(changelog: string, _fromVersion: string, _toVersion: string): string[] {
    const changes: string[] = [];
    const lines = changelog.split('\n');

    let inRelevantSection = true;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();

      if (trimmed.startsWith('#') && trimmed.includes('version') && !trimmed.includes(_toVersion)) {
        continue;
      }

      if (trimmed.startsWith('##') && trimmed.includes(_toVersion)) {
        inRelevantSection = true;
        continue;
      }
      if (trimmed.startsWith('##') && !trimmed.includes(_fromVersion) && inRelevantSection && !trimmed.includes(_toVersion)) {
        inRelevantSection = false;
      }

      if (inRelevantSection) {
        for (const keyword of BREAKING_KEYWORDS) {
          if (trimmed.includes(keyword.toLowerCase())) {
            changes.push(line.trim());
            break;
          }
        }
      }
    }

    return changes.slice(0, 5);
  }

  hasSignificantChanges(changelog: string | null | undefined): boolean {
    if (!changelog) return false;
    return BREAKING_KEYWORDS.some(kw => changelog.toLowerCase().includes(kw.toLowerCase()));
  }
}
