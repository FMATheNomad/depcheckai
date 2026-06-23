import { ScannedPackage } from '../scanners/index.js';
import { calculateMaintenanceScore } from './maintenance.js';
import { calculatePopularityScore } from './popularity.js';
import { calculateCompatibilityScore } from './compatibility.js';
import { calculateSecurityScore } from './security.js';

export interface HealthScore {
  overall: number;
  maintenance: number;
  popularity: number;
  compatibility: number;
  security: number;
  level: 'good' | 'okay' | 'risky' | 'critical';
  details: {
    maintenance: Record<string, number>;
    popularity: Record<string, number>;
    compatibility: Record<string, number>;
    security: Record<string, number>;
  };
  explanations: string[];
}

export { calculateMaintenanceScore } from './maintenance.js';
export { calculatePopularityScore } from './popularity.js';
export { calculateCompatibilityScore } from './compatibility.js';
export { calculateSecurityScore } from './security.js';

export class HealthScoreCalculator {
  calculate(pkg: ScannedPackage): HealthScore {
    const maintenance = calculateMaintenanceScore(pkg);
    const popularity = calculatePopularityScore(pkg);
    const compatibility = calculateCompatibilityScore(pkg);
    const security = calculateSecurityScore(pkg);

    const maintenanceWeight = 0.35;
    const popularityWeight = 0.25;
    const compatibilityWeight = 0.20;
    const securityWeight = 0.20;

    const overall = Math.round(
      maintenance.score * maintenanceWeight +
      popularity.score * popularityWeight +
      compatibility.score * compatibilityWeight +
      security.score * securityWeight
    );

    const explanations = this.generateExplanations(pkg, { maintenance, popularity, compatibility, security });

    let level: HealthScore['level'];
    if (overall >= 80) level = 'good';
    else if (overall >= 50) level = 'okay';
    else if (overall >= 30) level = 'risky';
    else level = 'critical';

    return {
      overall,
      maintenance: maintenance.score,
      popularity: popularity.score,
      compatibility: compatibility.score,
      security: security.score,
      level,
      details: {
        maintenance: maintenance.details,
        popularity: popularity.details,
        compatibility: compatibility.details,
        security: security.details,
      },
      explanations,
    };
  }

  private generateExplanations(
    pkg: ScannedPackage,
    scores: {
      maintenance: { score: number; details: Record<string, number> };
      popularity: { score: number; details: Record<string, number> };
      compatibility: { score: number; details: Record<string, number> };
      security: { score: number; details: Record<string, number> };
    }
  ): string[] {
    const explanations: string[] = [];

    if (scores.maintenance.score < 40) {
      const worstFactor = Object.entries(scores.maintenance.details)
        .sort(([, a], [, b]) => a - b)[0];
      if (worstFactor) {
        const factorNames: Record<string, string> = {
          lastCommit: 'last commit',
          releaseFrequency: 'release frequency',
          versionRecency: 'version recency',
          changelogPresence: 'changelog',
        };
        explanations.push(
          `Low maintenance (${scores.maintenance.score}/100) — poor ${factorNames[worstFactor[0]] || worstFactor[0]}`
        );
      }
    }

    if (scores.security.score < 50) {
      const worstFactor = Object.entries(scores.security.details)
        .sort(([, a], [, b]) => a - b)[0];
      if (worstFactor) {
        explanations.push(`Security concern (${scores.security.score}/100) — ${worstFactor[0]} issue detected`);
      }
    }

    if (scores.popularity.score < 40) {
      explanations.push(`Low popularity (${scores.popularity.score}/100) — small community adoption`);
    }

    if (scores.compatibility.score < 50) {
      explanations.push(`Compatibility risk (${scores.compatibility.score}/100) — potential breaking changes ahead`);
    }

    const npmInfo = pkg.registryInfo as unknown as Record<string, unknown> | null;
    if (npmInfo?.deprecated === true) {
      const msg = (npmInfo.deprecatedMessage as string) || 'No reason given';
      explanations.push(`DEPRECATED: ${msg}`);
    }

    return explanations;
  }
}
