// Shop API Integration for Manufacturing App
// This service provides access to shop APIs from the manufacturing app

// Environment detection for API URLs
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

export const SHOP_API_ROOT = isProduction
    ? "https://pg.nathkrupabody.com"  // Always use HTTPS in production
    : "http://127.0.0.1:8000";

const SHOP_BASE = `${SHOP_API_ROOT}/api/shop`;

// Token management (reuse existing token system)
const TOKEN_KEY = "nk:tokens";

export function getTokens(): { access: string; refresh: string; activeOrganizationId?: number } | null {
    try {
        const raw = localStorage.getItem(TOKEN_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

// Auth headers helper
export function authHeaders(): HeadersInit {
    const t = getTokens();
    const headers: Record<string, string> = {};
    if (t?.access) headers.Authorization = `Bearer ${t.access}`;
    // Add organization context if available (multi-tenancy)
    // Check multiple sources in order of preference
    const orgId = t?.activeOrganizationId ||
        localStorage.getItem('nk:activeOrganizationId') ||
        localStorage.getItem('dev_organization_id');
    if (orgId) {
        headers['X-Organization-ID'] = String(orgId);
        console.log('🏢 Sending organization header:', orgId);
    } else {
        console.warn('⚠️ No organization ID found in tokens or localStorage');
    }
    return headers;
}

// Request helper
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const baseHeaderInit = options.body instanceof FormData ? undefined : { "Content-Type": "application/json" };
    const headers = new Headers(baseHeaderInit);

    // Add auth headers
    const auth = authHeaders();
    Object.entries(auth).forEach(([key, value]) => headers.set(key, value));

    // Add custom headers
    if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => headers.set(key, value));
    }

    const res = await fetch(`${SHOP_BASE}${path}`, {
        ...options,
        headers,
        credentials: "omit",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
    }

    return res.status === 204 ? (undefined as unknown as T) : res.json();
}
// Helper to fetch all paginated results (supports array, {data: []}, {results: [], next})
async function fetchAll<T>(basePath: string, pageSize = 100): Promise<T[]> {
    const all: T[] = [];

    // Try different pagination strategies
    const strategies = [
        { pageParam: 'page', sizeParam: 'page_size' },
        { pageParam: 'p', sizeParam: 'size' },
        { pageParam: 'offset', sizeParam: 'limit' },
        { pageParam: 'page', sizeParam: 'per_page' }
    ];

    for (const strategy of strategies) {
        let currentPage = 1;
        const strategyResults: T[] = [];

        for (let i = 0; i < 50; i++) { // Reduced max pages per strategy
            const sep = basePath.includes('?') ? '&' : '?';
            const path = `${basePath}${sep}${strategy.pageParam}=${currentPage}&${strategy.sizeParam}=${pageSize}`;

            try {
                const res: any = await shopApi.get<any>(path);

                let items: T[] = [];
                if (Array.isArray(res)) {
                    items = res as T[];
                } else if (Array.isArray(res?.data)) {
                    items = res.data as T[];
                } else if (Array.isArray(res?.results)) {
                    items = res.results as T[];
                } else {
                    items = [];
                }

                strategyResults.push(...items);

                // Check if we should continue
                const hasNext = Boolean(res?.next) || Boolean(res?.has_next) || items.length === pageSize;

                if (!hasNext || items.length === 0) break;
                currentPage += 1;
            } catch (error) {
                break;
            }
        }

        if (strategyResults.length > all.length) {
            all.splice(0, all.length, ...strategyResults);
        }

        // If we got a good result, use it
        if (strategyResults.length > 50) {
            break;
        }
    }

    return all;
}

// Core Shop API
export const shopApi = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
    postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
    putForm: <T>(path: string, form: FormData) => request<T>(path, { method: "PUT", body: form }),
};

