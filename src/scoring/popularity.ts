import { ScannedPackage } from '../scanners/index.js';
import { Ecosystem } from '../scanners/manifest.js';

function scoreDownloads(downloads: number | null, ecosystem: Ecosystem): number {
  if (downloads === null) return 30;

  if (ecosystem === 'npm') {
    if (downloads >= 10_000_000) return 100;
    if (downloads >= 1_000_000) return 90;
    if (downloads >= 100_000) return 75;
    if (downloads >= 10_000) return 60;
    if (downloads >= 1_000) return 40;
    return 20;
  }

  if (ecosystem === 'pypi') {
    if (downloads >= 10_000_000) return 100;
    if (downloads >= 1_000_000) return 90;
    if (downloads >= 100_000) return 75;
    if (downloads >= 10_000) return 60;
    if (downloads >= 1_000) return 40;
    return 20;
  }

  if (ecosystem === 'crates') {
    if (downloads >= 10_000_000) return 100;
    if (downloads >= 1_000_000) return 90;
    if (downloads >= 100_000) return 75;
    if (downloads >= 10_000) return 60;
    if (downloads >= 1_000) return 40;
    return 20;
  }

  return 30;
}

function scoreStars(stars: number | undefined | null): number {
  if (stars === null || stars === undefined) return 30;
  if (stars >= 10_000) return 100;
  if (stars >= 5_000) return 90;
  if (stars >= 1_000) return 80;
  if (stars >= 500) return 70;
  if (stars >= 100) return 55;
  if (stars >= 10) return 40;
  return 25;
}

function scoreDependents(info: ScannedPackage['registryInfo']): number {
  if (!info) return 30;

  if ('requiresDist' in info) {
    const pypiInfo = info as unknown as Record<string, unknown>;
    const rd = pypiInfo.requiresDist as string[] | undefined;
    const count = rd?.length || 0;
    if (count >= 1000) return 100;
    if (count >= 100) return 80;
    if (count >= 10) return 60;
    if (count >= 1) return 40;
    return 20;
  }

  if ('keywords' in info) {
    const npmInfo = info as unknown as Record<string, unknown>;
    const keywords = npmInfo.keywords as string[] | undefined;
    const count = keywords?.length || 0;
    if (count >= 20) return 80;
    if (count >= 10) return 60;
    if (count >= 5) return 40;
    return 20;
  }

  return 30;
}

function scoreContributors(contributors: number | undefined | null): number {
  if (contributors === null || contributors === undefined) return 30;
  if (contributors >= 100) return 100;
  if (contributors >= 50) return 85;
  if (contributors >= 20) return 70;
  if (contributors >= 10) return 55;
  if (contributors >= 5) return 40;
  if (contributors >= 1) return 30;
  return 20;
}

export function calculatePopularityScore(pkg: ScannedPackage): { score: number; details: Record<string, number> } {
  const downloads = scoreDownloads(pkg.downloads, pkg.dependency.ecosystem);
  const stars = scoreStars(pkg.githubData?.stars);
  const dependents = scoreDependents(pkg.registryInfo);
  const contributors = scoreContributors(pkg.githubData?.contributors);

  const weighted =
    downloads * 0.35 +
    stars * 0.25 +
    dependents * 0.25 +
    contributors * 0.15;

  return {
    score: Math.round(weighted),
    details: { downloads, stars, dependents, contributors },
  };
}
