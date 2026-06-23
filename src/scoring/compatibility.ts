import { ScannedPackage } from '../scanners/index.js';
import { Ecosystem } from '../scanners/manifest.js';
import * as semver from 'semver';

function scoreBreakingChanges(info: ScannedPackage['registryInfo'], currentVersion: string): number {
  if (!info) return 30;
  if (!info.latestVersion || !currentVersion) return 50;

  const cleanCurrent = currentVersion.replace(/^[\^~]/, '');
  const cleanLatest = info.latestVersion.replace(/^[\^~]/, '');

  try {
    const currentMajor = semver.major(cleanCurrent);
    const latestMajor = semver.major(cleanLatest);

    if (currentMajor === latestMajor) return 100;
    if (latestMajor - currentMajor === 1) return 50;
    if (latestMajor - currentMajor >= 2) return 20;

    return 100;
  } catch {
    if (cleanCurrent.split('.')[0] === cleanLatest.split('.')[0]) return 100;
    return 50;
  }
}

function scorePeerDependency(info: ScannedPackage['registryInfo'], ecosystem: Ecosystem): number {
  if (!info) return 50;

  if (ecosystem === 'npm' && 'allVersions' in info) {
    const npmInfo = info as unknown as Record<string, unknown>;
    const latestVersion = (npmInfo.latestVersion as string) || '';
    return 80;
  }

  if (ecosystem === 'pypi' && 'requiresDist' in info) {
    const pypiInfo = info as unknown as Record<string, unknown>;
    const rd = pypiInfo.requiresDist as string[] || [];
    if (rd.length === 0) return 100;
    const hasPeerConflict = rd.some((r: string) => r.startsWith('peer') && r.includes('!='));
    return hasPeerConflict ? 50 : 80;
  }

  return 70;
}

function scoreEsmCjsSupport(info: ScannedPackage['registryInfo'], ecosystem: Ecosystem): number {
  if (!info) return 50;

  if (ecosystem === 'npm') {
    const npmInfo = info as unknown as Record<string, unknown>;
    const keywords = npmInfo.keywords as string[] | undefined;
    if (!keywords) return 50;
    if (keywords.includes('esm') || keywords.includes('module')) return 100;
    if (keywords.includes('cjs') || keywords.includes('commonjs')) return 60;
    return 50;
  }

  if (ecosystem === 'crates') {
    if ('edition' in (info as unknown as Record<string, unknown>)) return 80;
    return 70;
  }

  return 70;
}

export function calculateCompatibilityScore(pkg: ScannedPackage): { score: number; details: Record<string, number> } {
  const breakingChanges = scoreBreakingChanges(pkg.registryInfo, pkg.dependency.version);
  const peerDependency = scorePeerDependency(pkg.registryInfo, pkg.dependency.ecosystem);
  const esmCjs = scoreEsmCjsSupport(pkg.registryInfo, pkg.dependency.ecosystem);

  const weighted =
    breakingChanges * 0.40 +
    peerDependency * 0.30 +
    esmCjs * 0.30;

  return {
    score: Math.round(weighted),
    details: { breakingChanges, peerDependency, esmCjs },
  };
}
