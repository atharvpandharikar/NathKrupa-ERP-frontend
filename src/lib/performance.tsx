// Performance monitoring and optimization utilities
import React from 'react';

interface PerformanceMetrics {
    pageLoadTime: number;
    apiCallTime: number;
    renderTime: number;
    cacheHitRate: number;
    totalRequests: number;
    failedRequests: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        pageLoadTime: 0,
        apiCallTime: 0,
        renderTime: 0,
        cacheHitRate: 0,
        totalRequests: 0,
        failedRequests: 0
    };

    private startTimes = new Map<string, number>();
    private cacheHits = 0;
    private cacheMisses = 0;

    // Start timing an operation
    startTiming(operation: string): void {
        this.startTimes.set(operation, performance.now());
    }

    // End timing an operation
    endTiming(operation: string): number {
        const startTime = this.startTimes.get(operation);
        if (!startTime) return 0;

        const duration = performance.now() - startTime;
        this.startTimes.delete(operation);
        return duration;
    }

    // Record API call timing
    recordApiCall(duration: number, success: boolean = true): void {
        this.metrics.apiCallTime += duration;
        this.metrics.totalRequests++;

        if (!success) {
            this.metrics.failedRequests++;
        }
    }

    // Record cache hit/miss
    recordCacheHit(): void {
        this.cacheHits++;
        this.updateCacheHitRate();
    }

    recordCacheMiss(): void {
        this.cacheMisses++;
        this.updateCacheHitRate();
    }

    private updateCacheHitRate(): void {
        const total = this.cacheHits + this.cacheMisses;
        this.metrics.cacheHitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    }

    // Record page load time
    recordPageLoad(duration: number): void {
        this.metrics.pageLoadTime = duration;
    }

    // Record render time
    recordRender(duration: number): void {
        this.metrics.renderTime = duration;
    }

    // Get current metrics
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    // Reset metrics
    reset(): void {
        this.metrics = {
            pageLoadTime: 0,
            apiCallTime: 0,
            renderTime: 0,
            cacheHitRate: 0,
            totalRequests: 0,
            failedRequests: 0
        };
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.startTimes.clear();
    }

    // Log performance summary
    logSummary(): void {
        console.log('📊 Performance Summary:', {
            'Page Load Time': `${this.metrics.pageLoadTime.toFixed(2)}ms`,
            'API Call Time': `${this.metrics.apiCallTime.toFixed(2)}ms`,
            'Render Time': `${this.metrics.renderTime.toFixed(2)}ms`,
            'Cache Hit Rate': `${this.metrics.cacheHitRate.toFixed(1)}%`,
            'Total Requests': this.metrics.totalRequests,
            'Failed Requests': this.metrics.failedRequests,
            'Success Rate': `${((this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests * 100).toFixed(1)}%`
        });
    }
}

export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
    const startRender = () => {
        performanceMonitor.startTiming(`${componentName}_render`);
    };

    const endRender = () => {
        const duration = performanceMonitor.endTiming(`${componentName}_render`);
        performanceMonitor.recordRender(duration);
    };

    return { startRender, endRender };
};

// Higher-order component for performance monitoring
export const withPerformanceMonitoring = <P extends object>(
    WrappedComponent: React.ComponentType<P>,
    componentName: string
) => {
    return React.memo((props: P) => {
        const { startRender, endRender } = usePerformanceMonitor(componentName);

        React.useEffect(() => {
            startRender();
            return () => endRender();
        });

        return <WrappedComponent {...props} />;
    });
};

// Utility functions for common performance optimizations
export const performanceUtils = {
    // Debounce function
    debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },

    // Throttle function
    throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean;
        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Lazy load images
    lazyLoadImage(img: HTMLImageElement, src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = src;
        });
    },

    // Batch API calls
    async batchApiCalls<T>(
        calls: (() => Promise<T>)[],
        batchSize: number = 5
    ): Promise<T[]> {
        const results: T[] = [];

        for (let i = 0; i < calls.length; i += batchSize) {
            const batch = calls.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(call => call()));
            results.push(...batchResults);
        }

        return results;
    },

    // Preload critical resources
    preloadResources(urls: string[]): Promise<void[]> {
        return Promise.all(
            urls.map(url => {
                return new Promise<void>((resolve, reject) => {
                    const link = document.createElement('link');
                    link.rel = 'preload';
                    link.href = url;
                    link.onload = () => resolve();
                    link.onerror = reject;
                    document.head.appendChild(link);
                });
            })
        );
    }
};

// Performance optimization constants
export const PERFORMANCE_CONFIG = {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    BATCH_SIZE: 5,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_RETRIES: 3,
    TIMEOUT: 10000 // 10 seconds
} as const;

export default performanceMonitor;
