// Data caching utility for performance optimization
interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiry: number;
}

class DataCache {
    private cache = new Map<string, CacheItem<any>>();
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
    private readonly STORAGE_KEY = 'nk:data-cache:v1';

    constructor() {
        this.loadFromStorage();
        this.cleanup();
    }

    private saveToStorage(): void {
        try {
            const obj: Record<string, CacheItem<any>> = {};
            this.cache.forEach((value, key) => {
                obj[key] = value;
            });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
        } catch { }
    }

    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return;
            const obj = JSON.parse(raw) as Record<string, CacheItem<any>>;
            Object.entries(obj).forEach(([key, item]) => {
                this.cache.set(key, item);
            });
        } catch { }
    }

    set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + ttl
        });
        this.saveToStorage();
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            this.saveToStorage();
            return null;
        }

        return item.data as T;
    }

    has(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) return false;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    clear(): void {
        this.cache.clear();
        try { localStorage.removeItem(this.STORAGE_KEY); } catch { }
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    // Clear expired entries
    cleanup(): void {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
        this.saveToStorage();
    }

    // Expose keys for advanced invalidation strategies (e.g., prefix delete)
    getKeys(): string[] {
        return Array.from(this.cache.keys());
    }
}

export const dataCache = new DataCache();

// Cache keys
export const CACHE_KEYS = {
    CATEGORIES: 'categories',
    BRANDS: 'brands',
    CAR_MAKERS: 'car_makers',
    PRODUCTS: 'products',
    CAR_MODELS: 'car_models',
    CAR_VARIANTS: 'car_variants',
} as const;

// Helper functions for common cache operations
export const cacheHelpers = {
    // Get cached data or fetch if not available
    async getOrFetch<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        const cached = dataCache.get<T>(key);
        if (cached) {
            console.log(`📦 Cache hit for ${key}`);
            return cached;
        }

        console.log(`🔄 Cache miss for ${key}, fetching...`);
        const data = await fetchFn();
        dataCache.set(key, data, ttl);
        return data;
    },

    // Invalidate cache entries
    invalidate(keys: string | string[]): void {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => dataCache.delete(key));
    },

    // Invalidate all cache entries whose key starts with the provided prefix
    invalidatePrefix(prefix: string): void {
        const keys = dataCache.getKeys();
        keys.forEach(key => {
            if (key.startsWith(prefix)) {
                dataCache.delete(key);
            }
        });
    },

    // Clear all cache
    clearAll(): void {
        dataCache.clear();
    }
};
