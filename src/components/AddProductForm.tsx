import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { getTokens, clearTokens, API_ROOT } from '@/lib/api';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { shopCategoriesApi, ShopCategory } from '@/lib/shop-api';

// Product form data interface matching shop app
interface ProductFormData {
    title: string;
    description?: string;
    price?: number;
    purchase_price: number;
    discount_amount?: number;
    rating?: number;
    lead_time?: number;
    stock?: number;
    is_available?: boolean;
    bulk_order_available?: boolean;
    is_active?: boolean;
    taxes?: number;
    is_cod?: boolean;
    hsn_code?: string;
    barcode?: string;
    category_id?: string | number;
    category?: { id: string | number };
    tags?: Array<{ id: string | number } | string | number>;
    brand_id?: string | number;
    imageFile?: File;
    additionalImages?: File[];
    // Vehicle compatibility fields
    compatibility_group_id?: string | number;
    compatible_variants?: string[];
}

// Product interface matching shop app
interface Product {
    product_id: string;
    hsn_code?: string;
    seller?: {
        seller_id: string;
        company_name: string;
    };
    brand?: {
        id: string;
        name?: string;
        logo?: string;
    };
    barcode?: string;
    title: string;
    description?: string;
    tags?: Array<{
        id: string;
        name: string;
        ref_name: string;
    }>;
    price: number;
    discounted_price?: number;
    discount_percentage?: number;
    discount_amount?: number;
    rating?: number;
    lead_time?: number;
    category?: {
        id: string;
        title: string;
        ref_name: string;
    };
    image: string;
    stock: number;
    is_available?: boolean;
    bulk_order_available?: boolean;
    is_active: boolean;
    taxes?: number;
    is_cod?: boolean;
    price_inclusive_tax?: number;
    starting_price?: string;
    created_at?: string;
    updated_at?: string;
}

// Using ShopCategory from shop-api instead of local Category interface

// Brand interface matching shop app
interface ProductBrand {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    product_count?: number;
}

// Vehicle compatibility interfaces
interface CarMaker {
    id: string;
    name: string;
    slug: string;
    image?: string;
    vin_url?: string;
    oem_url?: string;
    is_featured: boolean;
    is_popular: boolean;
    sort: number;
    discount_percent: number;
    discount_description?: string;
    created_at: string;
}

interface CarModel {
    id: string;
    name: string;
    slug: string;
    image?: string;
    car_maker: string;
    created_at: string;
}

interface CarVariant {
    id: string;
    name: string;
    slug?: string;
    model: string;
    car_maker: string;
    engine_liters?: number;
    engine_type?: string;
    engine_power?: number;
    motor_power?: number;
    body_type?: string;
    image?: string;
    fuel_engine?: string;
    year_start?: number;
    year_end?: number;
    vehicle_type: 'transport' | 'passenger' | 'both';
    oem_url?: string;
    created_at: string;
}

interface CompatibilityGroup {
    id: string;
    name: string;
    description?: string;
    car_maker?: string;
    variants: string[];
    year_start?: number;
    year_end?: number;
    fuel_engine?: string;
    is_mapped: boolean;
    created_at: string;
    updated_at: string;
}

// Service response interface
interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, unknown>;
}

interface AddProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    onProductCreated: (product: Product) => void;
}

// Product schema matching shop app
const productSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be a positive number').optional(),
    purchase_price: z.number({ required_error: 'Purchase price is required' }).min(0, 'Purchase price must be a positive number'),
    discounted_price: z.number().min(0, 'Discounted price must be a positive number').optional(),
    discount_amount: z.number().min(0, 'Discount must be a positive number').optional(),
    stock: z.number({ required_error: 'Stock is required' }).min(0, 'Stock must be a positive number'),
    lead_time: z.number({ required_error: 'Lead time is required' }).min(1, 'Lead time must be at least 1 day').max(365, 'Lead time cannot exceed 365 days'),
    category_id: z.string().min(1, 'Category is required'),
    brand_id: z.string().optional(),
    barcode: z.string().optional(),
    hsn_code: z.string().optional(),
    taxes: z.number({ required_error: 'Tax rate is required' }).min(0, 'Tax rate must be a positive number').max(100, 'Tax rate cannot exceed 100%'),
    is_active: z.boolean().default(true),
    is_available: z.boolean().default(true),
    bulk_order_available: z.boolean().default(true),
    is_cod: z.boolean().default(true),
    // Vehicle compatibility fields
    compatibility_group_id: z.string().optional(),
    compatible_variants: z.array(z.string()).optional(),
}).refine((data) => {
    // Custom validation: ensure mutual exclusivity
    const hasGroup = data.compatibility_group_id && data.compatibility_group_id !== '';
    const hasVariants = data.compatible_variants && data.compatible_variants.length > 0;

    // Both cannot be selected at the same time
    if (hasGroup && hasVariants) {
        return false;
    }

    return true;
}, {
    message: "Cannot select both compatibility group and specific variants",
    path: ["compatibility_group_id"]
});

type ProductFormDataZod = z.infer<typeof productSchema>;

// Tax percentage options
const TAX_OPTIONS = [
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' },
];

