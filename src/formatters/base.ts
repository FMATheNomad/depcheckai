import { ScannedPackage } from '../scanners/index.js';
import { HealthScore } from '../scoring/index.js';
import { Recommendation } from '../recommend/index.js';

export interface ReportItem {
  name: string;
  version: string;
  latest: string;
  ecosystem: string;
  health: HealthScore;
  recommendation: Recommendation;
}

export interface Report {
  ecosystem: string;
  total: number;
  summary: {
    good: number;
    okay: number;
    risky: number;
    critical: number;
  };
  dependencies: ReportItem[];
}

export interface Formatter {
  name: string;
  format(report: Report): string;
}

export function buildReport(
  results: ScannedPackage[],
  healthScores: Map<string, HealthScore>,
  recommendations: Map<string, Recommendation>
): Report {
  const items: ReportItem[] = [];
  const summary = { good: 0, okay: 0, risky: 0, critical: 0 };

  for (const pkg of results) {
    const key = `${pkg.dependency.ecosystem}:${pkg.dependency.name}`;
    const health = healthScores.get(key);
    const recommendation = recommendations.get(key);

    if (!health) continue;

    summary[health.level]++;

    items.push({
      name: pkg.dependency.name,
      version: pkg.dependency.version,
      latest: pkg.registryInfo?.latestVersion || pkg.dependency.version,
      ecosystem: pkg.dependency.ecosystem,
      health,
      recommendation: recommendation || { action: 'ok', reason: 'Unknown' },
    });
  }

  return {
    ecosystem: results[0]?.dependency.ecosystem || 'unknown',
    total: items.length,
    summary,
    dependencies: items,
  };
}