// Type definitions
export interface ShopProduct {
    product_id: string;
    title: string;
    description?: string;
    price: number;
    purchase_price?: number;
    discounted_price?: number;
    discount_percentage?: number;
    discount_amount?: number;
    rating?: number;
    lead_time?: number;
    stock: number;
    is_available?: boolean;
    bulk_order_available?: boolean;
    is_active: boolean;
    taxes?: number;
    is_cod?: boolean;
    hsn_code?: string;
    barcode?: string;
    image?: string;
    category?: {
        id: string;
        title: string;
        ref_name: string;
    };
    brand?: {
        id: string;
        name: string;
        logo?: string;
    };
    tags?: Array<{
        id: string;
        name: string;
        ref_name: string;
    }>;
    created_at?: string;
    updated_at?: string;
}

export interface ProductListSummary {
    total: number;
    active: number;
    inactive: number;
    low_stock: number;
}

export interface ShopCategory {
    id: string;
    ref_name: string;
    title: string;
    slug?: string;
    category_icon?: string;
    parent?: ShopCategory | string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
    product_count?: number;
    displayTitle?: string;
    children_count?: number;
}

export interface ShopOrder {
    id: string;
    order_number: string;
    customer: {
        id: string;
        name: string;
        email: string;
        phone: string;
    };
    total_amount: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    created_at: string;
    updated_at: string;
    items: Array<{
        id: string;
        product: ShopProduct;
        quantity: number;
        price: number;
        total: number;
    }>;
}

