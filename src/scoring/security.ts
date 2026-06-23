import { ScannedPackage } from '../scanners/index.js';

const HIGH_RISK_LICENSES = ['gpl', 'agpl', 'sspl', 'proprietary', 'unknown'];
const LOW_RISK_LICENSES = ['mit', 'apache', 'bsd', 'isc', 'unlicense', 'cc0'];

function scoreKnownCVEs(_pkg: ScannedPackage): number {
  return 80;
}

function scoreDeprecated(info: ScannedPackage['registryInfo']): number {
  if (!info) return 50;

  const record = info as unknown as Record<string, unknown>;
  if (record.deprecated === true) return 0;
  if ('deprecated' in record) return 100;

  return 80;
}

function scoreLicense(info: ScannedPackage['registryInfo']): number {
  if (!info) return 30;
  const record = info as unknown as Record<string, unknown>;
  const license = ((record.license as string) || '').toLowerCase().trim();

  if (!license || license === 'unknown') return 30;
  if (LOW_RISK_LICENSES.some(l => license.includes(l))) return 100;
  if (HIGH_RISK_LICENSES.some(l => license.includes(l))) return 40;

  return 60;
}

export function calculateSecurityScore(pkg: ScannedPackage): { score: number; details: Record<string, number> } {
  const knownCVEs = scoreKnownCVEs(pkg);
  const deprecated = scoreDeprecated(pkg.registryInfo);
  const license = scoreLicense(pkg.registryInfo);

  const weighted = knownCVEs * 0.50 + deprecated * 0.30 + license * 0.20;

  return {
    score: Math.round(weighted),
    details: { knownCVEs, deprecated, license },
  };
}
