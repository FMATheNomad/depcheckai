import { ScannedPackage } from '../scanners/index.js';
import { Ecosystem } from '../scanners/manifest.js';

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function scoreLastCommit(days: number | null): number {
  if (days === null) return 30;
  if (days <= 60) return 100;
  if (days <= 180) return 80;
  if (days <= 365) return 50;
  if (days <= 730) return 20;
  return 0;
}

function scoreReleaseFrequency(info: ScannedPackage['registryInfo'], ecosystem: Ecosystem): number {
  if (!info) return 30;

  if (ecosystem === 'npm' && 'allVersions' in info) {
    const npmInfo = info as unknown as Record<string, unknown>;
    const versions = npmInfo.allVersions as string[] | undefined;
    if (!versions || versions.length === 0) return 30;

    const time = npmInfo.timeCreated as string | undefined;
    const lastVersionDate = npmInfo.lastVersionDate as string | undefined;
    const created = time ? new Date(time) : null;
    const lastRelease = lastVersionDate ? new Date(lastVersionDate) : null;

    if (!created || !lastRelease) return 50;
    const lifetime = (lastRelease.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (lifetime <= 0) return 50;
    const releasesPerYear = (versions.length / lifetime) * 365;
    if (releasesPerYear >= 12) return 100;
    if (releasesPerYear >= 6) return 80;
    if (releasesPerYear >= 2) return 60;
    if (releasesPerYear >= 1) return 40;
    return 20;
  }

  if (ecosystem === 'crates' && 'versions' in info) {
    const cratesInfo = info as unknown as Record<string, unknown>;
    const versions = cratesInfo.versions as { num: string; created_at: string }[] | undefined;
    if (!versions || versions.length === 0) return 30;

    const created = versions[0]?.created_at ? new Date(versions[0].created_at) : null;
    const lastRelease = versions[versions.length - 1]?.created_at ? new Date(versions[versions.length - 1].created_at) : null;
    if (!created || !lastRelease) return 50;
    const lifetime = (lastRelease.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (lifetime <= 0) return 50;
    const releasesPerYear = (versions.length / lifetime) * 365;
    if (releasesPerYear >= 12) return 100;
    if (releasesPerYear >= 6) return 80;
    if (releasesPerYear >= 2) return 60;
    if (releasesPerYear >= 1) return 40;
    return 20;
  }

  return 50;
}

function scoreVersionRecency(info: ScannedPackage['registryInfo'], currentVersion: string): number {
  if (!info) return 30;
  const latestVersion = info.latestVersion;
  if (!latestVersion) return 50;
  if (latestVersion === currentVersion) return 100;

  const parseParts = (v: string): number[] => v.replace(/^[\^~]/, '').split('.').map(Number);
  const currentParts = parseParts(currentVersion);
  const latestParts = parseParts(latestVersion);

  const currentMajor = currentParts[0] || 0;
  const latestMajor = latestParts[0] || 0;
  const majorDiff = latestMajor - currentMajor;

  if (majorDiff <= 0) return 100;
  if (majorDiff === 1) return 60;
  if (majorDiff === 2) return 30;
  return 0;
}

function scoreChangelogPresence(info: ScannedPackage['registryInfo'], ecosystem: Ecosystem): number {
  if (!info) return 30;

  if (ecosystem === 'npm' && 'repository' in info) {
    const npmInfo = info as unknown as Record<string, unknown>;
    const repo = npmInfo.repository as { url?: string } | undefined;
    if (repo?.url && (repo.url.includes('github.com') || repo.url.includes('gitlab.com'))) return 80;
    return 40;
  }

  if (ecosystem === 'crates' && 'repository' in info) {
    const cratesInfo = info as unknown as Record<string, unknown>;
    const repo = cratesInfo.repository as string | undefined;
    if (repo && repo.includes('github.com')) return 80;
    return 40;
  }

  return 50;
}

export function calculateMaintenanceScore(pkg: ScannedPackage): { score: number; details: Record<string, number> } {
  const info = pkg.registryInfo;
  const ecosystem = pkg.dependency.ecosystem;

  let lastCommitDays: number | null = null;
  if (pkg.githubData?.lastCommit) {
    lastCommitDays = daysSince(pkg.githubData.lastCommit);
  } else if (info) {
    if ('updatedAt' in info) {
      lastCommitDays = daysSince((info as unknown as Record<string, string>).updatedAt);
    }
  }

  const lastCommitScore = scoreLastCommit(lastCommitDays);
  const releaseFrequency = scoreReleaseFrequency(info, ecosystem);
  const versionRecency = scoreVersionRecency(info, pkg.dependency.version);
  const changelogPresence = scoreChangelogPresence(info, ecosystem);

  const weighted =
    lastCommitScore * 0.30 +
    releaseFrequency * 0.25 +
    versionRecency * 0.25 +
    changelogPresence * 0.20;

  return {
    score: Math.round(weighted),
    details: {
      lastCommit: lastCommitScore,
      releaseFrequency,
      versionRecency,
      changelogPresence,
    },
  };
}