export interface ShopBrand {
    id: string;
    name: string;
    slug?: string;
    logo?: string;
    description?: string;
    product_count?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CarMaker {
    id: string;
    name: string;
    slug?: string;
    image?: string;
    vin_url?: string;
    oem_url?: string;
    is_featured?: boolean;
    is_popular?: boolean;
    sort?: number;
    discount_percent?: number;
    discount_description?: string;
    model_count?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CarModel {
    id: string;
    name: string;
    slug?: string;
    image?: string;
    car_maker: CarMaker;
    car_maker_id?: string;
    created_at: string;
}

export interface CarVariant {
    id: string;
    name: string;
    slug?: string;
    model: CarModel;
    car_maker?: CarMaker;
    car_maker_id?: string;
    model_id?: string;
    year_start?: number;
    year_end?: number;
    engine_liters?: number;
    engine_type?: string;
    engine_power?: number;
    motor_power?: number;
    fuel_engine?: string;
    body_type?: string;
    vehicle_type?: string;
    image?: string;
    oem_url?: string;
    is_active?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface ShopTag {
    id: string;
    name: string;
    ref_name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ShopAddress {
    id: string;
    customer: {
        id: string;
        name: string;
        email: string;
    };
    first_name: string;
    last_name: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone?: string;
    email?: string;
    address_type?: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface ShopReview {
    id: string;
    customer: {
        id: string;
        name: string;
    };
    product: ShopProduct;
    rating: number;
    comment?: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export interface ShopQuotation {
    id: string;
    quotation_number: string;
    customer: {
        id: string;
        name: string;
        email: string;
        phone: string;
    };
    vehicle_maker?: CarMaker;
    vehicle_model?: CarModel;
    vehicle_variant?: CarVariant;
    vehicle_year?: number;
    total_amount: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
    created_at: string;
    updated_at: string;
    items: Array<{
        id: string;
        product: ShopProduct;
        quantity: number;
        price: number;
        total: number;
    }>;
}

// Specialized API functions
export const shopProductsApi = {
    list: async (params?: Record<string, any>): Promise<ShopProduct[]> => {
        const queryParams = new URLSearchParams();
        const defaults: Record<string, any> = {
            ordering: '-id',
        };

        const combined = { ...defaults, ...(params || {}) };
        Object.entries(combined).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value.toString());
            }
        });

        const url = `/shop-product-list/?${queryParams.toString()}`;

        // First, try to get all products at once (the endpoint returns all items by default)
        try {
            const response = await shopApi.get<any>(url);

            // Handle the response format: {error: False, count: X, data: []}
            if (response && !response.error && Array.isArray(response.data)) {
                console.log(`✅ Fetched ${response.data.length} products (total count: ${response.count || response.data.length})`);
                return response.data as ShopProduct[];
            }

            // Fallback: if response is an array directly
            if (Array.isArray(response)) {
                console.log(`✅ Fetched ${response.length} products (direct array)`);
                return response as ShopProduct[];
            }
        } catch (error) {
            console.warn('⚠️ Direct fetch failed, trying pagination:', error);
        }

        // Fallback to pagination if direct fetch doesn't work
        console.log('🔄 Falling back to pagination...');
        return fetchAll<ShopProduct>(url);
    },

    // New method for paginated list that returns both data and count
    listPaginated: async (params?: Record<string, any>): Promise<{ data: ShopProduct[]; count: number; summary?: ProductListSummary }> => {
        const queryParams = new URLSearchParams();
        const defaults: Record<string, any> = {
            ordering: '-id',
        };

        const combined = { ...defaults, ...(params || {}) };
        Object.entries(combined).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value.toString());
            }
        });

        const url = `/shop-product-list/?${queryParams.toString()}`;

        console.log('🔍 [FRONTEND DEBUG] API Request:', { url, params: combined });

        try {
            // Backend returns: { error: False, count: number, data: ShopProduct[], summary: {...} }
            const response = await shopApi.get<any>(url);

            // Primary response format: { error: False, count: number, data: [], summary: {} }
            if (response && !response.error && typeof response.count === 'number' && Array.isArray(response.data)) {
                return { data: response.data as ShopProduct[], count: response.count, summary: response.summary };
            }

            // Fallback: DRF standard pagination format { count, next, previous, results }
            if (response && typeof response.count === 'number' && Array.isArray(response.results)) {
                return { data: response.results as ShopProduct[], count: response.count, summary: response.summary };
            }

            // Fallback: Direct array response
            if (Array.isArray(response)) {
                return { data: response as ShopProduct[], count: response.length };
            }

            console.error('❌ Unexpected response format:', response);
            throw new Error(`Unexpected response format from product list endpoint.`);
        } catch (error) {
            console.error('⚠️ Error fetching paginated products:', error);
            throw error;
        }
    },

    get: async (productId: string) => {
        const response = await shopApi.get<any>(`/shop-product-detailview/${productId}/`);
        return response.error ? null : response.product_data?.[0];
    },

    create: (data: Partial<ShopProduct>) => shopApi.post<any>('/shop/create/products/', data),

    update: (productId: string, data: Partial<ShopProduct>) =>
        shopApi.put<any>(`/shop/edit/products/${productId}/`, data),

    delete: (productId: string) => shopApi.del(`/shop/update/product/${productId}/`),

    search: async (query: string) => {
        const response = await shopApi.get<any>(`/search-parts/?search=${encodeURIComponent(query)}`);
        return response.error ? [] : response.data || [];
    },

    searchTypesense: async (query: string, params?: { limit?: number; page?: number; filter_by?: string }) => {
        if (!query.trim()) {
            return { error: false, data: [], count: 0, search_time_ms: 0 };
        }
        const searchParams = new URLSearchParams({ q: query.trim() });
        if (params?.limit) searchParams.append('per_page', params.limit.toString());
        if (params?.page) searchParams.append('page', params.page.toString());
        if (params?.filter_by) searchParams.append('filter_by', params.filter_by);
        const response = await shopApi.get<any>(`/shop/typesense-search/?${searchParams.toString()}`);
        return response;
    },

    exportProducts: async (params: {
        format: 'excel' | 'pdf';
        vendor_id?: string;
        category_id?: string;
        start_date?: string;
        end_date?: string;
    }) => {
        const response = await shopApi.post<any>('/export-products/', params);
        return response;
    },

    getExportStatus: async (taskId: string) => {
        const response = await shopApi.get<any>(`/export-products/${taskId}/`);
        return response;
    },

    getExportHistory: async (params?: {
        status?: string;
        format?: string;
        limit?: number;
        offset?: number;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.format) queryParams.append('format', params.format);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());

        const queryString = queryParams.toString();
        const url = `/export-history/${queryString ? `?${queryString}` : ''}`;
        const response = await shopApi.get<any>(url);
        return response;
    },
};

