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

interface FeaturePrice {
    id: number;
    vehicle_model: { id: number; name: string };
    feature_category?: { id: number; name: string } | null;
    feature_type?: { id: number; name: string; category: { id: number; name: string } } | null;
    price: string;
}

interface VehicleModel {
    id: number;
    name: string;
}

interface FeatureCategory {
    id: number;
    name: string;
}

interface FeatureType {
    id: number;
    name: string;
    category: { id: number; name: string };
}

interface FeatureImage {
    id: number;
    image: string;
    alt_text?: string | null;
    feature_price: number;
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
                // Use Typesense search if searchTerm is provided, otherwise use paginated list
                if (searchTerm && searchTerm.trim()) {
                    const { quotationApi } = await import('@/lib/api');
                    const searchResponse = await quotationApi.search(searchTerm);
                    setQuotations(searchResponse.results || []);
                    setTotalCount(searchResponse.count || 0);
                } else {
                    const searchParam = '';
                    const response = await api.get<any>(
                        `/quotations/?page=${page}&page_size=${pageSize}${searchParam}&fields=id,quotation_number,customer,vehicle_maker,vehicle_model,status,final_total,created_at`
                    );

                    setQuotations(response.results || response);
                    setTotalCount(response.count || response.length);
                }
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
 * Optimized hook for fetching transactions with search
 */
export function useOptimizedTransactions(searchTerm = '') {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                // Use Typesense search if searchTerm is provided, otherwise fetch all
                if (searchTerm && searchTerm.trim()) {
                    const { financeApi } = await import('@/lib/api');
                    const searchResponse = await financeApi.searchTransactions(searchTerm);
                    setTransactions(searchResponse.results || []);
                } else {
                    const { financeApi } = await import('@/lib/api');
                    const response = await financeApi.get<any>('/transactions/?page_size=1000');
                    const transactionsData = Array.isArray(response) ? response : (response.results || []);
                    setTransactions(transactionsData);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [searchTerm]);

    return { transactions, loading, error };
}

/**
 * Optimized hook for fetching vendors with search
 */
export function useOptimizedVendors(searchTerm = '') {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVendors = async () => {
            setLoading(true);
            try {
                const { purchaseApi } = await import('@/lib/api');
                // Use Typesense search if searchTerm is provided, otherwise fetch all
                if (searchTerm && searchTerm.trim()) {
                    const searchResponse = await purchaseApi.vendors.search(searchTerm);
                    setVendors(searchResponse.results || []);
                } else {
                    const response = await purchaseApi.vendors.list();
                    const vendorsData = Array.isArray(response) ? response : (response.results || []);
                    setVendors(vendorsData);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchVendors();
    }, [searchTerm]);

    return { vendors, loading, error };
}

/**
 * Optimized hook for fetching purchase bills with search
 */
export function useOptimizedPurchaseBills(searchTerm = '') {
    const [bills, setBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBills = async () => {
            setLoading(true);
            try {
                const { purchaseApi } = await import('@/lib/api');
                // Use Typesense search if searchTerm is provided, otherwise fetch all
                if (searchTerm && searchTerm.trim()) {
                    const searchResponse = await purchaseApi.bills.search(searchTerm);
                    setBills(searchResponse.results || []);
                } else {
                    const response = await purchaseApi.bills.list();
                    const billsData = Array.isArray(response) ? response : (response.results || []);
                    setBills(billsData);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBills();
    }, [searchTerm]);

    return { bills, loading, error };
}

/**
 * Optimized hook for fetching work orders with pagination
 */
export function useOptimizedWorkOrders(page = 1, pageSize = 20, searchTerm = '') {
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWorkOrders = async () => {
            setLoading(true);
            try {
                // Use Typesense search if searchTerm is provided, otherwise use paginated list
                if (searchTerm && searchTerm.trim()) {
                    const { workOrdersApi } = await import('@/lib/api');
                    const searchResponse = await workOrdersApi.search(searchTerm);
                    setWorkOrders(searchResponse.results || []);
                    setTotalCount(searchResponse.count || 0);
                } else {
                    const searchParam = '';
                    const response = await api.get<any>(
                        `/work-orders/?page=${page}&page_size=${pageSize}${searchParam}`
                    );

                    setWorkOrders(response.results || response);
                    setTotalCount(response.count || response.length);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkOrders();
    }, [page, pageSize, searchTerm]);

    return { workOrders, totalCount, loading, error };
}

/**
 * Optimized hook for fetching all data for the Feature Prices page with caching.
 */
export function useOptimizedAllFeatureData() {
    const [data, setData] = useState<{
        prices: FeaturePrice[];
        models: VehicleModel[];
        categories: FeatureCategory[];
        types: FeatureType[];
        images: FeatureImage[];
    }>({
        prices: [],
        models: [],
        categories: [],
        types: [],
        images: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            const cacheKeys = {
                prices: 'feature-prices-all',
                models: 'vehicle-models-all',
                categories: 'feature-categories-all',
                types: 'feature-types-all',
                images: 'feature-images-all',
            };

            try {
                // Check cache first
                const cachedPrices = getCachedData<FeaturePrice[]>(cacheKeys.prices);
                const cachedModels = getCachedData<VehicleModel[]>(cacheKeys.models);
                const cachedCategories = getCachedData<FeatureCategory[]>(cacheKeys.categories);
                const cachedTypes = getCachedData<FeatureType[]>(cacheKeys.types);
                const cachedImages = getCachedData<FeatureImage[]>(cacheKeys.images);

                if (cachedPrices && cachedModels && cachedCategories && cachedTypes && cachedImages) {
                    setData({
                        prices: cachedPrices,
                        models: cachedModels,
                        categories: cachedCategories,
                        types: cachedTypes,
                        images: cachedImages,
                    });
                    setLoading(false);
                    return;
                }

                // Fetch from API - use page_size=1000 to get all results (bypass pagination for reference data)
                const [pricesRes, modelsRes, categoriesRes, typesRes, imagesRes] = await Promise.all([
                    api.get<any>('/feature-prices/?page_size=1000'),
                    api.get<any>('/vehicle-models/?page_size=1000'),
                    api.get<any>('/feature-categories/?page_size=1000'),
                    api.get<any>('/feature-types/?page_size=1000'),
                    api.get<any>('/feature-images/?page_size=1000'),
                ]);
                
                // Extract results from paginated response or use array directly
                const prices = Array.isArray(pricesRes) ? pricesRes : (pricesRes.results || []);
                const models = Array.isArray(modelsRes) ? modelsRes : (modelsRes.results || []);
                const categories = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.results || []);
                const types = Array.isArray(typesRes) ? typesRes : (typesRes.results || []);
                const images = Array.isArray(imagesRes) ? imagesRes : (imagesRes.results || []);

                // Set cache
                setCachedData(cacheKeys.prices, prices);
                setCachedData(cacheKeys.models, models);
                setCachedData(cacheKeys.categories, categories);
                setCachedData(cacheKeys.types, types);
                setCachedData(cacheKeys.images, images);

                setData({ prices, models, categories, types, images });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    return { ...data, loading, error };
}

/**
 * Optimized hook for fetching all data for the Feature Categories page with caching.
 */
export function useOptimizedFeatureCategoriesPageData() {
    const [data, setData] = useState<{
        categories: FeatureCategory[];
        vehicleTypes: any[];
    }>({
        categories: [],
        vehicleTypes: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            const cacheKeys = {
                categories: 'feature-categories-all',
                vehicleTypes: 'vehicle-types-all',
            };

            try {
                // Check cache first
                const cachedCategories = getCachedData<FeatureCategory[]>(cacheKeys.categories);
                const cachedVehicleTypes = getCachedData<any[]>(cacheKeys.vehicleTypes);

                if (cachedCategories && cachedVehicleTypes) {
                    setData({
                        categories: cachedCategories,
                        vehicleTypes: cachedVehicleTypes,
                    });
                    setLoading(false);
                    return;
                }

                // Fetch from API - use page_size=1000 to get all results (bypass pagination for reference data)
                const [categoriesRes, vehicleTypesRes] = await Promise.all([
                    api.get<any>('/feature-categories/?page_size=1000'),
                    api.get<any>('/vehicle-types/?page_size=1000'),
                ]);
                
                // Extract results from paginated response or use array directly
                const categories = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.results || []);
                const vehicleTypes = Array.isArray(vehicleTypesRes) ? vehicleTypesRes : (vehicleTypesRes.results || []);

                // Set cache
                setCachedData(cacheKeys.categories, categories);
                setCachedData(cacheKeys.vehicleTypes, vehicleTypes);

                setData({ categories, vehicleTypes });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, []);

    return { ...data, loading, error };
}


/**
 * Optimized hook for fetching all data for the Feature Types page with caching.
 */
export function useOptimizedFeatureTypesPageData() {
    const [data, setData] = useState<{
        types: FeatureType[];
        categories: FeatureCategory[];
        models: VehicleModel[];
    }>({
        types: [],
        categories: [],
        models: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            const cacheKeys = {
                types: 'feature-types-all',
                categories: 'feature-categories-all',
                models: 'vehicle-models-all',
            };

            try {
                // Check cache first
                const cachedTypes = getCachedData<FeatureType[]>(cacheKeys.types);
                const cachedCategories = getCachedData<FeatureCategory[]>(cacheKeys.categories);
                const cachedModels = getCachedData<VehicleModel[]>(cacheKeys.models);

                if (cachedTypes && cachedCategories && cachedModels) {
                    setData({
                        types: cachedTypes,
                        categories: cachedCategories,
                        models: cachedModels,
                    });
                    setLoading(false);
                    return;
                }

                // Fetch from API - use page_size=1000 to get all results (bypass pagination for reference data)
                const [typesRes, categoriesRes, modelsRes] = await Promise.all([
                    api.get<any>('/feature-types/?page_size=1000'),
                    api.get<any>('/feature-categories/?page_size=1000'),
                    api.get<any>('/vehicle-models/?page_size=1000'),
                ]);
                
                // Extract results from paginated response or use array directly
                const types = Array.isArray(typesRes) ? typesRes : (typesRes.results || []);
                const categories = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.results || []);
                const models = Array.isArray(modelsRes) ? modelsRes : (modelsRes.results || []);

                // Set cache
                setCachedData(cacheKeys.types, types);
                setCachedData(cacheKeys.categories, categories);
                setCachedData(cacheKeys.models, models);

                setData({ types, categories, models });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, []);

    return { ...data, loading, error };
}


/**
 * Optimized hook for fetching vehicle types with caching.
 */
export function useOptimizedVehicleTypes() {
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVehicleTypes = async () => {
            setLoading(true);
            const cacheKey = 'vehicle-types-all';

            try {
                // Check cache first
                const cachedData = getCachedData<any[]>(cacheKey);
                if (cachedData) {
                    setVehicleTypes(cachedData);
                    setLoading(false);
                    return;
                }

                // Fetch from API - use page_size=1000 to get all results (bypass pagination for reference data)
                const response = await api.get<any>('/vehicle-types/?page_size=1000');
                // Extract results from paginated response or use array directly
                const vehicleTypesData = Array.isArray(response) ? response : (response.results || []);
                setCachedData(cacheKey, vehicleTypesData);
                setVehicleTypes(vehicleTypesData);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicleTypes();
    }, []);

    return { vehicleTypes, loading, error };
}

/**
 * Optimized hook for fetching vehicle makers with caching.
 */
export function useOptimizedVehicleMakers() {
    const [vehicleMakers, setVehicleMakers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVehicleMakers = async () => {
            setLoading(true);
            const cacheKey = 'vehicle-makers-all';

            try {
                // Check cache first
                const cachedData = getCachedData<any[]>(cacheKey);
                if (cachedData) {
                    setVehicleMakers(cachedData);
                    setLoading(false);
                    return;
                }

                // Fetch from API - use page_size=1000 to get all results (bypass pagination for reference data)
                const response = await api.get<any>('/vehicle-makers/?page_size=1000');
                // Extract results from paginated response or use array directly
                const vehicleMakersData = Array.isArray(response) ? response : (response.results || []);
                setCachedData(cacheKey, vehicleMakersData);
                setVehicleMakers(vehicleMakersData);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicleMakers();
    }, []);

    return { vehicleMakers, loading, error };
}

/**
 * Optimized hook for fetching all data for the Vehicle Models page with caching.
 */
export function useOptimizedVehicleModelsPageData() {
    const [data, setData] = useState<{
        models: VehicleModel[];
        makers: any[];
        types: any[];
    }>({
        models: [],
        makers: [],
        types: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            const cacheKeys = {
                models: 'vehicle-models-all',
                makers: 'vehicle-makers-all',
                types: 'vehicle-types-all',
            };

            try {
                // Check cache first
                const cachedModels = getCachedData<VehicleModel[]>(cacheKeys.models);
                const cachedMakers = getCachedData<any[]>(cacheKeys.makers);
                const cachedTypes = getCachedData<any[]>(cacheKeys.types);

                if (cachedModels && cachedMakers && cachedTypes) {
                    setData({
                        models: cachedModels,
                        makers: cachedMakers,
                        types: cachedTypes,
                    });
                    setLoading(false);
                    return;
                }

                // Fetch from API - use page_size=1000 to get all results (bypass pagination for reference data)
                const [modelsRes, makersRes, typesRes] = await Promise.all([
                    api.get<any>('/vehicle-models/?page_size=1000'),
                    api.get<any>('/vehicle-makers/?page_size=1000'),
                    api.get<any>('/vehicle-types/?page_size=1000'),
                ]);
                
                // Extract results from paginated response or use array directly
                const models = Array.isArray(modelsRes) ? modelsRes : (modelsRes.results || []);
                const makers = Array.isArray(makersRes) ? makersRes : (makersRes.results || []);
                const types = Array.isArray(typesRes) ? typesRes : (typesRes.results || []);

                // Set cache
                setCachedData(cacheKeys.models, models);
                setCachedData(cacheKeys.makers, makers);
                setCachedData(cacheKeys.types, types);

                setData({ models, makers, types });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, []);

    return { ...data, loading, error };
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