// Helper function to build hierarchical category display with breadcrumb-style names
const buildCategoryWithBreadcrumbs = (categories: ShopCategory[]): ShopCategory[] => {
    const categoryMap = new Map<string, ShopCategory>();
    const processedCategories: ShopCategory[] = [];

    // Create a map of all categories
    categories.forEach(category => {
        categoryMap.set(category.id, { ...category });
    });

    // Function to build breadcrumb path for a category
    const buildBreadcrumbPath = (category: ShopCategory, visited = new Set<string>()): string => {
        // Prevent infinite loops
        if (visited.has(category.id)) {
            return category.title;
        }
        visited.add(category.id);

        // Check if category has a parent
        const parentId = typeof category.parent === 'string' ? category.parent : category.parent?.id;

        if (parentId) {
            const parent = categoryMap.get(parentId);
            if (parent) {
                const parentPath = buildBreadcrumbPath(parent, visited);
                return `${parentPath} > ${category.title}`;
            }
        }

        return category.title;
    };

    // Check if we have any categories with parent relationships
    const hasParentChildRelationships = categories.some(cat =>
        cat.parent && (typeof cat.parent === 'string' || cat.parent.id)
    );

    if (hasParentChildRelationships) {
        // Build categories with breadcrumb display names
        categories.forEach(category => {
            const breadcrumbTitle = buildBreadcrumbPath(category);
            processedCategories.push({
                ...category,
                displayTitle: breadcrumbTitle
            });
        });

        // Sort categories so parents appear before children
        processedCategories.sort((a, b) => {
            const aPath = a.displayTitle || a.title;
            const bPath = b.displayTitle || b.title;
            return aPath.localeCompare(bPath);
        });
    } else {
        // Fallback: Create manual breadcrumbs based on title patterns
        categories.forEach(category => {
            const title = category.title;

            // Try to detect if this could be a subcategory
            const possibleParent = categories.find(cat =>
                cat.id !== category.id &&
                title.toLowerCase().includes(cat.title.toLowerCase()) &&
                title.length > cat.title.length
            );

            if (possibleParent) {
                processedCategories.push({
                    ...category,
                    displayTitle: `${possibleParent.title} > ${title}`
                });
            } else {
                processedCategories.push({
                    ...category,
                    displayTitle: title
                });
            }
        });

        // Sort by display title
        processedCategories.sort((a, b) => {
            const aPath = a.displayTitle || a.title;
            const bPath = b.displayTitle || b.title;
            return aPath.localeCompare(bPath);
        });
    }

    return processedCategories;
};

// Helper function to convert categories to SearchableSelectOption format
const convertCategoriesToOptions = (categories: ShopCategory[]): SearchableSelectOption[] => {
    return categories.map((category) => ({
        value: String(category.id),
        label: category.displayTitle || category.title,
        searchableText: `${category.title} ${category.displayTitle || ''}`.toLowerCase()
    }));
};