export const shopCategoriesApi = {
    list: async () => {
        const response = await shopApi.get<any>('/shop-product-category-list/');
        console.log('Categories list response:', response);
        // Backend sometimes wraps data; normalize
        if (Array.isArray(response)) return response as ShopCategory[];
        if (Array.isArray(response?.data)) return response.data as ShopCategory[];
        return [];
    },

    listAll: async () => {
        try {
            // Try multiple approaches to get all categories
            const approaches = [
                // Approach 1: Very large page size
                () => shopApi.get<any>('/shop-product-category-list/?page_size=2000'),
                // Approach 2: No pagination parameters
                () => shopApi.get<any>('/shop-product-category-list/'),
                // Approach 3: Different pagination format
                () => shopApi.get<any>('/shop-product-category-list/?limit=2000'),
                // Approach 4: Offset-based pagination
                () => shopApi.get<any>('/shop-product-category-list/?offset=0&limit=2000'),
                // Approach 5: Try different endpoint
                () => shopApi.get<any>('/api/shop/shop-product-category-list/'),
                // Approach 6: Try with different base
                () => shopApi.get<any>('/shop/categories/'),
                // Approach 7: Try with all parameter
                () => shopApi.get<any>('/shop-product-category-list/?all=true'),
            ];

            let bestResult: ShopCategory[] = [];
            let bestCount = 0;

            for (let i = 0; i < approaches.length; i++) {
                try {
                    const response = await approaches[i]();

                    let items: ShopCategory[] = [];
                    if (Array.isArray(response)) {
                        items = response as ShopCategory[];
                    } else if (Array.isArray(response?.data)) {
                        items = response.data as ShopCategory[];
                    } else if (Array.isArray(response?.results)) {
                        items = response.results as ShopCategory[];
                    }

                    if (items.length > bestCount) {
                        bestCount = items.length;
                        bestResult = items;
                    }

                    // If we got a good result, use it
                    if (items.length > 500) {
                        return items;
                    }
                } catch (error) {
                    // Continue to next approach
                }
            }

            // If no single approach worked well, try pagination
            if (bestCount < 200) {
                const paginatedResult = await fetchAll<ShopCategory>('/shop-product-category-list/');
                if (paginatedResult.length > bestCount) {
                    return paginatedResult;
                }
            }

            return bestResult;
        } catch (error) {
            console.error('Error in listAll:', error);
            // Fallback to regular list
            return shopCategoriesApi.list();
        }
    },

    get: (id: string) => shopApi.get<ShopCategory>(`/shop-product-category-list/${id}/`),

    create: (data: Partial<ShopCategory>) => shopApi.post<ShopCategory>('/shop-product-category-list/', data),

    update: (id: string, data: Partial<ShopCategory>) =>
        shopApi.put<ShopCategory>(`/shop-product-category-list/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop-product-category-list/${id}/`),
};

export const shopOrdersApi = {
    list: async (params?: Record<string, any>) => {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value.toString());
                }
            });
        }

        const response = await shopApi.get<any>(`/shop/admin-order-list/?${queryParams.toString()}`);
        return response.error ? [] : response.data || [];
    },

    get: (id: string) => shopApi.get<ShopOrder>(`/shop/order-detail/${id}/`),

    updateStatus: (id: string, status: string) =>
        shopApi.patch<any>(`/shop/order-detail/${id}/`, { status }),
};

