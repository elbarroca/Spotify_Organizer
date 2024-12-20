export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequest = 0;
  private minInterval = 100; // Minimum 100ms between requests

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRetry(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async executeWithRetry(fn: () => Promise<any>, retries = 3): Promise<any> {
    try {
      const now = Date.now();
      const timeToWait = Math.max(0, this.lastRequest + this.minInterval - now);
      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
      
      this.lastRequest = Date.now();
      return await fn();
    } catch (error: any) {
      if (retries > 0 && error?.status === 429) {
        const retryAfter = error.headers?.get('retry-after') || 1;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.executeWithRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  private async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }
    this.processing = false;
  }
}

export const spotifyRateLimiter = new RateLimiter(); 