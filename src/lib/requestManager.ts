// Global Request Manager - Prevents duplicate API requests and manages request queue
// This ensures each API endpoint is only called once at a time, even if multiple components request it

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  subscribers: number;
}

class RequestManager {
  private static instance: RequestManager;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestQueue: Array<{ key: string; fn: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private isProcessingQueue = false;
  private readonly DEDUPE_WINDOW = 5000; // 5 seconds - same request within this window is deduplicated
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly BATCH_DELAY = 100; // 100ms delay to batch requests

  private constructor() {
    // Clean up old pending requests periodically
    setInterval(() => {
      this.cleanup();
    }, 10000); // Every 10 seconds
  }

  public static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  /**
   * Execute a request with deduplication
   * If the same request is made within DEDUPE_WINDOW, return the existing promise
   */
  public async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: { force?: boolean; priority?: number }
  ): Promise<T> {
    const cacheKey = key;
    const now = Date.now();

    // Check if there's a pending request for this key
    const pending = this.pendingRequests.get(cacheKey);
    
    if (pending && !options?.force) {
      const age = now - pending.timestamp;
      if (age < this.DEDUPE_WINDOW) {
        // Request is still fresh, return existing promise
        pending.subscribers++;
        console.log(`[RequestManager] Deduplicating request: ${cacheKey} (${pending.subscribers} subscribers)`);
        return pending.promise as Promise<T>;
      } else {
        // Request is too old, remove it
        this.pendingRequests.delete(cacheKey);
      }
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const result = await requestFn();
        return result;
      } finally {
        // Remove from pending after completion (with delay to allow deduplication)
        setTimeout(() => {
          const current = this.pendingRequests.get(cacheKey);
          if (current && current.subscribers <= 1) {
            this.pendingRequests.delete(cacheKey);
          } else if (current) {
            current.subscribers--;
          }
        }, this.DEDUPE_WINDOW);
      }
    })();

    // Store pending request
    this.pendingRequests.set(cacheKey, {
      promise: requestPromise,
      timestamp: now,
      subscribers: 1,
    });

    return requestPromise;
  }

  /**
   * Queue a request for batched execution
   */
  public async queue<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.requestQueue.length >= this.MAX_QUEUE_SIZE) {
        reject(new Error('Request queue is full'));
        return;
      }

      this.requestQueue.push({
        key,
        fn: requestFn,
        resolve,
        reject,
      });

      // Start processing queue if not already processing
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests in batches
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Wait for batch delay
      await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));

      // Get batch of requests (up to 10 at a time)
      const batch = this.requestQueue.splice(0, 10);
      
      // Execute batch in parallel
      const batchPromises = batch.map(async ({ key, fn, resolve, reject }) => {
        try {
          const result = await this.execute(key, fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Wait for batch to complete before next batch
      await Promise.allSettled(batchPromises);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Cancel a pending request
   */
  public cancel(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  public clear(): void {
    this.pendingRequests.clear();
    this.requestQueue = [];
  }

  /**
   * Get stats for debugging
   */
  public getStats(): { pending: number; queue: number } {
    return {
      pending: this.pendingRequests.size,
      queue: this.requestQueue.length,
    };
  }

  /**
   * Clean up old pending requests
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.pendingRequests.forEach((request, key) => {
      const age = now - request.timestamp;
      if (age > this.DEDUPE_WINDOW * 2) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.pendingRequests.delete(key);
    });
  }
}

export const requestManager = RequestManager.getInstance();