export const shopBrandsApi = {
    list: async () => {
        try {
            const response = await shopApi.get<any>('/shop/brands/');

            // Handle different response formats
            if (Array.isArray(response)) {
                return response as ShopBrand[];
            } else if (Array.isArray(response?.data)) {
                return response.data as ShopBrand[];
            } else if (Array.isArray(response?.results)) {
                return response.results as ShopBrand[];
            } else {
                console.warn('Unexpected brands response format:', response);
                return [];
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
            return [];
        }
    },

    listAll: async () => {
        try {
            // First try with pagination
            const paginatedResult = await fetchAll<ShopBrand>('/shop/brands/');

            // If we got less than 100 items, the API might not support pagination
            // Try a direct call with a large page size
            if (paginatedResult.length < 100) {
                const directResponse = await shopApi.get<any>('/shop/brands/?page_size=1000');

                let directItems: ShopBrand[] = [];
                if (Array.isArray(directResponse)) {
                    directItems = directResponse as ShopBrand[];
                } else if (Array.isArray(directResponse?.data)) {
                    directItems = directResponse.data as ShopBrand[];
                } else if (Array.isArray(directResponse?.results)) {
                    directItems = directResponse.results as ShopBrand[];
                }

                if (directItems.length > paginatedResult.length) {
                    return directItems;
                }
            }

            return paginatedResult;
        } catch (error) {
            console.error('Error in brands listAll:', error);
            // Fallback to regular list
            return shopBrandsApi.list();
        }
    },

    get: (id: string) => shopApi.get<ShopBrand>(`/shop/brands/${id}/`),

    create: (data: Partial<ShopBrand>) => shopApi.post<ShopBrand>('/shop/brands/', data),

    update: (id: string, data: Partial<ShopBrand>) =>
        shopApi.put<ShopBrand>(`/shop/brands/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop/brands/${id}/`),
};

export const carMakersApi = {
    list: async () => {
        try {
            const response = await shopApi.get<any>('/shop/car-makers/');

            // Handle different response formats
            if (Array.isArray(response)) {
                return response as CarMaker[];
            } else if (Array.isArray(response?.data)) {
                return response.data as CarMaker[];
            } else if (Array.isArray(response?.results)) {
                return response.results as CarMaker[];
            } else {
                console.warn('Unexpected car makers response format:', response);
                return [];
            }
        } catch (error) {
            console.error('Error fetching car makers:', error);
            return [];
        }
    },

    get: (id: string) => shopApi.get<CarMaker>(`/shop/car-makers/${id}/`),

    create: (data: Partial<CarMaker>) => shopApi.post<CarMaker>('/shop/car-makers/', data),

    update: (id: string, data: Partial<CarMaker>) =>
        shopApi.put<CarMaker>(`/shop/car-makers/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop/car-makers/${id}/`),
};

export const carModelsApi = {
    list: async (makerId?: string) => {
        const queryParams = makerId ? `?car_maker=${makerId}` : '';
        // Django REST Framework requires trailing slash
        const url = `/shop/car-models/${queryParams}`;
        const response = await shopApi.get<any>(url);

        // Check for error response first
        if (response?.error === true) {
            return [];
        }

        // Handle different response formats
        if (Array.isArray(response)) {
            return response as CarModel[];
        } else if (response?.data && Array.isArray(response.data)) {
            return response.data as CarModel[];
        } else if (response?.results && Array.isArray(response.results)) {
            return response.results as CarModel[];
        }
        return [];
    },

    get: (id: string) => shopApi.get<CarModel>(`/shop/car-models/${id}/`),

    create: (data: Partial<CarModel>) => shopApi.post<CarModel>('/shop/car-models/', data),

    update: (id: string, data: Partial<CarModel>) =>
        shopApi.put<CarModel>(`/shop/car-models/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop/car-models/${id}/`),
};

export const carVariantsApi = {
    list: async (modelId?: string) => {
        const queryParams = modelId ? `?model=${modelId}` : '';
        const response = await shopApi.get<any>(`/shop/car-variants/${queryParams}`);
        console.log('📦 Car variants API response:', response);
        // Handle different response formats
        if (Array.isArray(response)) {
            return response;
        } else if (response?.data && Array.isArray(response.data)) {
            return response.data;
        } else if (response?.results && Array.isArray(response.results)) {
            return response.results;
        }
        console.warn('⚠️ Unexpected car variants response format:', response);
        return [];
    },

    get: (id: string) => shopApi.get<CarVariant>(`/shop/car-variants-crud/${id}/`),

    create: (data: Partial<CarVariant>) => shopApi.post<CarVariant>('/shop/car-variants-crud/', data),

    update: (id: string, data: Partial<CarVariant>) =>
        shopApi.put<CarVariant>(`/shop/car-variants-crud/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop/car-variants-crud/${id}/`),
};

export const shopTagsApi = {
    list: async () => {
        const response = await shopApi.get<ShopTag[]>('/shop-product-tag-list/');
        return Array.isArray(response) ? response : [];
    },

    get: (id: string) => shopApi.get<ShopTag>(`/shop-product-tag-list/${id}/`),

    create: (data: Partial<ShopTag>) => shopApi.post<ShopTag>('/shop-product-tag-list/', data),

    update: (id: string, data: Partial<ShopTag>) =>
        shopApi.put<ShopTag>(`/shop-product-tag-list/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop-product-tag-list/${id}/`),
};

export const shopAddressesApi = {
    list: async () => {
        const response = await shopApi.get<ShopAddress[]>('/shop/addresses/');
        return Array.isArray(response) ? response : [];
    },

    get: (id: string) => shopApi.get<ShopAddress>(`/shop/addresses/${id}/`),

    create: (data: Partial<ShopAddress>) => shopApi.post<ShopAddress>('/shop/addresses/', data),

    update: (id: string, data: Partial<ShopAddress>) =>
        shopApi.put<ShopAddress>(`/shop/addresses/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop/addresses/${id}/`),
};

export const shopReviewsApi = {
    list: async (params?: Record<string, any>) => {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value.toString());
                }
            });
        }

        const response = await shopApi.get<any>(`/shop/reviews/?${queryParams.toString()}`);
        return response.error ? [] : response.data || [];
    },

    get: (id: string) => shopApi.get<ShopReview>(`/shop/reviews/${id}/`),

    update: (id: string, data: Partial<ShopReview>) =>
        shopApi.put<ShopReview>(`/shop/reviews/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop/reviews/${id}/`),
};

