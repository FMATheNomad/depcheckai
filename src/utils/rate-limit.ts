import { logger } from './logger.js';

interface RateLimitState {
  remaining: number;
  reset: number;
  isLimited: boolean;
}

class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private backoff: Map<string, number> = new Map();

  updateFromHeaders(scope: string, remaining: number, reset: number): void {
    this.limits.set(scope, { remaining, reset, isLimited: remaining === 0 });
    if (remaining === 0) {
      const waitSeconds = Math.max(reset - Math.floor(Date.now() / 1000), 0);
      logger.warn(`Rate limit reached for ${scope}. Resets in ${waitSeconds}s. Aggressive caching enabled.`);
    }
  }

  isRateLimited(scope: string): boolean {
    const state = this.limits.get(scope);
    if (!state) return false;
    if (state.isLimited && Date.now() / 1000 < state.reset) {
      return true;
    }
    if (state.isLimited && Date.now() / 1000 >= state.reset) {
      this.limits.delete(scope);
      return false;
    }
    return false;
  }

  getDelay(scope: string): number {
    const state = this.limits.get(scope);
    if (!state || state.remaining > 10) return 0;
    const base = this.backoff.get(scope) || 100;
    const delay = Math.min(base, 5000);
    this.backoff.set(scope, base * 2);
    return delay;
  }

  resetBackoff(scope: string): void {
    this.backoff.delete(scope);
  }

  async waitIfNeeded(scope: string): Promise<void> {
    if (this.isRateLimited(scope)) {
      const state = this.limits.get(scope)!;
      const waitSeconds = Math.max(state.reset - Math.floor(Date.now() / 1000), 0) + 1;
      logger.warn(`Rate limited on ${scope}. Waiting ${waitSeconds}s...`);
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      this.limits.delete(scope);
      return;
    }
    const delay = this.getDelay(scope);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const newDelay = this.backoff.get(scope) || 100;
      this.backoff.set(scope, Math.min(newDelay * 1.5, 5000));
    }
  }
}

export const rateLimiter = new RateLimiter();
