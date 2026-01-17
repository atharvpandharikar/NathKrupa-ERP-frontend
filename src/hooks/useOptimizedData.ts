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

export type TransactionSortOption = 'newest' | 'oldest' | 'amount_high' | 'amount_low';

const TRANSACTION_ORDERING_MAP: Record<TransactionSortOption, string> = {
    newest: '-time',
    oldest: 'time',
    amount_high: '-amount',
    amount_low: 'amount',
};

function sortTransactionsClientSide(items: any[], sort: TransactionSortOption): any[] {
    const normalizedDate = (value?: string) => value ? new Date(value).getTime() : 0;
    const normalizedAmount = (value?: number | string) => {
        if (typeof value === 'number') return value;
        const parsed = parseFloat(value || '0');
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const list = [...items];

    switch (sort) {
        case 'newest':
            return list.sort((a, b) => normalizedDate(b?.time || b?.created_at) - normalizedDate(a?.time || a?.created_at));
        case 'oldest':
            return list.sort((a, b) => normalizedDate(a?.time || a?.created_at) - normalizedDate(b?.time || b?.created_at));
        case 'amount_high':
            return list.sort((a, b) => normalizedAmount(b?.amount) - normalizedAmount(a?.amount));
        case 'amount_low':
            return list.sort((a, b) => normalizedAmount(a?.amount) - normalizedAmount(b?.amount));
        default:
            return list;
    }
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
                // Fetch from new endpoint
                const response = await api.get<any>('/feature-categories/');
                // Extract categories from response structure: { success, count, categories: [...] }
                let categories: any[] = [];
                if (Array.isArray(response)) {
                    categories = response;
                } else if (response.categories && Array.isArray(response.categories)) {
                    categories = response.categories;
                } else if (response.results && Array.isArray(response.results)) {
                    categories = response.results;
                }
                setCachedData(cacheKey, categories);
                setCategories(categories);
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
        const response = await api.get<any>('/feature-categories/');
        // Extract categories from response structure: { success, count, categories: [...] }
        let categories: any[] = [];
        if (Array.isArray(response)) {
            categories = response;
        } else if (response.categories && Array.isArray(response.categories)) {
            categories = response.categories;
        } else if (response.results && Array.isArray(response.results)) {
            categories = response.results;
        }
        setCachedData('feature-categories', categories);
        setCategories(categories);
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
                    const searchResponse = await quotationApi.search(searchTerm) as any;
                    setQuotations(searchResponse.results || []);
                    setTotalCount(searchResponse.count || 0);
                } else {
                    const searchParam = '';
                    const response = await api.get<any>(
                        `/quotations/?page=${page}&page_size=${pageSize}${searchParam}`
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
export function useOptimizedTransactions(
    page = 1,
    pageSize = 25,
    filters?: {
        account?: string;
        type?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
        sort?: TransactionSortOption;
    }
) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    useEffect(() => {
        const sortOption: TransactionSortOption = (filters?.sort as TransactionSortOption) || 'newest';
        const searchValue = filters?.search?.trim() || '';

        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const { financeApi } = await import('@/lib/api');

                if (searchValue) {
                    const searchResponse = await financeApi.searchTransactions(searchValue) as any;
                    const searchResults = Array.isArray(searchResponse?.results)
                        ? searchResponse.results
                        : (searchResponse?.results || []);
                    const sortedResults = sortTransactionsClientSide(searchResults, sortOption);
                    setTransactions(sortedResults);
                    setTotalCount(searchResponse?.count || sortedResults.length);
                } else {
                    let queryParams = `?page=${page}&page_size=${pageSize}`;

                    if (filters?.account && filters.account !== 'all') {
                        queryParams += `&account_id=${filters.account}`;
                    }
                    if (filters?.type && filters.type !== 'all') {
                        queryParams += `&transaction_type=${filters.type}`;
                    }
                    if (filters?.dateFrom) {
                        queryParams += `&from_date=${filters.dateFrom}`;
                    }
                    if (filters?.dateTo) {
                        queryParams += `&to_date=${filters.dateTo}`;
                    }

                    const ordering = TRANSACTION_ORDERING_MAP[sortOption] || '-time';
                    queryParams += `&ordering=${ordering}`;

                    const response = await financeApi.get<any>(`/transactions/${queryParams}`);

                    const transactionsData = Array.isArray(response) ? response : (response.results || []);
                    const sortedTransactions = sortTransactionsClientSide(transactionsData, sortOption);
                    setTransactions(sortedTransactions);
                    setTotalCount(response.count || sortedTransactions.length);
                }
            } catch (err: any) {
                console.error("Error fetching transactions:", err);
                setError(err.message);
                setTransactions([]);
                setTotalCount(0);
            } finally {
                setLoading(false);
            }
        };

        if (searchValue) {
            const timer = setTimeout(fetchTransactions, 300);
            return () => clearTimeout(timer);
        } else {
            fetchTransactions();
        }
    }, [page, pageSize, filters?.account, filters?.type, filters?.dateFrom, filters?.dateTo, filters?.search, filters?.sort, refreshTrigger]);

    return { transactions, totalCount, loading, error, refresh };
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
                    const searchResponse = await purchaseApi.vendors.search(searchTerm) as any;
                    setVendors(searchResponse.results || []);
                } else {
                    const response = await purchaseApi.vendors.list();
                    const vendorsData = Array.isArray(response) ? response : ((response as any)?.results || []);
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
                    const searchResponse = await purchaseApi.bills.search(searchTerm) as any;
                    setBills(searchResponse.results || []);
                } else {
                    const response = await purchaseApi.bills.list() as any;
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
                    const searchResponse = await workOrdersApi.search(searchTerm) as any;
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
 * Uses pagination for main data (prices) and limited results for reference data.
 */
export function useOptimizedAllFeatureData(page = 1, pageSize = 20) {
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
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            const cacheKeys = {
                models: 'vehicle-models-ref',
                categories: 'feature-categories-ref',
                types: 'feature-types-ref',
            };

            try {
                // Check cache first for reference data
                const cachedModels = getCachedData<VehicleModel[]>(cacheKeys.models);
                const cachedCategories = getCachedData<FeatureCategory[]>(cacheKeys.categories);
                const cachedTypes = getCachedData<FeatureType[]>(cacheKeys.types);

                // Fetch reference data (limited to 20 for dropdowns) - these are cached
                let models: VehicleModel[] = [];
                let categories: FeatureCategory[] = [];
                let types: FeatureType[] = [];

                if (cachedModels && cachedCategories && cachedTypes) {
                    models = cachedModels;
                    categories = cachedCategories;
                    types = cachedTypes;
                } else {
                    const [modelsRes, categoriesRes, typesRes] = await Promise.all([
                        api.get<any>('/vehicle-models/?limit=20&offset=0'),
                        api.get<any>('/feature-categories/'),
                        api.get<any>('/feature-types/'),
                    ]);

                    models = Array.isArray(modelsRes) ? modelsRes : (modelsRes.results || []);
                    // Extract categories from response structure: { success, count, categories: [...] }
                    if (Array.isArray(categoriesRes)) {
                        categories = categoriesRes;
                    } else if (categoriesRes.categories && Array.isArray(categoriesRes.categories)) {
                        categories = categoriesRes.categories;
                    } else if (categoriesRes.results && Array.isArray(categoriesRes.results)) {
                        categories = categoriesRes.results;
                    }
                    // Extract feature types from response structure: { success, count, feature_types: [...] }
                    if (Array.isArray(typesRes)) {
                        types = typesRes;
                    } else if (typesRes.feature_types && Array.isArray(typesRes.feature_types)) {
                        types = typesRes.feature_types;
                    } else if (typesRes.results && Array.isArray(typesRes.results)) {
                        types = typesRes.results;
                    }

                    setCachedData(cacheKeys.models, models);
                    setCachedData(cacheKeys.categories, categories);
                    setCachedData(cacheKeys.types, types);
                }

                // Fetch paginated prices (main list data)
                const offset = (page - 1) * pageSize;
                const pricesRes = await api.get<any>(`/feature-prices/?limit=${pageSize}&offset=${offset}`);
                const prices = Array.isArray(pricesRes) ? pricesRes : (pricesRes.results || []);
                const count = pricesRes.count || prices.length;

                // Don't fetch all images - they're loaded on demand per price
                setData({ prices, models, categories, types, images: [] });
                setTotalCount(count);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [page, pageSize]);

    return { ...data, totalCount, loading, error };
}

/**
 * Optimized hook for fetching all data for the Feature Categories page with caching.
 */
export function useOptimizedFeatureCategoriesPageData(page = 1, pageSize = 20) {
    const [data, setData] = useState<{
        categories: FeatureCategory[];
        vehicleTypes: any[];
    }>({
        categories: [],
        vehicleTypes: [],
    });
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            const cacheKeys = {
                vehicleTypes: 'vehicle-types-ref',
            };

            try {
                // Check cache first for reference data
                const cachedVehicleTypes = getCachedData<any[]>(cacheKeys.vehicleTypes);

                let vehicleTypes: any[] = [];
                if (cachedVehicleTypes) {
                    vehicleTypes = cachedVehicleTypes;
                } else {
                    const vehicleTypesRes = await api.get<any>('/vehicle-types/?limit=20&offset=0');
                    vehicleTypes = Array.isArray(vehicleTypesRes) ? vehicleTypesRes : (vehicleTypesRes.results || []);
                    setCachedData(cacheKeys.vehicleTypes, vehicleTypes);
                }

                // Fetch categories from new endpoint (all categories, then paginate client-side)
                const categoriesRes = await api.get<any>('/feature-categories/');
                // Extract categories from response structure: { success, count, categories: [...] }
                let allCategories: any[] = [];
                if (Array.isArray(categoriesRes)) {
                    allCategories = categoriesRes;
                } else if (categoriesRes.categories && Array.isArray(categoriesRes.categories)) {
                    allCategories = categoriesRes.categories;
                } else if (categoriesRes.results && Array.isArray(categoriesRes.results)) {
                    allCategories = categoriesRes.results;
                }
                // Use count from response if available, otherwise use array length
                const count = categoriesRes.count || allCategories.length;
                // Client-side pagination
                const offset = (page - 1) * pageSize;
                const categories = allCategories.slice(offset, offset + pageSize);

                setData({ categories, vehicleTypes });
                setTotalCount(count);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [page, pageSize]);

    return { ...data, totalCount, loading, error };
}


/**
 * Optimized hook for fetching all data for the Feature Types page with caching.
 */
export function useOptimizedFeatureTypesPageData(page = 1, pageSize = 20) {
    const [data, setData] = useState<{
        types: FeatureType[];
        categories: FeatureCategory[];
        models: VehicleModel[];
    }>({
        types: [],
        categories: [],
        models: [],
    });
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            const cacheKeys = {
                categories: 'feature-categories-ref',
                models: 'vehicle-models-ref',
            };

            try {
                // Check cache first for reference data
                const cachedCategories = getCachedData<FeatureCategory[]>(cacheKeys.categories);
                const cachedModels = getCachedData<VehicleModel[]>(cacheKeys.models);

                let categories: FeatureCategory[] = [];
                let models: VehicleModel[] = [];

                if (cachedCategories && cachedModels) {
                    categories = cachedCategories;
                    models = cachedModels;
                } else {
                    const [categoriesRes, modelsRes] = await Promise.all([
                        api.get<any>('/feature-categories/'),
                        api.get<any>('/vehicle-models/?limit=20&offset=0'),
                    ]);

                    // Extract categories from response structure: { success, count, categories: [...] }
                    if (Array.isArray(categoriesRes)) {
                        categories = categoriesRes;
                    } else if (categoriesRes.categories && Array.isArray(categoriesRes.categories)) {
                        categories = categoriesRes.categories;
                    } else if (categoriesRes.results && Array.isArray(categoriesRes.results)) {
                        categories = categoriesRes.results;
                    }
                    models = Array.isArray(modelsRes) ? modelsRes : (modelsRes.results || []);

                    setCachedData(cacheKeys.categories, categories);
                    setCachedData(cacheKeys.models, models);
                }

                // Fetch types from new endpoint (all types, then paginate client-side)
                const typesRes = await api.get<any>('/feature-types/');
                // Extract feature types from response structure: { success, count, feature_types: [...] }
                let allTypes: any[] = [];
                if (Array.isArray(typesRes)) {
                    allTypes = typesRes;
                } else if (typesRes.feature_types && Array.isArray(typesRes.feature_types)) {
                    allTypes = typesRes.feature_types;
                } else if (typesRes.results && Array.isArray(typesRes.results)) {
                    allTypes = typesRes.results;
                }
                // Use count from response if available, otherwise use array length
                const count = typesRes.count || allTypes.length;
                // Client-side pagination
                const offset = (page - 1) * pageSize;
                const types = allTypes.slice(offset, offset + pageSize);

                setData({ types, categories, models });
                setTotalCount(count);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [page, pageSize]);

    return { ...data, totalCount, loading, error };
}


/**
 * Optimized hook for fetching vehicle types with caching.
 * For reference data (dropdowns), uses limited results. For list pages, use pagination.
 */
export function useOptimizedVehicleTypes(page = 1, pageSize = 20, forReference = false) {
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVehicleTypes = async () => {
            setLoading(true);
            const cacheKey = forReference ? 'vehicle-types-ref' : `vehicle-types-page-${page}`;

            try {
                // Check cache first (only for reference data)
                if (forReference) {
                    const cachedData = getCachedData<any[]>(cacheKey);
                    if (cachedData) {
                        setVehicleTypes(cachedData);
                        setLoading(false);
                        return;
                    }
                }

                // Fetch from API with pagination
                const offset = forReference ? 0 : (page - 1) * pageSize;
                const limit = forReference ? 20 : pageSize;
                const response = await api.get<any>(`/vehicle-types/?limit=${limit}&offset=${offset}`);
                
                // Extract results from paginated response or use array directly
                const vehicleTypesData = Array.isArray(response) ? response : (response.results || []);
                const count = response.count || vehicleTypesData.length;
                
                if (forReference) {
                    setCachedData(cacheKey, vehicleTypesData);
                }
                setVehicleTypes(vehicleTypesData);
                setTotalCount(count);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicleTypes();
    }, [page, pageSize, forReference]);

    return { vehicleTypes, totalCount, loading, error };
}

/**
 * Optimized hook for fetching vehicle makers with caching.
 * For reference data (dropdowns), uses limited results. For list pages, use pagination.
 */
export function useOptimizedVehicleMakers(page = 1, pageSize = 20, forReference = false) {
    const [vehicleMakers, setVehicleMakers] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVehicleMakers = async () => {
            setLoading(true);
            const cacheKey = forReference ? 'vehicle-makers-ref' : `vehicle-makers-page-${page}`;

            try {
                // Check cache first (only for reference data)
                if (forReference) {
                    const cachedData = getCachedData<any[]>(cacheKey);
                    if (cachedData) {
                        setVehicleMakers(cachedData);
                        setLoading(false);
                        return;
                    }
                }

                // Fetch from API with pagination
                const offset = forReference ? 0 : (page - 1) * pageSize;
                const limit = forReference ? 20 : pageSize;
                const response = await api.get<any>(`/vehicle-makers/?limit=${limit}&offset=${offset}`);
                
                // Extract results from paginated response or use array directly
                const vehicleMakersData = Array.isArray(response) ? response : (response.results || []);
                const count = response.count || vehicleMakersData.length;
                
                if (forReference) {
                    setCachedData(cacheKey, vehicleMakersData);
                }
                setVehicleMakers(vehicleMakersData);
                setTotalCount(count);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicleMakers();
    }, [page, pageSize, forReference]);

    return { vehicleMakers, totalCount, loading, error };
}

/**
 * Optimized hook for fetching all data for the Vehicle Models page with caching.
 */
export function useOptimizedVehicleModelsPageData(page = 1, pageSize = 20) {
    const [data, setData] = useState<{
        models: VehicleModel[];
        makers: any[];
        types: any[];
    }>({
        models: [],
        makers: [],
        types: [],
    });
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            const cacheKeys = {
                makers: 'vehicle-makers-ref',
                types: 'vehicle-types-ref',
            };

            try {
                // Check cache first for reference data
                const cachedMakers = getCachedData<any[]>(cacheKeys.makers);
                const cachedTypes = getCachedData<any[]>(cacheKeys.types);

                let makers: any[] = [];
                let types: any[] = [];

                if (cachedMakers && cachedTypes) {
                    makers = cachedMakers;
                    types = cachedTypes;
                } else {
                    const [makersRes, typesRes] = await Promise.all([
                        api.get<any>('/vehicle-makers/?limit=20&offset=0'),
                        api.get<any>('/vehicle-types/?limit=20&offset=0'),
                    ]);

                    makers = Array.isArray(makersRes) ? makersRes : (makersRes.results || []);
                    types = Array.isArray(typesRes) ? typesRes : (typesRes.results || []);

                    setCachedData(cacheKeys.makers, makers);
                    setCachedData(cacheKeys.types, types);
                }

                // Fetch paginated models (main list data)
                const offset = (page - 1) * pageSize;
                const modelsRes = await api.get<any>(`/vehicle-models/?limit=${pageSize}&offset=${offset}`);
                const models = Array.isArray(modelsRes) ? modelsRes : (modelsRes.results || []);
                const count = modelsRes.count || models.length;

                setData({ models, makers, types });
                setTotalCount(count);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [page, pageSize]);

    return { ...data, totalCount, loading, error };
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
                { key: 'feature-categories-parents', url: '/feature-categories-list/' },
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
