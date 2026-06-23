import { RecommendationEngine } from '../src/recommend/index.js';
import { ScannedPackage } from '../src/scanners/index.js';
import { HealthScoreCalculator } from '../src/scoring/index.js';

function makeMockPkg(overrides: Partial<ScannedPackage> = {}): ScannedPackage {
  return {
    dependency: {
      name: 'test-pkg',
      version: '1.0.0',
      ecosystem: 'npm',
    },
    registryInfo: {
      name: 'test-pkg',
      version: '1.0.0',
      latestVersion: '1.0.0',
      description: 'Test',
      ecosystem: 'npm',
      allVersions: ['1.0.0'],
      timeCreated: new Date().toISOString(),
      keywords: [],
      deprecated: false,
      license: 'MIT',
      maintainers: [],
    },
    downloads: 100000,
    githubData: { stars: 500, lastCommit: new Date().toISOString(), openIssues: 5, contributors: 10 },
    ...overrides,
  };
}

describe('RecommendationEngine', () => {
  const engine = new RecommendationEngine();
  const healthCalc = new HealthScoreCalculator();

  it('should recommend ok for healthy packages', async () => {
    const pkg = makeMockPkg();
    const rec = await engine.recommend(pkg);
    expect(rec.action).toBe('ok');
  });

  it('should recommend replace for deprecated packages', async () => {
    const pkg = makeMockPkg({
      registryInfo: {
        name: 'moment',
        version: '2.29.4',
        latestVersion: '2.29.4',
        description: 'Deprecated',
        ecosystem: 'npm',
        allVersions: ['2.29.4'],
        timeCreated: '2015-01-01T00:00:00.000Z',
        keywords: [],
        deprecated: true,
        deprecatedMessage: 'Legacy package',
        license: 'MIT',
        maintainers: [],
      },
    });

    const rec = await engine.recommend(pkg);
    expect(rec.action).toBe('replace');
  });

  it('should recommend update for outdated minor/patch', async () => {
    const pkg = makeMockPkg({
      dependency: { name: 'test-pkg', version: '1.0.0', ecosystem: 'npm' },
      registryInfo: {
        name: 'test-pkg',
        version: '1.0.0',
        latestVersion: '1.1.0',
        description: 'Test',
        ecosystem: 'npm',
        allVersions: ['1.0.0', '1.0.1', '1.1.0'],
        timeCreated: '2022-01-01T00:00:00.000Z',
        keywords: [],
        deprecated: false,
        license: 'MIT',
        maintainers: [],
      },
    });

    const rec = await engine.recommend(pkg);
    expect(rec.action).toBe('update');
  });

  it('should recommend replace for critical packages', async () => {
    const pkg = makeMockPkg({
      dependency: { name: 'dead-pkg', version: '1.0.0', ecosystem: 'npm' },
      registryInfo: {
        name: 'dead-pkg',
        version: '1.0.0',
        latestVersion: '1.0.0',
        description: 'Dead',
        ecosystem: 'npm',
        allVersions: [],
        timeCreated: '2018-01-01T00:00:00.000Z',
        keywords: [],
        deprecated: true,
        deprecatedMessage: 'No longer maintained',
        license: 'UNKNOWN',
        maintainers: [],
      },
      downloads: 50,
      githubData: { stars: 0, lastCommit: null, openIssues: 0, contributors: 0 },
    });

    const rec = await engine.recommend(pkg);
    expect(rec.action).toBe('replace');
  });

  it('should suggest alternatives for known deprecated packages', async () => {
    const pkg = makeMockPkg({
      dependency: { name: 'moment', version: '2.29.4', ecosystem: 'npm' },
      registryInfo: {
        name: 'moment',
        version: '2.29.4',
        latestVersion: '2.30.1',
        description: 'Parse, validate, manipulate, and display dates',
        ecosystem: 'npm',
        allVersions: ['2.29.4'],
        timeCreated: '2015-01-01T00:00:00.000Z',
        keywords: [],
        deprecated: true,
        deprecatedMessage: 'Legacy package',
        license: 'MIT',
        maintainers: [],
      },
    });

    const rec = await engine.recommend(pkg);
    expect(rec.suggested).toBeDefined();
    expect(rec.alternatives).toBeDefined();
    expect(rec.alternatives!.length).toBeGreaterThan(0);
  });
});
