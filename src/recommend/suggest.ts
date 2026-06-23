import { Ecosystem } from '../scanners/manifest.js';
import { globalCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

export interface Suggestion {
  name: string;
  description: string;
  reason: string;
  downloads: number;
  stars: number;
}

const KNOWN_ALTERNATIVES: Record<string, Suggestion[]> = {
  'moment': [{
    name: 'dayjs',
    description: 'Fast 2kB alternative to Moment.js with the same modern API',
    reason: 'Moment.js is deprecated since 2023. dayjs is actively maintained, has 2kB size, and identical API.',
    downloads: 42000000,
    stars: 47000,
  }, {
    name: 'date-fns',
    description: 'Modern JavaScript date utility library',
    reason: 'Tree-shakeable, immutable, 200+ functions. Active maintenance.',
    downloads: 35000000,
    stars: 35000,
  }, {
    name: 'luxon',
    description: 'A powerful, modern, and friendly wrapper for JavaScript dates',
    reason: 'Immutable, timezone support, active development.',
    downloads: 15000000,
    stars: 16000,
  }],
  'request': [{
    name: 'axios',
    description: 'Promise-based HTTP client with interceptors',
    reason: 'Request is deprecated. axios has interceptors, automatic JSON parsing, and wide adoption.',
    downloads: 89000000,
    stars: 106000,
  }, {
    name: 'undici',
    description: 'A HTTP/1.1 client, written from scratch for Node.js',
    reason: 'Built by the Node.js team. Faster, HTTP/2 support, fetch-compatible.',
    downloads: 65000000,
    stars: 6500,
  }, {
    name: 'got',
    description: 'Human-friendly and powerful HTTP request library',
    reason: 'Promise-based, retry, pagination, streams support.',
    downloads: 28000000,
    stars: 14000,
  }],
  'gulp': [{
    name: 'vite',
    description: 'Next generation frontend tooling',
    reason: '10x faster than webpack/gulp. Native ESM, HMR, TypeScript support out of box.',
    downloads: 15000000,
    stars: 69000,
  }, {
    name: 'esbuild',
    description: 'An extremely fast bundler',
    reason: '100x faster than webpack. Written in Go. Used by Vite internally.',
    downloads: 35000000,
    stars: 38000,
  }],
  'jade': [{
    name: 'pug',
    description: 'Robust, elegant, feature-rich template engine',
    reason: 'Jade was renamed to Pug. This is the maintained successor.',
    downloads: 8000000,
    stars: 22000,
  }],
  'colors': [{
    name: 'chalk',
    description: 'Terminal string styling done right',
    reason: 'colors.js had a supply chain attack. chalk is maintained, widely used, and safe.',
    downloads: 250000000,
    stars: 22000,
  }],
  'forever': [{
    name: 'pm2',
    description: 'Production process manager for Node.js applications',
    reason: 'forever is unmaintained. pm2 has clustering, monitoring, and auto-restart.',
    downloads: 15000000,
    stars: 42000,
  }],
};

const ECOSYSTEM_NPM_ALTERNATIVES: Record<string, Suggestion[]> = {
  'gulp-cli': [{
    name: 'vite',
    description: 'Next generation frontend tooling',
    reason: 'Modern alternative with instant server start and fast HMR.',
    downloads: 15000000,
    stars: 69000,
  }],
};

export class AlternativeSuggester {
  async suggestAlternatives(name: string, ecosystem: Ecosystem): Promise<Suggestion[]> {
    if (ecosystem === 'crates') return [];
    if (ecosystem === 'pypi') return [];

    const cacheKey = `alternatives:${name}`;
    return globalCache.getOrFetch(cacheKey, 3600000, async () => {
      const exact = KNOWN_ALTERNATIVES[name];
      if (exact) return exact;

      const npmAlts = ECOSYSTEM_NPM_ALTERNATIVES[name];
      if (npmAlts) return npmAlts;

      logger.debug(`No known alternatives for ${name}`);
      return [];
    });
  }
}