export default function AddProductForm({ isOpen, onClose, onProductCreated }: AddProductFormProps) {
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);
    const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);

    // Options for selects
    const [brands, setBrands] = useState<ProductBrand[]>([]);
    const [, setCategories] = useState<ShopCategory[]>([]);
    const [breadcrumbCategories, setBreadcrumbCategories] = useState<ShopCategory[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Vehicle compatibility state
    const [carMakers, setCarMakers] = useState<CarMaker[]>([]);
    const [carModels, setCarModels] = useState<CarModel[]>([]);
    const [carVariants, setCarVariants] = useState<CarVariant[]>([]);
    const [compatibilityGroups, setCompatibilityGroups] = useState<CompatibilityGroup[]>([]);
    const [selectedCarMaker, setSelectedCarMaker] = useState<string>('');
    const [selectedCarModel, setSelectedCarModel] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<number | undefined>();
    const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [compatibilityMode, setCompatibilityMode] = useState<'none' | 'group' | 'variants'>('none');
    const [loadingCarModels, setLoadingCarModels] = useState<boolean>(false);

    const form = useForm<ProductFormDataZod>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            title: '',
            description: '',
            price: undefined,
            discounted_price: undefined,
            discount_amount: undefined,
            stock: undefined,
            lead_time: undefined,
            category_id: '',
            brand_id: 'none',
            barcode: '',
            hsn_code: '',
            taxes: 18, // Default to 18%
            is_active: true,
            is_available: true,
            bulk_order_available: true,
            is_cod: true,
            // Vehicle compatibility defaults
            compatibility_group_id: '',
            compatible_variants: [],
        },
    });

    useEffect(() => {
        if (isOpen) {
            fetchSelectOptionsOptimized();
            form.reset({
                title: '',
                description: '',
                price: undefined,
                discounted_price: undefined,
                discount_amount: undefined,
                stock: undefined,
                lead_time: undefined,
                category_id: '',
                brand_id: 'none',
                barcode: '',
                hsn_code: '',
                taxes: 18,
                is_active: true,
                is_available: true,
                bulk_order_available: true,
                is_cod: true,
                // Vehicle compatibility defaults
                compatibility_group_id: '',
                compatible_variants: [],
            });
            setImagePreview('');
            setSelectedTags([]);
            // Reset vehicle compatibility state
            setSelectedCarMaker('');
            setSelectedCarModel('');
            setSelectedYear(undefined);
            setSelectedVariants([]);
            setCarModels([]);
            setCarVariants([]);
            setCompatibilityGroups([]);
            setAvailableYears([]);
            setCompatibilityMode('none');
        }
    }, [isOpen, form]);

    // API service functions matching shop app exactly
    const fetchBrands = async (params: any = {}): Promise<ServiceResponse<any>> => {
        try {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.page_size) searchParams.append('page_size', params.page_size.toString());
            if (params.search) searchParams.append('search', params.search);
            if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

            const tokens = getTokens();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const response = await fetch(`${API_ROOT}/api/shop/shop/brands/?${searchParams.toString()}`, {
                method: 'GET',
                headers,
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('Django backend not available for brands, using mock data:', error);
            const mockBrands = [
                { id: '1', name: 'Bosch', slug: 'bosch', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', product_count: 150 },
                { id: '2', name: 'Mahindra', slug: 'mahindra', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', product_count: 89 },
            ];
            return { success: true, data: { results: mockBrands, count: mockBrands.length } };
        }
    };

    const fetchCategories = async (params: any = {}): Promise<ServiceResponse<any>> => {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page.toString());
            if (params.page_size) queryParams.append('page_size', params.page_size.toString());
            if (params.search) queryParams.append('search', params.search);
            if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

            const tokens = getTokens();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const response = await fetch(`${API_ROOT}/api/shop/shop-product-category-list/?${queryParams.toString()}`, {
                method: 'GET',
                headers,
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            const result = await response.json();
            console.log('📂 Categories API response:', result);
            if (response.ok && !result.error && result.data) {
                return { success: true, data: { results: result.data, count: result.count || 0 } };
            } else {
                console.error('❌ Categories API error:', result);
                return { success: false, message: result.message || 'Failed to fetch categories' };
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            const mockCategories = [
                { id: '1', ref_name: 'electrical', title: 'Electrical Parts', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', product_count: 45 },
                { id: '2', ref_name: 'mechanical', title: 'Mechanical Parts', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', product_count: 67 },
            ];
            return { success: true, data: { results: mockCategories, count: mockCategories.length } };
        }
    };

    const fetchTags = async (params: any = {}): Promise<ServiceResponse<any>> => {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page.toString());
            if (params.page_size) queryParams.append('page_size', params.page_size.toString());
            if (params.search) queryParams.append('search', params.search);

            const tokens = getTokens();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const response = await fetch(`${API_ROOT}/api/shop/shop-product-tag-list/?${queryParams.toString()}`, {
                method: 'GET',
                headers,
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            const result = await response.json();
            if (response.ok && !result.error && result.data) {
                return { success: true, data: { results: result.data, count: result.count || 0 } };
            } else {
                return { success: false, message: result.message || 'Failed to fetch tags' };
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            const mockTags = [
                { id: '1', name: 'Auto Parts', ref_name: 'auto_parts' },
                { id: '2', name: 'Engine', ref_name: 'engine' },
            ];
            return { success: true, data: { results: mockTags, count: mockTags.length } };
        }
    };

    // Vehicle compatibility API functions
    const fetchCarMakers = async (params: any = {}): Promise<ServiceResponse<any>> => {
        try {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.page_size) searchParams.append('page_size', params.page_size.toString());
            if (params.search) searchParams.append('search', params.search);

            const tokens = getTokens();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const response = await fetch(`${API_ROOT}/api/shop/shop/car-makers-readonly/?${searchParams.toString()}`, {
                method: 'GET',
                headers,
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('Error fetching car makers:', error);
            const mockMakers = [
                { id: '1', name: 'Mahindra', slug: 'mahindra', is_featured: true, is_popular: true, sort: 1, discount_percent: 0, created_at: '2024-01-01T00:00:00Z' },
                { id: '2', name: 'Tata', slug: 'tata', is_featured: false, is_popular: true, sort: 2, discount_percent: 0, created_at: '2024-01-01T00:00:00Z' },
            ];
            return { success: true, data: { results: mockMakers, count: mockMakers.length } };
        }
    };

    const fetchCarModels = async (carMakerId: string, params: any = {}): Promise<ServiceResponse<any>> => {
        try {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.page_size) searchParams.append('page_size', params.page_size.toString());
            if (params.search) searchParams.append('search', params.search);
            searchParams.append('maker_id', carMakerId);

            const tokens = getTokens();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const url = `${API_ROOT}/api/shop/shop/car-models-readonly/?${searchParams.toString()}`;
            console.log('🚗 Fetching car models from URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            console.log('🚗 Car models response status:', response.status);

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('🚗 Car models API error:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('🚗 Car models API response:', data);
            return { success: true, data: data };
        } catch (error) {
            console.error('Error fetching car models:', error);
            const mockModels = [
                { id: '1', name: 'Bolero', slug: 'bolero', car_maker: carMakerId, created_at: '2024-01-01T00:00:00Z' },
                { id: '2', name: 'Scorpio', slug: 'scorpio', car_maker: carMakerId, created_at: '2024-01-01T00:00:00Z' },
            ];
            console.log('🚗 Using mock car models:', mockModels);
            return { success: true, data: { data: mockModels, count: mockModels.length } };
        }
    };

    const fetchCarVariants = async (carModelId: string, year?: number, params: any = {}): Promise<ServiceResponse<any>> => {
        try {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.page_size) searchParams.append('page_size', params.page_size.toString());
            if (params.search) searchParams.append('search', params.search);
            searchParams.append('model_id', carModelId);
            if (year) searchParams.append('year', year.toString());

            const tokens = getTokens();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const response = await fetch(`${API_ROOT}/api/shop/shop/car-variants/?${searchParams.toString()}`, {
                method: 'GET',
                headers,
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('Error fetching car variants:', error);
            const mockVariants = [
                { id: '1', name: 'Bolero Maxx Pikup', slug: 'bolero-maxx-pikup', model: carModelId, car_maker: '1', year_start: 2018, year_end: 2024, vehicle_type: 'transport', created_at: '2024-01-01T00:00:00Z' },
                { id: '2', name: 'Bolero FB Pickup', slug: 'bolero-fb-pickup', model: carModelId, car_maker: '1', year_start: 2018, year_end: 2024, vehicle_type: 'transport', created_at: '2024-01-01T00:00:00Z' },
            ];
            return { success: true, data: { results: mockVariants, count: mockVariants.length } };
        }
    };

    const fetchCompatibilityGroups = async (carMakerId?: string, params: any = {}): Promise<ServiceResponse<any>> => {
        try {
            const searchParams = new URLSearchParams();
            if (params.page) searchParams.append('page', params.page.toString());
            if (params.page_size) searchParams.append('page_size', params.page_size.toString());
            if (params.search) searchParams.append('search', params.search);
            if (carMakerId) searchParams.append('car_maker', carMakerId);

            const tokens = getTokens();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const response = await fetch(`${API_ROOT}/api/shop/shop/compatibility-groups/?${searchParams.toString()}`, {
                method: 'GET',
                headers,
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('Error fetching compatibility groups:', error);
            const mockGroups = [
                { id: '1', name: 'Mahindra Bolero Pickup Front Glass (2018-2024)', description: 'Front windshield compatible across Bolero pickup variants', car_maker: carMakerId, variants: ['1', '2'], year_start: 2018, year_end: 2024, is_mapped: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
            ];
            return { success: true, data: { results: mockGroups, count: mockGroups.length } };
        }
    };

    const fetchVehicleData = async () => {
        try {
            console.log('🚗 Fetching vehicle data...');
            const [carMakersResult, compatibilityGroupsResult] = await Promise.all([
                fetchCarMakers({ page_size: 100 }),
                fetchCompatibilityGroups(undefined, { page_size: 100 })
            ]);

            console.log('🚗 Car makers result:', carMakersResult);
            console.log('🚗 Compatibility groups result:', compatibilityGroupsResult);

            if (carMakersResult.success && carMakersResult.data) {
                // Handle both data structures: data.results or data.data
                const carMakers = carMakersResult.data.results || carMakersResult.data.data || [];
                setCarMakers(carMakers);
                console.log('🚗 Set car makers:', carMakers);
            }
            if (compatibilityGroupsResult.success && compatibilityGroupsResult.data) {
                // Handle both data structures: data.results or data.data
                const compatibilityGroups = compatibilityGroupsResult.data.results || compatibilityGroupsResult.data.data || [];
                setCompatibilityGroups(compatibilityGroups);
                console.log('🚗 Set compatibility groups:', compatibilityGroups);
            }
        } catch (error) {
            console.error('Error fetching vehicle data:', error);
        }
    };

    const handleCarMakerChange = async (makerId: string) => {
        try {
            console.log('🚗 Car maker changed to:', makerId);
            setSelectedCarMaker(makerId);
            setSelectedCarModel('');
            setSelectedYear(undefined);
            setSelectedVariants([]);
            setCarModels([]);
            setCarVariants([]);
            setAvailableYears([]);
            setLoadingCarModels(true);

            if (makerId) {
                console.log('🚗 Fetching models for maker:', makerId);
                console.log('🚗 Current carModels state before fetch:', carModels);

                const [modelsResult, groupsResult] = await Promise.all([
                    fetchCarModels(makerId, { page_size: 100 }),
                    fetchCompatibilityGroups(makerId, { page_size: 100 })
                ]);

                console.log('🚗 Models result:', modelsResult);
                console.log('🚗 Groups result:', groupsResult);

                if (modelsResult.success && modelsResult.data) {
                    const carModels = modelsResult.data.results || modelsResult.data.data || [];
                    console.log('🚗 Setting car models:', carModels);
                    setCarModels(carModels);
                    console.log('🚗 Car models set, new state should be:', carModels);
                } else {
                    console.log('🚗 Failed to fetch car models:', modelsResult);
                }

                if (groupsResult.success && groupsResult.data) {
                    const compatibilityGroups = groupsResult.data.results || groupsResult.data.data || [];
                    console.log('🚗 Setting compatibility groups:', compatibilityGroups);
                    setCompatibilityGroups(compatibilityGroups);
                } else {
                    console.log('🚗 Failed to fetch compatibility groups:', groupsResult);
                }
            }
        } catch (error) {
            console.error('Error in handleCarMakerChange:', error);
        } finally {
            setLoadingCarModels(false);
        }
    };

    const handleCarModelChange = async (modelId: string) => {
        try {
            console.log('🚗 Car model changed to:', modelId);
            setSelectedCarModel(modelId);
            setSelectedYear(undefined);
            setSelectedVariants([]);
            setCarVariants([]);
            setAvailableYears([]);

            if (modelId) {
                console.log('🚗 Fetching variants for model:', modelId);
                const variantsResult = await fetchCarVariants(modelId, undefined, { page_size: 100 });

                console.log('🚗 Variants result:', variantsResult);
                if (variantsResult.success && variantsResult.data) {
                    const variants = variantsResult.data.results || variantsResult.data.data || [];
                    console.log('🚗 Setting car variants:', variants);
                    setCarVariants(variants);

                    // Extract unique years from variants
                    const years = new Set<number>();
                    variants.forEach((variant: CarVariant) => {
                        if (variant.year_start) years.add(variant.year_start);
                        if (variant.year_end) years.add(variant.year_end);
                    });
                    const yearsArray = Array.from(years).sort((a, b) => b - a);
                    console.log('🚗 Setting available years:', yearsArray);
                    setAvailableYears(yearsArray);
                }
            }
        } catch (error) {
            console.error('Error in handleCarModelChange:', error);
        }
    };

    const handleYearChange = async (year: number) => {
        setSelectedYear(year);
        setSelectedVariants([]);

        if (selectedCarModel && year) {
            try {
                const variantsResult = await fetchCarVariants(selectedCarModel, year, { page_size: 100 });
                if (variantsResult.success && variantsResult.data) {
                    const variants = variantsResult.data.results || variantsResult.data.data || [];
                    setCarVariants(variants);
                }
            } catch (error) {
                console.error('Error fetching car variants by year:', error);
            }
        }
    };

    const handleVariantToggle = (variantId: string) => {
        setSelectedVariants(prev => {
            const newVariants = prev.includes(variantId)
                ? prev.filter(id => id !== variantId)
                : [...prev, variantId];

            // Update form field
            form.setValue('compatible_variants', newVariants);
            return newVariants;
        });
    };

    const fetchSelectOptionsOptimized = async () => {
        try {
            // Check if user is authenticated before making API calls
            const tokens = getTokens();
            if (!tokens?.access) {
                console.log('No authentication token found, redirecting to login...');
                clearTokens();
                window.location.href = '/login';
                return;
            }

            console.log('🚀 Loading form options with optimizations...');

            // Load essential data first with smaller page sizes
            const [brandsResult, categoriesResult, tagsResult] = await Promise.all([
                fetchBrands({ page_size: 50 }), // Reduced page size
                shopCategoriesApi.list(), // Use regular list instead of listAll
                fetchTags({ page_size: 50 }) // Reduced page size
            ]);

            if (brandsResult.success && brandsResult.data) {
                const brands = brandsResult.data.results || brandsResult.data.data || [];
                setBrands(brands);
            }

            // Handle categories from shopCategoriesApi.listAll()
            if (Array.isArray(categoriesResult)) {
                console.log('📂 Loaded categories:', categoriesResult.length, 'items');
                setCategories(categoriesResult);
                // Build breadcrumb categories
                const breadcrumbCats = buildCategoryWithBreadcrumbs(categoriesResult);
                console.log('🍞 Built breadcrumb categories:', breadcrumbCats.length, 'items');
                setBreadcrumbCategories(breadcrumbCats);
            } else {
                console.error('❌ Failed to load categories:', categoriesResult);
            }
            if (tagsResult.success && tagsResult.data) {
                const tags = tagsResult.data.results || tagsResult.data.data || [];
                setTags(tags);
                console.log('✅ Tags loaded:', tags.length);
            }

            console.log('✅ Essential form options loaded successfully');

            // Load vehicle data in background (non-blocking)
            fetchVehicleDataBackground();
        } catch (error) {
            console.error('Error fetching select options:', error);
            // If it's an authentication error, the individual functions will handle redirect
        }
    };

    const fetchVehicleDataBackground = async () => {
        try {
            console.log('🚗 Loading vehicle data in background...');
            const [carMakersResult, compatibilityGroupsResult] = await Promise.all([
                fetchCarMakers({ page_size: 50 }), // Reduced page size
                fetchCompatibilityGroups(undefined, { page_size: 50 }) // Reduced page size
            ]);

            if (carMakersResult.success && carMakersResult.data) {
                const carMakers = carMakersResult.data.results || carMakersResult.data.data || [];
                setCarMakers(carMakers);
                console.log('✅ Car makers loaded:', carMakers.length);
            }
            if (compatibilityGroupsResult.success && compatibilityGroupsResult.data) {
                const compatibilityGroups = compatibilityGroupsResult.data.results || compatibilityGroupsResult.data.data || [];
                setCompatibilityGroups(compatibilityGroups);
                console.log('✅ Compatibility groups loaded:', compatibilityGroups.length);
            }
        } catch (error) {
            console.error('Error fetching vehicle data:', error);
        }
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('Image size must be less than 5MB');
                return;
            }

            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview('');
    };

    const handleAdditionalImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const fileArray = Array.from(files);
            const newImages = [...additionalImages, ...fileArray];
            setAdditionalImages(newImages);

            // Create previews for new images
            const newPreviews: string[] = [];
            fileArray.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        newPreviews.push(e.target.result as string);
                        if (newPreviews.length === fileArray.length) {
                            setAdditionalImagePreviews(prev => [...prev, ...newPreviews]);
                        }
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeAdditionalImage = (index: number) => {
        const newImages = additionalImages.filter((_, i) => i !== index);
        const newPreviews = additionalImagePreviews.filter((_, i) => i !== index);
        setAdditionalImages(newImages);
        setAdditionalImagePreviews(newPreviews);
    };

    const onSubmit = async (data: ProductFormDataZod) => {
        try {
            setLoading(true);
            console.log('🔧 Form submission started with data:', data);

            // Prepare main and additional images
            let mainImageFile = imageFile;
            let remainingAdditionalImages = [...additionalImages];
            if (!mainImageFile && remainingAdditionalImages.length > 0) {
                // Promote first additional image to main
                mainImageFile = remainingAdditionalImages[0];
                remainingAdditionalImages = remainingAdditionalImages.slice(1);
                if (!imagePreview && additionalImagePreviews[0]) {
                    setImagePreview(additionalImagePreviews[0]);
                }
            }

            // Find full tag objects from selectedTags
            const fullTags = selectedTags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? { id: tag.id, name: tag.name, ref_name: tag.ref_name } : null;
            }).filter(Boolean) as Array<{ id: string; name: string; ref_name: string; }>;

            const productData = {
                ...data,
                tags: fullTags,
                category: { id: data.category_id, title: '', ref_name: '' },
                brand: data.brand_id && data.brand_id !== 'none' ? { id: data.brand_id, name: '' } : undefined,
                imageFile: mainImageFile || undefined, // main image file (undefined if null)
                additionalImages: remainingAdditionalImages, // rest of images to upload
                // Vehicle compatibility data
                compatibility_group: data.compatibility_group_id ? data.compatibility_group_id : undefined,
                compatible_variants: data.compatible_variants ? data.compatible_variants : undefined,
            };

            console.log('🔧 Prepared product data:', productData);

            // Validate required fields before API call
            if (!productData.title || !productData.category_id || productData.category_id === '') {
                console.error('❌ Validation failed: Missing required fields');
                toast.error('Please fill in all required fields (Title and Category)');
                return;
            }

            // Image is now optional - no validation required

            console.log('🚀 Calling API for product creation...');
            const result = await createProduct(productData);

            console.log('📦 API Result:', result);

            if (result.success) {
                console.log('✅ Product operation successful');
                toast.success(result.message || 'Product created successfully', {
                    duration: 4000,
                });
                handleClose();
                onProductCreated(result.data!);
            } else {
                console.error('❌ Product operation failed:', JSON.stringify(result, null, 2));

                // Create a detailed error message
                let errorMessage = result.message || 'Failed to create product';

                // If there are validation errors, show them
                if (result.errors && typeof result.errors === 'object') {
                    const errorDetails = Object.entries(result.errors)
                        .map(([field, errors]) => {
                            if (Array.isArray(errors)) {
                                return `${field}: ${errors.join(', ')}`;
                            }
                            return `${field}: ${errors}`;
                        })
                        .join('; ');

                    if (errorDetails) {
                        errorMessage += `. Details: ${errorDetails}`;
                    }
                }

                toast.error(errorMessage, {
                    duration: 6000,
                });
            }
        } catch (error) {
            console.error('💥 Exception in form submission:', error);
            toast.error('An unexpected error occurred: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const createProduct = async (productData: any): Promise<ServiceResponse<Product>> => {
        try {
            console.log('🔧 ProductService.createProduct called with:', productData);

            // Transform the data to match Django's expected format
            const normalizeId = (val: string | number | undefined | null) => {
                if (val === undefined || val === null || val === '') return undefined;
                const n = Number(val);
                return Number.isNaN(n) ? val : n;
            };

            const transformedData = {
                title: productData.title,
                description: productData.description || '',
                price: productData.price,
                discount_amount: productData.discount_amount || 0,
                rating: productData.rating || 4.5,
                lead_time: productData.lead_time || 5,
                stock: productData.stock || 0,
                is_available: productData.is_available ?? true,
                bulk_order_available: productData.bulk_order_available ?? true,
                is_active: productData.is_active ?? true,
                taxes: productData.taxes || 18,
                is_cod: productData.is_cod ?? true,
                hsn_code: productData.hsn_code || '',
                barcode: productData.barcode || '',
                // IDs coercion
                category: normalizeId(productData.category_id || productData.category?.id),
                tags: Array.isArray(productData.tags)
                    ? productData.tags.map((t: any) => normalizeId(typeof t === 'object' ? t.id : t)).filter((v: any) => v !== undefined)
                    : [],
                brand: (productData.brand_id && productData.brand_id !== '' && productData.brand_id !== 'none')
                    ? normalizeId(productData.brand_id)
                    : null,
                // Vehicle compatibility fields
                compatibility_group: productData.compatibility_group ? normalizeId(productData.compatibility_group) : null,
                compatible_variants: productData.compatible_variants || [],
            };

            console.log('🔧 Transformed data:', transformedData);
            console.log('🔧 Category field value:', transformedData.category, 'Type:', typeof transformedData.category);

            // Create FormData for file upload
            const formData = new FormData();

            // Add all product fields to FormData
            (Object.entries(transformedData) as [string, unknown][]).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (Array.isArray(value)) {
                        // Handle arrays (like tags and compatible_variants)
                        value.forEach(item => {
                            formData.append(key, String(item));
                        });
                    } else {
                        formData.append(key, value.toString());
                    }
                }
            });

            // Validate that category is selected (required by API)
            if (!transformedData.category || transformedData.category === '' || transformedData.category === 0) {
                console.error('❌ Validation failed: Category is required');
                toast.error('Please select a category');
                return {
                    success: false,
                    message: 'Category is required',
                    errors: { category: ['This field is required.'] }
                };
            }

            // Add main image file if provided
            if (productData.imageFile) {
                formData.append('image', productData.imageFile);
                console.log('🔧 Added main image file to FormData:', productData.imageFile.name);
            }

            console.log('🔧 FormData contents:');
            for (const [key, value] of formData.entries()) {
                // File objects log their name; others print value
                const v = (value as File)?.name ? (value as File).name : value;
                console.log(`  ${key}:`, v);
            }
            console.log('🔧 FormData has category field:', formData.has('category'));
            console.log('🔧 FormData category value:', formData.get('category'));

            console.log('🔧 Making request to: http://127.0.0.1:8000/api/shop/shop/create/products/');

            const tokens = getTokens();
            const headers: Record<string, string> = {};
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const response = await fetch(`${API_ROOT}/api/shop/shop/create/products/`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            const rawText = await response.text();
            let result: Record<string, unknown> = {};
            try {
                result = rawText ? JSON.parse(rawText) : {};
            } catch {
                console.warn('⚠️ Response was not JSON. Raw text:', rawText);
                result = { non_json: true, raw: rawText };
            }

            console.log('🔍 Response status:', response.status, response.statusText);
            console.log('🔍 Raw response text:', rawText);
            console.log('🔍 Parsed response body:', result);

            if (response.ok && !result.error && result.product_data) {
                const createdProduct = result.product_data as Product;

                // Upload additional images if provided
                if (productData.additionalImages && productData.additionalImages.length > 0) {
                    console.log('🔧 Uploading additional images...');
                    await uploadProductImages(createdProduct.product_id, productData.additionalImages);
                }

                return {
                    success: true,
                    data: createdProduct,
                    message: result.message as string || 'Product created successfully',
                };
            } else {
                console.error('❌ Create Product API Error:', JSON.stringify({
                    status: response.status,
                    statusText: response.statusText,
                    rawText: rawText,
                    parsedResult: result
                }, null, 2));

                // More detailed error message construction
                let errorMessage: string = (result && ((result.message || result.detail) as string | undefined)) || `API Error: ${response.status} ${response.statusText}`;

                if (response.status === 400 && result && typeof result === 'object' && !result.non_json) {
                    const fieldErrors: string[] = [];
                    Object.keys(result).forEach(key => {
                        if (key !== 'error' && key !== 'message' && result[key] !== undefined) {
                            if (Array.isArray(result[key])) {
                                fieldErrors.push(`${key}: ${(result[key] as string[]).join(', ')}`);
                            } else {
                                fieldErrors.push(`${key}: ${result[key]}`);
                            }
                        }
                    });
                    if (fieldErrors.length > 0) errorMessage += `. Field errors: ${fieldErrors.join('; ')}`;
                } else if (result && result.non_json) {
                    errorMessage += `. Raw: ${((result.raw as string) || '').slice(0, 300)}`;
                }

                return {
                    success: false,
                    message: errorMessage,
                    errors: result
                };
            }
        } catch (error) {
            console.error('Error creating product:', error);
            return {
                success: false,
                message: 'An unexpected error occurred'
            };
        }
    };

    const uploadProductImages = async (productId: string, imageFiles: File[]): Promise<ServiceResponse<Record<string, unknown>>> => {
        try {
            console.log('🔧 Uploading images for product:', productId);

            const formData = new FormData();
            formData.append('product_id', productId);

            // Create images array - backend expects 'images' as multiple files
            imageFiles.forEach((file, index) => {
                formData.append('images', file);
                formData.append(`alt_text_${index}`, '');
            });

            const tokens = getTokens();
            const headers: Record<string, string> = {};
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }

            const response = await fetch(`${API_ROOT}/api/shop/shop/upload-product-images/`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            const result = await response.json();
            console.log('🔍 Image upload response:', result);

            if (response.ok && !result.error) {
                return {
                    success: true,
                    data: result.data as Record<string, unknown>,
                    message: 'Images uploaded successfully',
                };
            } else {
                console.error('❌ Image upload error:', result);
                return {
                    success: false,
                    message: result.message || 'Failed to upload images',
                    errors: result
                };
            }
        } catch (error) {
            console.error('Error uploading images:', error);
            return {
                success: false,
                message: 'An unexpected error occurred while uploading images'
            };
        }
    };

    const handleClose = () => {
        form.reset({
            title: '',
            description: '',
            price: undefined,
            discounted_price: undefined,
            discount_amount: undefined,
            stock: undefined,
            lead_time: undefined,
            category_id: '',
            brand_id: 'none',
            barcode: '',
            hsn_code: '',
            taxes: 18,
            is_active: true,
            is_available: true,
            bulk_order_available: true,
            is_cod: true,
            // Vehicle compatibility defaults
            compatibility_group_id: '',
            compatible_variants: [],
        });
        setImageFile(null);
        setImagePreview('');
        setAdditionalImages([]);
        setAdditionalImagePreviews([]);
        setSelectedTags([]);
        // Reset vehicle compatibility state
        setSelectedCarMaker('');
        setSelectedCarModel('');
        setSelectedYear(undefined);
        setSelectedVariants([]);
        setCarModels([]);
        setCarVariants([]);
        setCompatibilityGroups([]);
        setAvailableYears([]);
        setCompatibilityMode('none');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="w-[500px] max-h-[90vh] flex flex-col sm:w-[800px] lg:w-[1000px]">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                        Fill in the details to add a new product.
                    </DialogDescription>
                </DialogHeader>

                {fetchLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading product data...</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <div className="bg-card mx-1 rounded-lg border p-1 shadow">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="mx-1 space-y-3 py-2">
                                    {/* Title */}
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Title *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter product title" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Description */}
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Enter product description" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Price, Purchase Price and Discounted Price */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="price"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Original Price (₹)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={field.value ?? ''}
                                                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="purchase_price"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Purchase Price (₹) *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={field.value ?? ''}
                                                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="discounted_price"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Discounted Price (₹)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={field.value ?? ''}
                                                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Discount Amount (for backward compatibility) */}
                                    <FormField
                                        control={form.control}
                                        name="discount_amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Discount Amount (₹)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={field.value ?? ''}
                                                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Fixed discount amount (optional if using discounted price)
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Stock and Lead Time */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="stock"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Stock *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            value={field.value ?? ''}
                                                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="lead_time"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Lead Time (days) *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="5"
                                                            value={field.value || ''}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Category and Brand */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="category_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Category *</FormLabel>
                                                    <FormControl>
                                                        <SearchableSelect
                                                            options={convertCategoriesToOptions(breadcrumbCategories || [])}
                                                            value={field.value ? String(field.value) : ''}
                                                            onValueChange={(value) => field.onChange(value === '__no_categories__' ? '' : value)}
                                                            placeholder="Select category"
                                                            emptyMessage="No categories available"
                                                            searchPlaceholder="Search categories..."
                                                            allowClear={false}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="brand_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Brand</FormLabel>
                                                    <Select
                                                        onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                                                        value={field.value ? String(field.value) : ''}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select brand" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">No Brand</SelectItem>
                                                            {brands && brands.length > 0 ? (
                                                                brands.map((brand) => (
                                                                    <SelectItem key={brand.id} value={String(brand.id)}>
                                                                        {brand.name}
                                                                    </SelectItem>
                                                                ))
                                                            ) : null}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* HSN Code and Barcode */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="hsn_code"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>HSN Code</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter HSN code" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="barcode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Barcode</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter barcode" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Tax Rate Dropdown */}
                                    <FormField
                                        control={form.control}
                                        name="taxes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tax Rate (%) *</FormLabel>
                                                <Select
                                                    onValueChange={(value) => field.onChange(parseFloat(value))}
                                                    value={field.value?.toString() || '18'}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select tax rate" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {TAX_OPTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value.toString()}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Vehicle Compatibility Section */}
                                    <div className="space-y-4">
                                        <div className="border-t pt-4">
                                            <h3 className="text-lg font-medium mb-4">Vehicle Compatibility</h3>

                                            {/* Three mutually exclusive options */}
                                            <div className="space-y-6">
                                                {/* Option 0: No Vehicle Compatibility */}
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="no-compatibility"
                                                        name="compatibility-option"
                                                        checked={compatibilityMode === 'none'}
                                                        onChange={() => {
                                                            setCompatibilityMode('none');
                                                            // Clear both options
                                                            form.setValue('compatibility_group_id', '');
                                                            form.setValue('compatible_variants', []);
                                                            setSelectedCarMaker('');
                                                            setSelectedCarModel('');
                                                            setSelectedYear(undefined);
                                                            setSelectedVariants([]);
                                                            setCarModels([]);
                                                            setCarVariants([]);
                                                            setAvailableYears([]);
                                                        }}
                                                        className="w-4 h-4"
                                                    />
                                                    <label htmlFor="no-compatibility" className="text-sm font-medium">
                                                        No Vehicle Compatibility (General Product)
                                                    </label>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* Option 1: Compatibility Group */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="radio"
                                                                id="compatibility-group"
                                                                name="compatibility-option"
                                                                checked={compatibilityMode === 'group'}
                                                                onChange={() => {
                                                                    setCompatibilityMode('group');
                                                                    // Clear variants when selecting group
                                                                    form.setValue('compatible_variants', []);
                                                                    setSelectedCarMaker('');
                                                                    setSelectedCarModel('');
                                                                    setSelectedYear(undefined);
                                                                    setSelectedVariants([]);
                                                                    setCarModels([]);
                                                                    setCarVariants([]);
                                                                    setAvailableYears([]);
                                                                }}
                                                                className="w-4 h-4"
                                                            />
                                                            <label htmlFor="compatibility-group" className="text-sm font-medium">
                                                                Use Compatibility Group
                                                            </label>
                                                        </div>

                                                        {compatibilityMode === 'group' && (
                                                            <FormField
                                                                control={form.control}
                                                                name="compatibility_group_id"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Compatibility Group *</FormLabel>
                                                                        <Select
                                                                            onValueChange={(value) => {
                                                                                field.onChange(value);
                                                                                // Clear variants when group is selected
                                                                                form.setValue('compatible_variants', []);
                                                                            }}
                                                                            value={field.value || ''}
                                                                        >
                                                                            <FormControl>
                                                                                <SelectTrigger>
                                                                                    <SelectValue placeholder="Select compatibility group" />
                                                                                </SelectTrigger>
                                                                            </FormControl>
                                                                            <SelectContent>
                                                                                {compatibilityGroups && compatibilityGroups.length > 0 ? (
                                                                                    compatibilityGroups.map((group) => (
                                                                                        <SelectItem key={group.id} value={group.id}>
                                                                                            {group.name}
                                                                                        </SelectItem>
                                                                                    ))
                                                                                ) : (
                                                                                    <SelectItem value="__no_groups__" disabled>
                                                                                        No compatibility groups available
                                                                                    </SelectItem>
                                                                                )}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormDescription>
                                                                            Select a group of vehicles that share compatible parts
                                                                        </FormDescription>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Option 2: Specific Vehicle Variants */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="radio"
                                                                id="vehicle-variants"
                                                                name="compatibility-option"
                                                                checked={compatibilityMode === 'variants'}
                                                                onChange={() => {
                                                                    setCompatibilityMode('variants');
                                                                    // Clear group when selecting variants
                                                                    form.setValue('compatibility_group_id', '');
                                                                    form.setValue('compatible_variants', []);
                                                                }}
                                                                className="w-4 h-4"
                                                            />
                                                            <label htmlFor="vehicle-variants" className="text-sm font-medium">
                                                                Use Specific Vehicle Variants
                                                            </label>
                                                        </div>

                                                        {compatibilityMode === 'variants' && (
                                                            <div className="space-y-4">
                                                                {/* Car Maker Selection */}
                                                                <div>
                                                                    <label className="text-sm font-medium">Car Maker *</label>
                                                                    <Select
                                                                        onValueChange={(value) => {
                                                                            handleCarMakerChange(value);
                                                                            // Clear group when variants are selected
                                                                            form.setValue('compatibility_group_id', '');
                                                                        }}
                                                                        value={selectedCarMaker}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select car maker" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {carMakers && carMakers.length > 0 ? (
                                                                                carMakers.map((maker) => (
                                                                                    <SelectItem key={maker.id} value={maker.id}>
                                                                                        {maker.name}
                                                                                    </SelectItem>
                                                                                ))
                                                                            ) : (
                                                                                <SelectItem value="__no_makers__" disabled>
                                                                                    No car makers available
                                                                                </SelectItem>
                                                                            )}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {/* Car Model Selection */}
                                                                {selectedCarMaker && (
                                                                    <div>
                                                                        <label className="text-sm font-medium">Car Model *</label>
                                                                        <Select
                                                                            onValueChange={handleCarModelChange}
                                                                            value={selectedCarModel || ''}
                                                                        >
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Select car model" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {carModels && carModels.length > 0 ? (
                                                                                    carModels.map((model) => (
                                                                                        <SelectItem key={model.id} value={model.id}>
                                                                                            {model.name}
                                                                                        </SelectItem>
                                                                                    ))
                                                                                ) : (
                                                                                    <SelectItem value="__no_models__" disabled>
                                                                                        {loadingCarModels ? 'Loading car models...' : 'No car models available for this maker'}
                                                                                    </SelectItem>
                                                                                )}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}

                                                                {/* Year Selection */}
                                                                {selectedCarModel && (
                                                                    <div>
                                                                        <label className="text-sm font-medium">Year (Optional)</label>
                                                                        <Select
                                                                            onValueChange={(value) => {
                                                                                if (value === 'ALL') {
                                                                                    setSelectedYear(undefined);
                                                                                    return;
                                                                                }
                                                                                handleYearChange(parseInt(value));
                                                                            }}
                                                                            value={selectedYear?.toString() || ''}
                                                                        >
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Select year (optional)" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="ALL">All Years</SelectItem>
                                                                                {availableYears && availableYears.length > 0 ? (
                                                                                    availableYears.map((year) => (
                                                                                        <SelectItem key={year} value={year.toString()}>
                                                                                            {year}
                                                                                        </SelectItem>
                                                                                    ))
                                                                                ) : null}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}

                                                                {/* Vehicle Variants Selection */}
                                                                {selectedCarModel && (
                                                                    <div>
                                                                        <label className="text-sm font-medium">Vehicle Variants *</label>
                                                                        <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                                                                            {carVariants && carVariants.length > 0 ? (
                                                                                carVariants.map((variant) => (
                                                                                    <div key={variant.id} className="flex items-center space-x-2">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            id={`variant-${variant.id}`}
                                                                                            checked={selectedVariants.includes(variant.id)}
                                                                                            onChange={() => {
                                                                                                handleVariantToggle(variant.id);
                                                                                                // Clear group when variants are selected
                                                                                                form.setValue('compatibility_group_id', '');
                                                                                            }}
                                                                                            className="rounded border-gray-300"
                                                                                        />
                                                                                        <label
                                                                                            htmlFor={`variant-${variant.id}`}
                                                                                            className="text-sm cursor-pointer flex-1"
                                                                                        >
                                                                                            {variant.name}
                                                                                            {variant.year_start && variant.year_end && (
                                                                                                <span className="text-gray-500 ml-2">
                                                                                                    ({variant.year_start}-{variant.year_end})
                                                                                                </span>
                                                                                            )}
                                                                                        </label>
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <div className="text-sm text-gray-500 text-center py-2">
                                                                                    No vehicle variants available
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <FormDescription>
                                                                            Select specific vehicle variants this product is compatible with
                                                                        </FormDescription>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product Image */}
                                    <div className="space-y-4">
                                        <label className="text-sm font-medium">
                                            Product Image
                                        </label>
                                        {imagePreview && (
                                            <div className="relative w-full max-w-[200px]">
                                                <img
                                                    src={imagePreview}
                                                    alt="Product preview"
                                                    className="h-32 w-full rounded-lg border object-cover"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
                                                    onClick={removeImage}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <Upload className="w-6 h-6 mb-2 text-gray-500" />
                                                <p className="mb-1 text-sm text-gray-500">
                                                    <span className="font-semibold">Click to upload</span>
                                                </p>
                                                <p className="text-xs text-gray-500">PNG, JPG (max 5MB)</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                            />
                                        </label>
                                    </div>

                                    {/* Additional Product Images */}
                                    <div className="space-y-4">
                                        <label className="text-sm font-medium">
                                            Additional Images (Optional)
                                        </label>

                                        {/* Display existing additional images */}
                                        {additionalImagePreviews.length > 0 && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {additionalImagePreviews.map((preview, index) => (
                                                    <div key={index} className="relative">
                                                        <img
                                                            src={preview}
                                                            alt={`Additional preview ${index + 1}`}
                                                            className="h-24 w-full rounded-lg border object-cover"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0"
                                                            onClick={() => removeAdditionalImage(index)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Upload more images */}
                                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                            <div className="flex flex-col items-center justify-center pt-3 pb-3">
                                                <Plus className="w-5 h-5 mb-1 text-gray-500" />
                                                <p className="text-xs text-gray-500">Add more images</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                multiple
                                                onChange={handleAdditionalImageUpload}
                                            />
                                        </label>
                                    </div>

                                    {/* Product Status Switches */}
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="is_active"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <FormLabel>Active</FormLabel>
                                                        <FormDescription>
                                                            Product is active and visible
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="is_available"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <FormLabel>Available</FormLabel>
                                                        <FormDescription>
                                                            Product is available for purchase
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="bulk_order_available"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <FormLabel>Bulk Order Available</FormLabel>
                                                        <FormDescription>
                                                            Allow bulk orders for this product
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="is_cod"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <FormLabel>Cash on Delivery</FormLabel>
                                                        <FormDescription>
                                                            Allow COD for this product
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                </form>
                            </Form>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex-shrink-0 border-t bg-background p-4">
                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            onClick={form.handleSubmit(onSubmit)}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Product
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