export const shopQuotationsApi = {
    list: async (params?: Record<string, any>) => {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value.toString());
                }
            });
        }

        const response = await shopApi.get<any>(`/shop/generate-quotation-shop/?${queryParams.toString()}`);
        return response.error ? [] : response.data || [];
    },

    get: (id: string) => shopApi.get<ShopQuotation>(`/shop/generate-quotation-shop/${id}/`),

    create: (data: Partial<ShopQuotation>) =>
        shopApi.post<ShopQuotation>('/shop/generate-quotation-shop/', data),

    update: (id: string, data: Partial<ShopQuotation>) =>
        shopApi.put<ShopQuotation>(`/shop/generate-quotation-shop/${id}/`, data),

    delete: (id: string) => shopApi.del(`/shop/generate-quotation-shop/${id}/`),

    sendWhatsapp: (quotation_no: string) =>
        shopApi.post<{ error: boolean; data: { message: string; message_id?: string } }>(
            `/shop/generate-quotation-shop/send_whatsapp/?quotation_no=${quotation_no}`,
            {}
        ),
};

// Export all APIs
export const shopApis = {
    products: shopProductsApi,
    categories: shopCategoriesApi,
    orders: shopOrdersApi,
    brands: shopBrandsApi,
    carMakers: carMakersApi,
    carModels: carModelsApi,
    carVariants: carVariantsApi,
    tags: shopTagsApi,
    addresses: shopAddressesApi,
    reviews: shopReviewsApi,
    quotations: shopQuotationsApi,
};

export default shopApis;
