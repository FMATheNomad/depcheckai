import { HealthScoreCalculator } from '../src/scoring/index.js';
import { ScannedPackage } from '../src/scanners/index.js';

function makeMockPackage(overrides: Partial<ScannedPackage> = {}): ScannedPackage {
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
      description: 'Test package',
      ecosystem: 'npm',
      allVersions: ['1.0.0'],
      timeCreated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      keywords: ['esm', 'module'],
      deprecated: false,
      license: 'MIT',
      maintainers: [{ name: 'test', email: 'test@test.com' }],
    },
    downloads: 5000000,
    githubData: {
      stars: 5000,
      lastCommit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      openIssues: 10,
      contributors: 25,
    },
    ...overrides,
  };
}

describe('HealthScoreCalculator', () => {
  const calculator = new HealthScoreCalculator();

  it('should calculate overall score for healthy package', () => {
    const pkg = makeMockPackage();
    const score = calculator.calculate(pkg);

    expect(score.overall).toBeGreaterThanOrEqual(60);
    expect(score.level).toBe('good');
    expect(score.maintenance).toBeGreaterThanOrEqual(0);
    expect(score.popularity).toBeGreaterThanOrEqual(0);
    expect(score.compatibility).toBeGreaterThanOrEqual(0);
    expect(score.security).toBeGreaterThanOrEqual(0);
  });

  it('should detect deprecated packages', () => {
    const pkg = makeMockPackage({
      registryInfo: {
        name: 'moment',
        version: '2.29.4',
        latestVersion: '2.29.4',
        description: 'Deprecated package',
        ecosystem: 'npm',
        allVersions: ['2.29.4'],
        timeCreated: '2015-01-01T00:00:00.000Z',
        keywords: [],
        deprecated: true,
        deprecatedMessage: 'Legacy package, use dayjs instead',
        license: 'GPL',
        maintainers: [],
      },
      downloads: 100,
      githubData: { stars: 5, lastCommit: null, openIssues: 0, contributors: 0 },
    });

    const score = calculator.calculate(pkg);
    expect(score.security).toBeLessThanOrEqual(60);
    expect(score.explanations.length).toBeGreaterThan(0);
    expect(score.explanations.some(e => e.includes('DEPRECATED'))).toBe(true);
  });

  it('should mark low maintenance as risky', () => {
    const pkg = makeMockPackage({
      githubData: {
        stars: 10,
        lastCommit: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString(),
        openIssues: 50,
        contributors: 1,
      },
      downloads: 500,
    });

    const score = calculator.calculate(pkg);
    expect(score.maintenance).toBeLessThan(50);
  });

  it('should generate explanations', () => {
    const pkg = makeMockPackage({
      githubData: {
        stars: 5,
        lastCommit: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString(),
        openIssues: 100,
        contributors: 0,
      },
      downloads: 100,
    });

    const score = calculator.calculate(pkg);
    expect(score.explanations.length).toBeGreaterThan(0);
  });

  describe('security', () => {
    it('should penalize deprecated packages with low security score', () => {
      const pkg = makeMockPackage({
        registryInfo: {
          name: 'bad-pkg',
          version: '1.0.0',
          latestVersion: '1.0.0',
          description: 'Bad',
          ecosystem: 'npm',
          allVersions: ['1.0.0'],
          timeCreated: '2020-01-01T00:00:00.000Z',
          keywords: [],
          deprecated: true,
          license: 'MIT',
          maintainers: [],
        },
      });

      const score = calculator.calculate(pkg);
      expect(score.security).toBeLessThanOrEqual(60);
    });
  });

  describe('popularity', () => {
    it('should score based on downloads and stars', () => {
      const popularPkg = makeMockPackage({ downloads: 50000000, githubData: { stars: 50000, lastCommit: '2024-01-01', openIssues: 10, contributors: 100 } });
      const unpopularPkg = makeMockPackage({ downloads: 100, githubData: { stars: 0, lastCommit: null, openIssues: 0, contributors: 0 } });

      const popularScore = calculator.calculate(popularPkg);
      const unpopularScore = calculator.calculate(unpopularPkg);

      expect(popularScore.popularity).toBeGreaterThan(unpopularScore.popularity);
    });
  });

  describe('maintenance', () => {
    it('should score recent commits higher', () => {
      const recent = makeMockPackage({
        githubData: { stars: 100, lastCommit: new Date().toISOString(), openIssues: 1, contributors: 10 },
      });
      const old = makeMockPackage({
        githubData: { stars: 100, lastCommit: new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString(), openIssues: 1, contributors: 10 },
      });

      const recentScore = calculator.calculate(recent);
      const oldScore = calculator.calculate(old);

      expect(recentScore.maintenance).toBeGreaterThan(oldScore.maintenance);
    });
  });
});
