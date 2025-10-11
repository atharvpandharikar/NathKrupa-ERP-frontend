/**
 * Optimized data fetching hooks to reduce API calls and improve performance
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';

// Cache for storing fetched data
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Generic cache helper
 */
function getCachedData<T>(key: string): T | null {
    const cached = dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data as T;
    }
    return null;
}

function setCachedData<T>(key: string, data: T): void {
    dataCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Optimized hook for fetching feature categories
 * Reduces API calls by caching and batching requests
 */
export function useOptimizedFeatureCategories() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            const cacheKey = 'feature-categories';

            // Check cache first
            const cached = getCachedData<any[]>(cacheKey);
            if (cached) {
                setCategories(cached);
                setLoading(false);
                return;
            }

            try {
                // Fetch only necessary fields
                const response = await api.get<any[]>('/feature-categories/?fields=id,name,parent,is_active');
                setCachedData(cacheKey, response);
                setCategories(response);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const refresh = useCallback(async () => {
        dataCache.delete('feature-categories');
        setLoading(true);
        const response = await api.get<any[]>('/feature-categories/?fields=id,name,parent,is_active');
        setCachedData('feature-categories', response);
        setCategories(response);
        setLoading(false);
    }, []);

    return { categories, loading, error, refresh };
}

/**
 * Optimized hook for fetching feature prices by vehicle model
 * Uses minimal field selection and caching
 */
export function useOptimizedFeaturePrices(vehicleModelId?: number) {
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!vehicleModelId) {
            setPrices([]);
            return;
        }

        const fetchPrices = async () => {
            const cacheKey = `feature-prices-${vehicleModelId}`;

            // Check cache first
            const cached = getCachedData<any[]>(cacheKey);
            if (cached) {
                setPrices(cached);
                return;
            }

            setLoading(true);
            try {
                // Fetch only necessary fields for display
                const response = await api.get<any[]>(
                    `/feature-prices/by_vehicle/?vehicle_model=${vehicleModelId}`
                );
                setCachedData(cacheKey, response);
                setPrices(response);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPrices();
    }, [vehicleModelId]);

    return { prices, loading, error };
}

/**
 * Optimized hook for fetching quotations with pagination
 */
export function useOptimizedQuotations(page = 1, pageSize = 20, searchTerm = '') {
    const [quotations, setQuotations] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuotations = async () => {
            setLoading(true);
            try {
                const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
                const response = await api.get<any>(
                    `/quotations/?page=${page}&page_size=${pageSize}${searchParam}&fields=id,quotation_number,customer,vehicle_maker,vehicle_model,status,final_total,created_at`
                );

                setQuotations(response.results || response);
                setTotalCount(response.count || response.length);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuotations();
    }, [page, pageSize, searchTerm]);

    return { quotations, totalCount, loading, error };
}

/**
 * Optimized hook for fetching bills with pagination and minimal data
 */
export function useOptimizedBills(page = 1, pageSize = 20, filters?: any) {
    const [bills, setBills] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBills = async () => {
            setLoading(true);
            try {
                let url = `/bills/?page=${page}&page_size=${pageSize}`;

                if (filters?.status) url += `&status=${filters.status}`;
                if (filters?.is_test !== undefined) url += `&is_test=${filters.is_test}`;

                // Request minimal fields for list view
                url += '&fields=id,bill_number,is_test,status,bill_date,appointment_date,quoted_price,remaining_balance,customer_name,vehicle_info';

                const response = await api.get<any>(url);

                setBills(response.results || response);
                setTotalCount(response.count || response.length);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBills();
    }, [page, pageSize, filters]);

    return { bills, totalCount, loading, error };
}

/**
 * Optimized hook for fetching customers with search and caching
 */
export function useOptimizedCustomerSearch(searchTerm: string) {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!searchTerm || searchTerm.length < 3) {
            setCustomers([]);
            return;
        }

        const fetchCustomers = async () => {
            const cacheKey = `customer-search-${searchTerm}`;

            // Check cache first
            const cached = getCachedData<any[]>(cacheKey);
            if (cached) {
                setCustomers(cached);
                return;
            }

            setLoading(true);
            try {
                // Use the optimized quick search endpoint
                const response = await api.get<any[]>(
                    `/customers/search_quick/?q=${encodeURIComponent(searchTerm)}`
                );
                setCachedData(cacheKey, response);
                setCustomers(response);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        // Debounce the search
        const timer = setTimeout(fetchCustomers, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    return { customers, loading, error };
}

/**
 * Batch fetcher for multiple related data
 * Reduces multiple API calls to a single batch request
 */
export function useBatchedData(requests: Array<{ key: string; url: string }>) {
    const [data, setData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBatchedData = async () => {
            setLoading(true);
            const results: Record<string, any> = {};

            try {
                // Check cache for each request
                const uncachedRequests = requests.filter(req => {
                    const cached = getCachedData(req.key);
                    if (cached) {
                        results[req.key] = cached;
                        return false;
                    }
                    return true;
                });

                // Fetch uncached data in parallel
                if (uncachedRequests.length > 0) {
                    const promises = uncachedRequests.map(req =>
                        api.get(req.url).then(response => ({ key: req.key, data: response }))
                    );

                    const responses = await Promise.all(promises);

                    responses.forEach(({ key, data }) => {
                        setCachedData(key, data);
                        results[key] = data;
                    });
                }

                setData(results);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (requests.length > 0) {
            fetchBatchedData();
        }
    }, [JSON.stringify(requests)]);

    return { data, loading, error };
}

/**
 * Hook to prefetch commonly used data on app initialization
 */
export function usePrefetchCommonData() {
    useEffect(() => {
        const prefetchData = async () => {
            // Prefetch commonly used data
            const prefetchRequests = [
                { key: 'vehicle-types', url: '/vehicle-types/' },
                { key: 'vehicle-makers', url: '/vehicle-makers/' },
                { key: 'feature-categories-parents', url: '/feature-categories/parents/' },
            ];

            for (const req of prefetchRequests) {
                if (!getCachedData(req.key)) {
                    api.get(req.url).then(data => setCachedData(req.key, data));
                }
            }
        };

        prefetchData();
    }, []);
}

/**
 * Clear all cached data
 */
export function clearDataCache() {
    dataCache.clear();
}

/**
 * Clear specific cache entries
 */
export function clearCacheEntry(key: string | string[]) {
    if (Array.isArray(key)) {
        key.forEach(k => dataCache.delete(k));
    } else {
        dataCache.delete(key);
    }
}
