// API Cache Manager for reducing API requests
// Caches API responses and only refetches when changes are detected

interface CachedResponse<T> {
  data: T;
  timestamp: number;
  etag?: string; // For change detection
  version: number; // Increment when data changes
}

class ApiCacheManager {
  private static instance: ApiCacheManager;
  private cache: Map<string, CachedResponse<any>> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes default cache duration (increased to reduce API calls)
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached responses

  private constructor() {
    // Clean up old cache entries periodically
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000); // Clean up every 10 minutes
  }

  public static getInstance(): ApiCacheManager {
    if (!ApiCacheManager.instance) {
      ApiCacheManager.instance = new ApiCacheManager();
    }
    return ApiCacheManager.instance;
  }

  // Generate cache key from endpoint and params
  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramStr}`;
  }

  // Get cached response if valid
  public get<T>(endpoint: string, params?: Record<string, any>): CachedResponse<T> | null {
    const key = this.getCacheKey(endpoint, params);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached as CachedResponse<T>;
  }

  // Set cache entry
  public set<T>(endpoint: string, data: T, etag?: string, params?: Record<string, any>): void {
    const key = this.getCacheKey(endpoint, params);
    
    // Check cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    const existing = this.cache.get(key);
    const version = existing ? existing.version + 1 : 1;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
      version,
    });
  }

  // Invalidate cache for specific endpoint
  public invalidate(endpoint: string, params?: Record<string, any>): void {
    const key = this.getCacheKey(endpoint, params);
    this.cache.delete(key);
  }

  // Invalidate all caches for a store (e.g., invalidate all sales-related caches)
  public invalidateStore(store: 'products' | 'sales' | 'clients' | 'schedules'): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      // Check if key matches the store
      if (key.includes(`/${store}`) || key.includes(`/${store}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Invalidate all cache
  public clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((cached, key) => {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Get cache stats (for debugging)
  public getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const apiCache = ApiCacheManager.getInstance();
