interface CacheEntry<T> {
  data: T;
  expires: number;
}

export class ApiCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private hits = 0;
  private misses = 0;

  async getOrFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (existing && existing.expires > now) {
      this.hits++;
      return existing.data as T;
    }

    this.misses++;
    const data = await fetcher();
    this.cache.set(key, { data, expires: now + ttlMs });
    return data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expires <= Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get stats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0,
    };
  }
}

export const globalCache = new ApiCache();
