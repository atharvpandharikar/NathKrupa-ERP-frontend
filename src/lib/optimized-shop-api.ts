// Optimized Shop API with caching and performance improvements
import { shopApi, ShopCategory, ShopBrand, CarMaker, ShopProduct, CarModel, CarVariant, shopCategoriesApi } from './shop-api';
import { dataCache, CACHE_KEYS, cacheHelpers } from './cache';

// Optimized API functions with caching
export const optimizedShopApi = {
    // Categories with smart caching
    categories: {
        async list(): Promise<ShopCategory[]> {
            return cacheHelpers.getOrFetch(
                CACHE_KEYS.CATEGORIES,
                async () => {
                    console.log('🔄 Fetching all categories from API...');
                    // Use robust listAll that handles various backend pagination formats
                    const items = await shopCategoriesApi.listAll();
                    console.log('📦 Raw categories count:', items?.length || 0);
                    return Array.isArray(items) ? items : [];
                },
                10 * 60 * 1000 // 10 minutes cache
            );
        },

        async get(id: string): Promise<ShopCategory | null> {
            const categories = await this.list();
            return categories.find(cat => cat.id === id) || null;
        },

        async create(data: Partial<ShopCategory>): Promise<ShopCategory> {
            const result = await shopApi.post<ShopCategory>('/shop-product-category-list/', data);
            cacheHelpers.invalidate(CACHE_KEYS.CATEGORIES);
            return result;
        },

        async update(id: string, data: Partial<ShopCategory>): Promise<ShopCategory> {
            const result = await shopApi.put<ShopCategory>(`/shop-product-category-list/${id}/`, data);
            cacheHelpers.invalidate(CACHE_KEYS.CATEGORIES);
            return result;
        },

        async delete(id: string): Promise<void> {
            await shopApi.del(`/shop-product-category-list/${id}/`);
            cacheHelpers.invalidate(CACHE_KEYS.CATEGORIES);
        }
    },

    // Brands with smart caching
    brands: {
        async list(): Promise<ShopBrand[]> {
            return cacheHelpers.getOrFetch(
                CACHE_KEYS.BRANDS,
                async () => {
                    console.log('🔄 Fetching brands from API...');
                    const response = await shopApi.get<any>('/shop/brands/');

                    if (Array.isArray(response)) {
                        return response as ShopBrand[];
                    } else if (Array.isArray(response?.data)) {
                        return response.data as ShopBrand[];
                    } else if (Array.isArray(response?.results)) {
                        return response.results as ShopBrand[];
                    }
                    return [];
                },
                10 * 60 * 1000 // 10 minutes cache
            );
        },

        async get(id: string): Promise<ShopBrand | null> {
            const brands = await this.list();
            return brands.find(brand => brand.id === id) || null;
        },

        async create(data: Partial<ShopBrand>): Promise<ShopBrand> {
            const result = await shopApi.post<ShopBrand>('/shop/brands/', data);
            cacheHelpers.invalidate(CACHE_KEYS.BRANDS);
            return result;
        },

        async update(id: string, data: Partial<ShopBrand>): Promise<ShopBrand> {
            const result = await shopApi.put<ShopBrand>(`/shop/brands/${id}/`, data);
            cacheHelpers.invalidate(CACHE_KEYS.BRANDS);
            return result;
        },

        async delete(id: string): Promise<void> {
            await shopApi.del(`/shop/brands/${id}/`);
            cacheHelpers.invalidate(CACHE_KEYS.BRANDS);
        }
    },

    // Car Makers with smart caching
    carMakers: {
        async list(): Promise<CarMaker[]> {
            return cacheHelpers.getOrFetch(
                CACHE_KEYS.CAR_MAKERS,
                async () => {
                    console.log('🔄 Fetching car makers from API...');
                    const response = await shopApi.get<any>('/shop/car-makers/');

                    if (Array.isArray(response)) {
                        return response as CarMaker[];
                    } else if (Array.isArray(response?.data)) {
                        return response.data as CarMaker[];
                    } else if (Array.isArray(response?.results)) {
                        return response.results as CarMaker[];
                    }
                    return [];
                },
                10 * 60 * 1000 // 10 minutes cache
            );
        },

        async get(id: string): Promise<CarMaker | null> {
            const makers = await this.list();
            return makers.find(maker => maker.id === id) || null;
        },

        async create(data: Partial<CarMaker>): Promise<CarMaker> {
            const result = await shopApi.post<CarMaker>('/shop/car-makers/', data);
            cacheHelpers.invalidate(CACHE_KEYS.CAR_MAKERS);
            return result;
        },

        async update(id: string, data: Partial<CarMaker>): Promise<CarMaker> {
            const result = await shopApi.put<CarMaker>(`/shop/car-makers/${id}/`, data);
            cacheHelpers.invalidate(CACHE_KEYS.CAR_MAKERS);
            return result;
        },

        async delete(id: string): Promise<void> {
            await shopApi.del(`/shop/car-makers/${id}/`);
            cacheHelpers.invalidate(CACHE_KEYS.CAR_MAKERS);
        }
    },

    // Products with pagination and caching
    products: {
        async list(params?: Record<string, any>): Promise<ShopProduct[]> {
            const cacheKey = `${CACHE_KEYS.PRODUCTS}_${JSON.stringify(params || {})}`;

            return cacheHelpers.getOrFetch(
                cacheKey,
                async () => {
                    console.log('🔄 Fetching products from API...');
                    const queryParams = new URLSearchParams();
                    if (params) {
                        Object.entries(params).forEach(([key, value]) => {
                            if (value !== undefined && value !== null) {
                                queryParams.append(key, value.toString());
                            }
                        });
                    }

                    const response = await shopApi.get<any>(`/shop-product-list/?${queryParams.toString()}`);
                    return response.error ? [] : response.data || [];
                },
                5 * 60 * 1000 // 5 minutes cache
            );
        },

        async get(id: string): Promise<ShopProduct | null> {
            const response = await shopApi.get<any>(`/shop-product-detailview/${id}/`);
            return response.error ? null : response.product_data?.[0];
        },

        async create(data: Partial<ShopProduct>): Promise<ShopProduct> {
            const result = await shopApi.post<any>('/shop/create/products/', data);
            cacheHelpers.invalidate(CACHE_KEYS.PRODUCTS);
            return result;
        },

        async update(id: string, data: Partial<ShopProduct>): Promise<ShopProduct> {
            const result = await shopApi.put<any>(`/shop/edit/products/${id}/`, data);
            cacheHelpers.invalidate(CACHE_KEYS.PRODUCTS);
            return result;
        },

        async delete(id: string): Promise<void> {
            await shopApi.del(`/shop/update/product/${id}/`);
            cacheHelpers.invalidate(CACHE_KEYS.PRODUCTS);
        }
    },

    // Car Models with caching
    carModels: {
        async list(makerId?: string): Promise<CarModel[]> {
            const cacheKey = `${CACHE_KEYS.CAR_MODELS}_${makerId || 'all'}`;

            return cacheHelpers.getOrFetch(
                cacheKey,
                async () => {
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
                    } else if (response?.next || response?.previous) {
                        // DRF paginated response format
                        if (Array.isArray(response?.results)) {
                            return response.results as CarModel[];
                        }
                    }
                    return [];
                },
                10 * 60 * 1000 // 10 minutes cache
            );
        },

        async get(id: string): Promise<CarModel | null> {
            const models = await this.list();
            return models.find(model => model.id === id) || null;
        },

        async create(data: Partial<CarModel>): Promise<CarModel> {
            const result = await shopApi.post<CarModel>('/shop/car-models/', data);
            // Invalidate all car_models* cache entries
            cacheHelpers.invalidatePrefix(CACHE_KEYS.CAR_MODELS);
            return result;
        },

        async update(id: string, data: Partial<CarModel>): Promise<CarModel> {
            const result = await shopApi.put<CarModel>(`/shop/car-models/${id}/`, data);
            cacheHelpers.invalidatePrefix(CACHE_KEYS.CAR_MODELS);
            return result;
        },

        async delete(id: string): Promise<void> {
            await shopApi.del(`/shop/car-models/${id}/`);
            cacheHelpers.invalidatePrefix(CACHE_KEYS.CAR_MODELS);
        }
    },

    // Car Variants with caching
    carVariants: {
        async list(modelId?: string): Promise<CarVariant[]> {
            const cacheKey = `${CACHE_KEYS.CAR_VARIANTS}_${modelId || 'all'}`;

            return cacheHelpers.getOrFetch(
                cacheKey,
                async () => {
                    console.log('🔄 Fetching car variants from API...');
                    const queryParams = modelId ? `?model=${modelId}` : '';
                    const response = await shopApi.get<any>(`/shop/car-variants/${queryParams}`);
                    console.log('📦 Raw car variants API response:', response);
                    
                    // Handle different response formats
                    if (Array.isArray(response)) {
                        return response as CarVariant[];
                    } else if (response?.data && Array.isArray(response.data)) {
                        return response.data as CarVariant[];
                    } else if (response?.results && Array.isArray(response.results)) {
                        return response.results as CarVariant[];
                    }
                    console.warn('⚠️ Unexpected car variants response format:', response);
                    return [];
                },
                10 * 60 * 1000 // 10 minutes cache
            );
        },

        async get(id: string): Promise<CarVariant | null> {
            const variants = await this.list();
            return variants.find(variant => variant.id === id) || null;
        }
    }
};

// Utility function to preload critical data
export const preloadCriticalData = async () => {
    console.log('🚀 Preloading critical data...');
    const startTime = Date.now();

    try {
        // Load all critical data in parallel
        await Promise.all([
            optimizedShopApi.categories.list(),
            optimizedShopApi.brands.list(),
            optimizedShopApi.carMakers.list(),
        ]);

        const loadTime = Date.now() - startTime;
        console.log(`✅ Critical data preloaded in ${loadTime}ms`);
    } catch (error) {
        console.error('❌ Error preloading critical data:', error);
    }
};

export default optimizedShopApi;
