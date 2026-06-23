import { ScannedPackage } from '../scanners/index.js';
import { Ecosystem } from '../scanners/manifest.js';
import { HealthScore, HealthScoreCalculator } from '../scoring/index.js';
import { AlternativeSuggester } from './suggest.js';
import type { Suggestion } from './suggest.js';
import { ChangelogParser } from './changelog.js';

export interface Recommendation {
  action: 'ok' | 'update' | 'update-major' | 'replace' | 'review';
  reason: string;
  suggested?: string;
  alternatives?: Suggestion[];
  breakingChanges?: string[];
}

export { AlternativeSuggester };
export { ChangelogParser };

export class RecommendationEngine {
  private healthCalculator = new HealthScoreCalculator();
  private alternativeSuggester = new AlternativeSuggester();
  private changelogParser = new ChangelogParser();

  async recommend(pkg: ScannedPackage, health?: HealthScore): Promise<Recommendation> {
    const healthScore = health || this.healthCalculator.calculate(pkg);
    const dep = pkg.dependency;

    const npmInfo = pkg.registryInfo as unknown as Record<string, unknown> | null;

    if (npmInfo?.deprecated === true) {
      return this.buildReplaceRecommendation(pkg, healthScore, 'Package is deprecated');
    }

    if (healthScore.overall < 30) {
      return this.buildReplaceRecommendation(pkg, healthScore, 'Critical health score');
    }

    if (healthScore.maintenance < 35) {
      return this.buildReplaceRecommendation(pkg, healthScore, 'Package is no longer actively maintained');
    }

    if (healthScore.security < 40) {
      return this.buildReplaceRecommendation(pkg, healthScore, 'Security concerns detected');
    }

    if (this.hasBreakingChangeAhead(pkg, healthScore)) {
      const breakingChanges = await this.changelogParser.getBreakingChanges(
        dep.name,
        dep.version,
        pkg.registryInfo?.latestVersion || 'latest',
        this.extractRepoUrl(pkg)
      );

      if (breakingChanges.length > 0) {
        return {
          action: 'update-major',
          reason: `Breaking changes ahead between ${dep.version} and ${pkg.registryInfo?.latestVersion}`,
          breakingChanges,
        };
      }

      return {
        action: 'update-major',
        reason: `Major version behind: ${dep.version} → ${pkg.registryInfo?.latestVersion}`,
      };
    }

    if (this.isBehindMinor(pkg)) {
      return {
        action: 'update',
        reason: `Update available: ${dep.version} → ${pkg.registryInfo?.latestVersion}`,
      };
    }

    if (healthScore.compatibility < 50) {
      return {
        action: 'review',
        reason: 'Compatibility concerns — check peer dependencies and module format',
      };
    }

    return {
      action: 'ok',
      reason: 'Healthy — no action needed',
    };
  }

  private async buildReplaceRecommendation(
    pkg: ScannedPackage,
    healthScore: HealthScore,
    baseReason: string
  ): Promise<Recommendation> {
    const alternatives = await this.alternativeSuggester.suggestAlternatives(
      pkg.dependency.name,
      pkg.dependency.ecosystem
    );

    let reason = baseReason;
    if (alternatives.length > 0) {
      reason += `. Consider replacing with ${alternatives[0].name} — ${alternatives[0].reason}`;
    }

    return {
      action: 'replace',
      reason,
      suggested: alternatives[0]?.name,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  }

  private hasBreakingChangeAhead(pkg: ScannedPackage, health: HealthScore): boolean {
    const dep = pkg.dependency;
    const registry = pkg.registryInfo;
    if (!registry?.latestVersion) return false;

    try {
      const currentMajor = parseInt(dep.version.split('.')[0], 10);
      const latestMajor = parseInt(registry.latestVersion.split('.')[0], 10);
      return latestMajor > currentMajor && health.compatibility < 60;
    } catch {
      return false;
    }
  }

  private isBehindMinor(pkg: ScannedPackage): boolean {
    const dep = pkg.dependency;
    const registry = pkg.registryInfo;
    if (!registry?.latestVersion) return false;

    try {
      const currentMajor = parseInt(dep.version.split('.')[0], 10);
      const latestMajor = parseInt(registry.latestVersion.split('.')[0], 10);
      if (latestMajor > currentMajor) return false;

      const currentMinor = parseInt(dep.version.split('.')[1] || '0', 10);
      const latestMinor = parseInt(registry.latestVersion.split('.')[1] || '0', 10);
      const currentPatch = parseInt(dep.version.split('.')[2] || '0', 10);
      const latestPatch = parseInt(registry.latestVersion.split('.')[2] || '0', 10);

      if (latestMinor > currentMinor) return true;
      if (latestMinor === currentMinor && latestPatch > currentPatch) return true;
      return false;
    } catch {
      return false;
    }
  }

  private extractRepoUrl(pkg: ScannedPackage): string | undefined {
    const info = pkg.registryInfo as unknown as Record<string, unknown> | null;
    if (!info) return undefined;

    const repo = info.repository;
    if (repo && typeof repo === 'object' && 'url' in repo) {
      const repoObj = repo as Record<string, string>;
      return repoObj.url;
    }

    if (typeof repo === 'string') {
      return repo;
    }

    return undefined;
  }
}
