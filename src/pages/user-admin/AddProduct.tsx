import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, Trash2, Package } from 'lucide-react';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Save, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { shopProductsApi, shopCategoriesApi, shopBrandsApi, shopTagsApi, shopApi, type ShopCategory, type ShopBrand } from '@/lib/shop-api';
import optimizedShopApi from '@/lib/optimized-shop-api';
import { inventoryApiFunctions, type Unit } from '@/lib/api';
import { API_ROOT, getTokens, clearTokens } from '@/lib/api';

// Form validation schema
const productSchema = z.object({
    title: z.string().min(1, 'Product title is required'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be positive'),
    purchase_price: z.number().min(0, 'Purchase price must be positive'),
    discounted_price: z.number().min(0).optional(),
    stock_quantity: z.number().min(0, 'Stock quantity must be positive'),
    hsn_code: z.string().optional(),
    barcode: z.string().optional(),
    tax_rate: z.number().min(0).max(100).optional(),
    category_id: z.string().min(1, 'Category is required'),
    brand_id: z.string().optional(),
    tag_ids: z.array(z.string()).optional(),
    is_active: z.boolean().default(true),
    is_available: z.boolean().default(true),
    bulk_order_available: z.boolean().default(false),
    is_cod: z.boolean().default(true),
    lead_time: z.number().min(0).optional(),
    rating: z.number().min(0).max(5).optional(),
    // Physical dimensions
    weight: z.number().min(0).optional(),
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    volume_m3: z.number().min(0).optional(),
    // Unit of measurement
    unit_id: z.string().optional(),
    // Vehicle compatibility fields
    is_general_product: z.boolean().default(false),
    compatibility_group_id: z.string().optional(),
    compatible_variants: z.array(z.string()).optional(),
}).refine((data) => {
    // Custom validation: ensure mutual exclusivity
    const isGeneral = data.is_general_product;
    const hasGroup = data.compatibility_group_id && data.compatibility_group_id !== '';
    const hasVariants = data.compatible_variants && data.compatible_variants.length > 0;

    // If general product, no compatibility needed
    if (isGeneral) {
        return true;
    }

    // Both cannot be selected at the same time
    if (hasGroup && hasVariants) {
        return false;
    }

    // For non-general products, require at least one compatibility option
    if (!hasGroup && !hasVariants) {
        return false;
    }

    return true;
}, {
    message: "Select either general product, compatibility group, or specific variants",
    path: ["is_general_product"]
});

type ProductFormData = z.infer<typeof productSchema>;

interface Category {
    id: string;
    title: string;
}

interface Brand {
    id: string;
    name: string;
}

interface Tag {
    id: string;
    name: string;
}

// Vehicle compatibility interfaces
interface CarMaker {
    id: string;
    name: string;
}

interface CarModel {
    id: string;
    name: string;
    car_maker: string;
}

interface CarVariant {
    id: string;
    name: string;
    car_model: string;
    year_start: number;
    year_end: number;
}

interface CompatibilityGroup {
    id: string;
    name: string;
    description?: string;
}

export default function AddProduct() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);
    const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [brandOpen, setBrandOpen] = useState(false);

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
    // Show full vehicle compatibility like purchase bills form
    const SHOW_VARIANT_SELECTION = true;

    const form = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            title: '',
            description: '',
            price: 0,
            purchase_price: 0,
            stock_quantity: 0,
            hsn_code: '',
            barcode: '',
            tax_rate: 18,
            category_id: '',
            brand_id: '',
            is_active: true,
            is_available: true,
            bulk_order_available: false,
            is_cod: true,
            lead_time: 5,
            rating: 4.5,
            // Vehicle compatibility defaults
            compatibility_group_id: '',
            compatible_variants: [],
        },
    });

    useEffect(() => {
        loadInitialDataOptimized();
    }, []);

    const loadInitialDataOptimized = async () => {
        try {
            setLoading(true);
            console.log('🚀 Loading form data with optimizations...');

            // Load essential data first (categories, brands, tags, units) with smaller page sizes
            const [categoriesData, brandsData, tagsData, unitsData] = await Promise.all([
                optimizedShopApi.categories.list(),
                optimizedShopApi.brands.list(),
                shopTagsApi.list(),
                inventoryApiFunctions.units.list(),
            ]);

            console.log('✅ Essential data loaded:', {
                categories: categoriesData.length,
                brands: brandsData.length,
                tags: tagsData.length,
                units: unitsData.length
            });

            setCategories(categoriesData as any);
            setBrands(brandsData as any);
            setTags(tagsData);
            setUnits(unitsData);

            // Load vehicle data in background (non-blocking)
            fetchVehicleDataBackground();
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Failed to load form data');
        } finally {
            setLoading(false);
        }
    };

    const loadInitialData = async () => {
        try {
            setLoading(true);
            console.log('Loading categories and brands...');

            const [categoriesData, brandsData, tagsData] = await Promise.all([
                shopCategoriesApi.listAll(),
                shopBrandsApi.listAll(),
                shopTagsApi.list(),
            ]);

            console.log('Categories loaded:', categoriesData.length);
            console.log('Brands loaded:', brandsData.length);
            console.log('Tags loaded:', tagsData.length);
            console.log('Sample categories:', categoriesData.slice(0, 5));
            console.log('Sample tags:', tagsData.slice(0, 5));
            console.log('All categories:', categoriesData);
            console.log('All tags:', tagsData);

            // Debug parent structure
            const sampleWithParent = categoriesData.find(cat => (cat as any).parent);
            if (sampleWithParent) {
                console.log('Sample category with parent:', sampleWithParent);
                console.log('Parent structure:', (sampleWithParent as any).parent);
            }

            // Categories loaded successfully
            console.log(`Successfully loaded ${categoriesData.length} categories and ${brandsData.length} brands`);

            setCategories(categoriesData as any);
            setBrands(brandsData as any);
            setTags(tagsData);
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast.error('Failed to load form data');
        } finally {
            setLoading(false);
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

    const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        console.log(`📸 Image compressed: ${file.size} → ${compressedFile.size} bytes (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`);
                        resolve(compressedFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };

            img.src = URL.createObjectURL(file);
        });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            console.log(`📸 Original image: ${file.name}, ${file.size} bytes`);

            // Compress image if it's larger than 500KB
            const processedFile = file.size > 500 * 1024 ? await compressImage(file) : file;

            setImageFile(processedFile);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(processedFile);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleAdditionalImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const fileArray = Array.from(files);
            console.log(`📸 Processing ${fileArray.length} additional images`);

            // Compress images if they're large
            const processedFiles: File[] = [];
            for (const file of fileArray) {
                const processedFile = file.size > 500 * 1024 ? await compressImage(file) : file;
                processedFiles.push(processedFile);
            }

            const newImages = [...additionalImages, ...processedFiles];
            setAdditionalImages(newImages);

            // Create previews for new images
            const newPreviews: string[] = [];
            processedFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        newPreviews.push(e.target.result as string);
                        if (newPreviews.length === processedFiles.length) {
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

    const handleTagToggle = (tagId: string) => {
        console.log('Tag toggled:', tagId);
        setSelectedTags(prev => {
            const newTags = prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId];
            console.log('Selected tags:', newTags);
            return newTags;
        });
    };

    // Build a breadcrumb like "Parent -> Child -> Subchild" for categories with varying shapes
    const getCategoryBreadcrumbLabel = (category: any): string => {
        if (!category) return '';

        // Helper to get title/name
        const getTitle = (c: any): string => (c?.title || c?.name || '');

        // Helper to find by id in local categories state
        const findById = (id: string | number | undefined) =>
            categories.find((cat) => String((cat as any).id) === String(id));

        // Helper to resolve parent object (supports many backends)
        const resolveParent = (c: any): any => {
            if (!c) return null;
            if (typeof c.parent === 'object' && c.parent) return c.parent;
            if (typeof c.parent === 'string' || typeof c.parent === 'number') return findById(c.parent);
            if (c.parent_category && typeof c.parent_category === 'object') return c.parent_category;
            if (c.parent_id) return findById(c.parent_id);
            if (c.parent_title || c.parent_name) {
                // Try to match by title if id is missing
                const t = c.parent_title || c.parent_name;
                const match = categories.find((cat) => getTitle(cat as any) === t);
                return match as any;
            }
            return null;
        };

        // Walk up parents and build breadcrumb
        const parts: string[] = [];
        let current: any = category;
        const seen = new Set<string>();
        let safety = 0;
        while (current && safety < 6) {
            safety += 1;
            const title = getTitle(current);
            if (title) parts.unshift(title);
            const idKey = String(current?.id ?? title ?? safety);
            if (seen.has(idKey)) break; // prevent loops
            seen.add(idKey);
            const parent = resolveParent(current);
            if (!parent) break;
            current = parent;
        }

        return parts.join(' -> ');
    };

    // Vehicle compatibility API functions (matching AddProductForm.tsx)
    const fetchCarMakers = async (params: any = {}): Promise<any> => {
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

    const fetchCarModels = async (carMakerId: string, params: any = {}): Promise<any> => {
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

    const fetchCarVariants = async (carModelId: string, year?: number, params: any = {}): Promise<any> => {
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

    const fetchCompatibilityGroups = async (carMakerId?: string, params: any = {}): Promise<any> => {
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
            const [carMakersResult, compatibilityGroupsResult] = await Promise.all([
                fetchCarMakers({ page_size: 100 }),
                fetchCompatibilityGroups(undefined, { page_size: 100 })
            ]);

            if (carMakersResult.success && carMakersResult.data) {
                const carMakers = carMakersResult.data.results || carMakersResult.data.data || [];
                setCarMakers(carMakers);
            }
            if (compatibilityGroupsResult.success && compatibilityGroupsResult.data) {
                const compatibilityGroups = compatibilityGroupsResult.data.results || compatibilityGroupsResult.data.data || [];
                setCompatibilityGroups(compatibilityGroups);
            }
        } catch (error) {
            console.error('Error fetching vehicle data:', error);
        }
    };

    const handleCarMakerChange = async (makerId: string) => {
        setSelectedCarMaker(makerId);
        setSelectedCarModel('');
        setSelectedYear(undefined);
        setSelectedVariants([]);
        setCarModels([]);
        setCarVariants([]);
        setAvailableYears([]);

        if (makerId) {
            try {
                setLoadingCarModels(true);
                const [modelsResult, groupsResult] = await Promise.all([
                    fetchCarModels(makerId, { page_size: 100 }),
                    fetchCompatibilityGroups(makerId, { page_size: 100 })
                ]);

                if (modelsResult.success && modelsResult.data) {
                    const carModels = modelsResult.data.results || modelsResult.data.data || [];
                    setCarModels(carModels);
                }

                if (groupsResult.success && groupsResult.data) {
                    const compatibilityGroups = groupsResult.data.results || groupsResult.data.data || [];
                    setCompatibilityGroups(compatibilityGroups);
                }
            } catch (error) {
                console.error('Error fetching car models:', error);
            } finally {
                setLoadingCarModels(false);
            }
        }
    };

    const handleCarModelChange = async (modelId: string) => {
        setSelectedCarModel(modelId);
        setSelectedYear(undefined);
        setSelectedVariants([]);
        setCarVariants([]);
        setAvailableYears([]);

        if (modelId) {
            try {
                // Load years for the selected model (like VehicleSelector)
                const response = await fetch(`${API_ROOT}/api/shop/shop/car-years/?model_id=${modelId}`, {
                    headers: {
                        'Authorization': `Bearer ${getTokens()?.access}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const years = data.data || [];
                    // Convert string years to numbers and sort
                    const yearNumbers = years.map((year: string) => parseInt(year)).sort((a: number, b: number) => b - a);
                    setAvailableYears(yearNumbers);
                } else {
                    console.error('Failed to load years');
                }
            } catch (error) {
                console.error('Error fetching years:', error);
            }
        }
    };

    const handleYearChange = async (year: number) => {
        setSelectedYear(year);
        setSelectedVariants([]);

        // Load variants filtered by model AND year (like VehicleSelector)
        if (selectedCarModel) {
            try {
                const response = await fetch(`${API_ROOT}/api/shop/shop/car-variants/?model_id=${selectedCarModel}&year=${year}`, {
                    headers: {
                        'Authorization': `Bearer ${getTokens()?.access}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const variants = data.data || [];
                    setCarVariants(variants);
                } else {
                    console.error('Failed to load variants');
                    setCarVariants([]);
                }
            } catch (error) {
                console.error('Error fetching variants:', error);
                setCarVariants([]);
            }
        }
    };

    const handleVariantToggle = (variantId: string) => {
        setSelectedVariants(prev =>
            prev.includes(variantId)
                ? prev.filter(id => id !== variantId)
                : [...prev, variantId]
        );
    };

    const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
        try {
            setLoading(true);
            setUploadProgress(0);

            // Sync selected variants with form data
            if (compatibilityMode === 'variants') {
                data.compatible_variants = selectedVariants;
            }

            // Validate required fields
            if (!data.category_id || data.category_id === '') {
                toast.error('Please select a category');
                return;
            }

            // Prepare form data for API
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description || '');
            formData.append('price', data.price.toString());
            formData.append('purchase_price', data.purchase_price.toString());
            if (data.discounted_price !== undefined) {
                formData.append('discounted_price', data.discounted_price.toString());
            }
            formData.append('stock', data.stock_quantity.toString());
            formData.append('hsn_code', data.hsn_code || '');
            formData.append('barcode', data.barcode || '');
            formData.append('taxes', (data.tax_rate || 0).toString());
            formData.append('category', data.category_id);
            if (data.brand_id) formData.append('brand', data.brand_id);
            formData.append('is_active', data.is_active.toString());
            formData.append('is_available', data.is_available.toString());
            formData.append('bulk_order_available', data.bulk_order_available.toString());
            formData.append('is_cod', data.is_cod.toString());
            formData.append('lead_time', (data.lead_time || 0).toString());
            formData.append('rating', (data.rating || 0).toString());

            // Add organization ID from localStorage (send as header, not in FormData)
            const orgId = localStorage.getItem('dev_organization_id') || localStorage.getItem('nk:activeOrganizationId');
            if (!orgId) {
                console.warn('⚠️ No organization ID found in localStorage');
            }

            // Add physical dimensions and unit
            if (data.weight !== undefined) formData.append('weight', data.weight.toString());
            if (data.length !== undefined) formData.append('length', data.length.toString());
            if (data.width !== undefined) formData.append('width', data.width.toString());
            if (data.height !== undefined) formData.append('height', data.height.toString());
            if (data.volume_m3 !== undefined) formData.append('volume_m3', data.volume_m3.toString());
            if (data.unit_id) formData.append('unit', data.unit_id);

            // Add tags
            console.log('Selected tags for submission:', selectedTags);
            selectedTags.forEach(tagId => {
                formData.append('tags', tagId);
            });

            // Add main image
            if (imageFile) {
                console.log('📸 Adding main image to FormData:', imageFile.name, imageFile.size, 'bytes');
                formData.append('image', imageFile);
            } else {
                console.log('❌ No main image file to add');
            }

            // Add additional images
            console.log('📸 Adding additional images:', additionalImages.length);
            additionalImages.forEach((file, index) => {
                console.log(`📸 Additional image ${index}:`, file.name, file.size, 'bytes');
                formData.append(`additional_images`, file);
            });

            // Add vehicle compatibility data
            formData.append('is_general_product', data.is_general_product.toString());

            if (compatibilityMode === 'group' && data.compatibility_group_id) {
                formData.append('compatibility_group', data.compatibility_group_id);
            } else if (compatibilityMode === 'variants') {
                // Send maker, model, year, and selected variants
                if (selectedCarMaker) formData.append('vehicle_maker', selectedCarMaker);
                if (selectedCarModel) formData.append('vehicle_model', selectedCarModel);
                if (selectedYear) formData.append('vehicle_year', selectedYear.toString());
                if (selectedVariants && selectedVariants.length > 0) {
                    selectedVariants.forEach(variantId => {
                        formData.append('compatible_variants', variantId);
                    });
                }
            }

            // Debug: Log all form data
            console.log('Form data being sent:');
            for (const [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }

            // Send FormData directly to API (don't convert to regular object)
            console.log('Submitting FormData directly to API');

            const tokens = getTokens();
            const headers: Record<string, string> = {};
            if (tokens?.access) {
                headers['Authorization'] = `Bearer ${tokens.access}`;
            }
            // Include organization context header so product is created under active org
            if (orgId) headers['X-Organization-ID'] = orgId;

            // Create XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();

            const response = await new Promise<Response>((resolve, reject) => {
                // Set timeout for upload (5 minutes)
                const timeout = setTimeout(() => {
                    xhr.abort();
                    reject(new Error('Upload timeout - please try again'));
                }, 5 * 60 * 1000);

                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(progress);
                        console.log(`📤 Upload progress: ${progress}%`);
                    }
                });

                xhr.addEventListener('load', () => {
                    clearTimeout(timeout);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(new Response(xhr.responseText, {
                            status: xhr.status,
                            statusText: xhr.statusText,
                        }));
                    } else {
                        // Try to parse error response as JSON
                        let errorMessage = `HTTP ${xhr.status}: ${xhr.statusText}`;
                        try {
                            const errorData = JSON.parse(xhr.responseText);
                            if (errorData.message) {
                                errorMessage = errorData.message;
                                if (errorData.details) {
                                    if (typeof errorData.details === 'object') {
                                        const detailMessages = Object.entries(errorData.details)
                                            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                                            .join('; ');
                                        errorMessage += ` - ${detailMessages}`;
                                    } else {
                                        errorMessage += ` - ${errorData.details}`;
                                    }
                                }
                            }
                        } catch (e) {
                            // If parsing fails, use the response text if available
                            if (xhr.responseText) {
                                errorMessage = xhr.responseText;
                            }
                        }
                        const error = new Error(errorMessage);
                        (error as any).response = new Response(xhr.responseText, {
                            status: xhr.status,
                            statusText: xhr.statusText,
                        });
                        reject(error);
                    }
                });

                xhr.addEventListener('error', () => {
                    clearTimeout(timeout);
                    reject(new Error('Network error'));
                });

                xhr.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    reject(new Error('Upload cancelled'));
                });

                xhr.open('POST', `${API_ROOT}/api/shop/shop/create/products/`);
                Object.entries(headers).forEach(([key, value]) => {
                    xhr.setRequestHeader(key, value);
                });
                xhr.send(formData);
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            let result;
            try {
                result = await response.json();
                console.log('API Response:', result);
            } catch (e) {
                // If response is not JSON, throw the error from the xhr handler
                throw new Error(`Failed to parse response: ${response.statusText}`);
            }

            if (!response.ok) {
                // Extract error message from backend response
                let errorMessage = 'Failed to create product';
                if (result.error && result.message) {
                    errorMessage = result.message;
                    // Add details if available
                    if (result.details) {
                        if (typeof result.details === 'object') {
                            // If details is an object (validation errors), format it
                            const detailMessages = Object.entries(result.details)
                                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                                .join('; ');
                            errorMessage += ` - ${detailMessages}`;
                        } else {
                            errorMessage += ` - ${result.details}`;
                        }
                    }
                } else if (result.message) {
                    errorMessage = result.message;
                }
                throw new Error(errorMessage);
            }
            toast.success('Product created successfully!');
            navigate('/user-admin/products');
        } catch (error) {
            console.error('Error creating product:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Do not block initial render; show the form immediately and load options asynchronously

    return (
        <div className="w-full max-w-full lg:max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/user-admin/products')}
                    className="p-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
                    <p className="text-gray-600">Create a new product for your shop</p>
                </div>
                <div className="ml-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            console.log('Categories structure debug:');
                            console.log('Total categories:', categories.length);
                            const withParent = categories.filter(cat => (cat as any).parent);
                            console.log('Categories with parent:', withParent.length);
                            console.log('Sample with parent:', withParent[0]);
                            alert(`Categories: ${categories.length}, With parent: ${withParent.length}`);
                        }}
                    >
                        Debug Structure
                    </Button>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Basic Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Product Title *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter product title" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Enter product description"
                                                        rows={3}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="category_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Category *</FormLabel>
                                                    <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    aria-expanded={categoryOpen}
                                                                    className="w-full justify-between"
                                                                >
                                                                    {field.value
                                                                        ? getCategoryBreadcrumbLabel(categories.find((category) => String((category as any).id) === field.value)) || "Select category..."
                                                                        : "Search or select category..."}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-full p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Search categories..." />
                                                                <CommandList>
                                                                    <CommandEmpty>No categories found.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {categories.map((category) => {
                                                                            const c = category as unknown as ShopCategory & {
                                                                                parent?: ShopCategory | string | number;
                                                                                parent_title?: string;
                                                                                parent_name?: string;
                                                                                parent_category?: any;
                                                                                parent_id?: string | number;
                                                                            };

                                                                            // Try different ways to get parent title
                                                                            let parentTitle = '';

                                                                            // Method 1: parent is an object with title
                                                                            if (typeof c.parent === 'object' && c.parent && 'title' in c.parent) {
                                                                                parentTitle = c.parent.title;
                                                                            }
                                                                            // Method 2: parent is an object with name
                                                                            else if (typeof c.parent === 'object' && c.parent && 'name' in c.parent) {
                                                                                parentTitle = (c.parent as any).name;
                                                                            }
                                                                            // Method 3: parent_title field
                                                                            else if (c.parent_title) {
                                                                                parentTitle = c.parent_title;
                                                                            }
                                                                            // Method 4: parent_name field
                                                                            else if (c.parent_name) {
                                                                                parentTitle = c.parent_name;
                                                                            }
                                                                            // Method 5: parent_category field
                                                                            else if (c.parent_category && typeof c.parent_category === 'object') {
                                                                                parentTitle = c.parent_category.title || c.parent_category.name || '';
                                                                            }
                                                                            // Method 6: parent is a string (title directly)
                                                                            else if (typeof c.parent === 'string') {
                                                                                parentTitle = c.parent;
                                                                            }
                                                                            // Method 7: Look up parent by ID
                                                                            else if (c.parent_id) {
                                                                                const parentCategory = categories.find(cat => String(cat.id) === String(c.parent_id));
                                                                                if (parentCategory) {
                                                                                    parentTitle = (parentCategory as any).title || (parentCategory as any).name || '';
                                                                                }
                                                                            }

                                                                            // Build full breadcrumb label
                                                                            const label = getCategoryBreadcrumbLabel(c) || (parentTitle ? `${parentTitle} -> ${c.title}` : c.title);

                                                                            return (
                                                                                <CommandItem
                                                                                    key={String(c.id)}
                                                                                    value={label}
                                                                                    onSelect={() => {
                                                                                        field.onChange(String(c.id));
                                                                                        setCategoryOpen(false);
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={`mr-2 h-4 w-4 ${field.value === String(c.id) ? "opacity-100" : "opacity-0"
                                                                                            }`}
                                                                                    />
                                                                                    {label}
                                                                                </CommandItem>
                                                                            );
                                                                        })}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
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
                                                    <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    aria-expanded={brandOpen}
                                                                    className="w-full justify-between"
                                                                >
                                                                    {field.value
                                                                        ? brands.find((brand) => String(brand.id) === field.value)?.name || "Select brand..."
                                                                        : "Search or select brand..."}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-full p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Search brands..." />
                                                                <CommandList>
                                                                    <CommandEmpty>No brands found.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {brands.map((brand) => {
                                                                            const b = brand as unknown as ShopBrand;
                                                                            return (
                                                                                <CommandItem
                                                                                    key={String(b.id)}
                                                                                    value={b.name}
                                                                                    onSelect={() => {
                                                                                        field.onChange(String(b.id));
                                                                                        setBrandOpen(false);
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={`mr-2 h-4 w-4 ${field.value === String(b.id) ? "opacity-100" : "opacity-0"
                                                                                            }`}
                                                                                    />
                                                                                    {b.name}
                                                                                </CommandItem>
                                                                            );
                                                                        })}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pricing */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Pricing</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="price"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Actual Price (MRP) *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            placeholder="0.00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                                                    <FormLabel>Discounted Price</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            placeholder="0.00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
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
                                                    <FormLabel>Purchase Price *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            placeholder="0.00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="tax_rate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tax Rate %</FormLabel>
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
                                                            <SelectItem value="0">0%</SelectItem>
                                                            <SelectItem value="5">5%</SelectItem>
                                                            <SelectItem value="12">12%</SelectItem>
                                                            <SelectItem value="18">18%</SelectItem>
                                                            <SelectItem value="28">28%</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="stock_quantity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Stock Quantity *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Physical Dimensions & Unit */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Package className="h-5 w-5" />
                                        Physical Dimensions & Unit
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="weight"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Weight (kg)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.001"
                                                            placeholder="0.000"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="unit_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Default Unit</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select unit" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {units.map((unit) => (
                                                                <SelectItem key={unit.id} value={unit.id.toString()}>
                                                                    {unit.name} ({unit.code})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="length"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Length (cm)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="width"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Width (cm)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="height"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Height (cm)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="volume_m3"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Volume (m³)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.0001"
                                                        placeholder="0.0000"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Automatically calculated from length × width × height if not specified
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* Additional Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Additional Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="lead_time"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Lead Time (days)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="rating"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Rating (0-5)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max="5"
                                                            step="0.1"
                                                            placeholder="0"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Vehicle Compatibility Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Vehicle Compatibility</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* General Product Checkbox */}
                                    <FormField
                                        control={form.control}
                                        name="is_general_product"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={(checked) => {
                                                            field.onChange(checked);
                                                            if (checked) {
                                                                // Clear compatibility options when general is selected
                                                                form.setValue('compatibility_group_id', '');
                                                                form.setValue('compatible_variants', []);
                                                                setCompatibilityMode('none');
                                                                setSelectedCarMaker('');
                                                                setSelectedCarModel('');
                                                                setSelectedYear(undefined);
                                                                setSelectedVariants([]);
                                                                setCarModels([]);
                                                                setCarVariants([]);
                                                                setAvailableYears([]);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        General Product (Available for all vehicles)
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Check this if the product is compatible with all vehicle models and variants
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    {/* Three mutually exclusive options */}
                                    <div className="space-y-6">

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
                                                                value={selectedCarMaker || ''}
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
                                                                                {loadingCarModels ? 'Loading...' : 'No car models available'}
                                                                            </SelectItem>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}

                                                        {/* Year Selection */}
                                                        {selectedCarModel && (
                                                            <div>
                                                                <label className="text-sm font-medium">Year *</label>
                                                                <Select
                                                                    onValueChange={(value) => handleYearChange(parseInt(value))}
                                                                    value={selectedYear?.toString() || ''}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select year" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {availableYears.length > 0 ? (
                                                                            availableYears.map((year) => (
                                                                                <SelectItem key={year} value={year.toString()}>
                                                                                    {year}
                                                                                </SelectItem>
                                                                            ))
                                                                        ) : (
                                                                            <SelectItem value="loading" disabled>
                                                                                Loading years...
                                                                            </SelectItem>
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}

                                                        {/* Variant Selection */}
                                                        {selectedYear && (
                                                            <div>
                                                                <label className="text-sm font-medium">Vehicle Variants *</label>
                                                                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                                                                    {carVariants.length > 0 ? (
                                                                        carVariants.map((variant) => (
                                                                            <div key={variant.id} className="flex items-center space-x-2">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    id={variant.id}
                                                                                    checked={selectedVariants.includes(variant.id)}
                                                                                    onChange={() => handleVariantToggle(variant.id)}
                                                                                    className="rounded"
                                                                                />
                                                                                <label htmlFor={variant.id} className="text-sm">
                                                                                    {variant.name} {variant.year_start && variant.year_end ? `(${variant.year_start}-${variant.year_end})` : ''}
                                                                                </label>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-sm text-gray-500 p-2">
                                                                            Loading variants...
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
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Product Image */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Product Image</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {imagePreview ? (
                                            <div className="relative">
                                                <img
                                                    src={imagePreview}
                                                    alt="Product preview"
                                                    className="w-full h-48 object-cover rounded-lg"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={removeImage}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                <p className="text-sm text-gray-600">No image selected</p>
                                            </div>
                                        )}

                                        <div>
                                            <Label htmlFor="image" className="cursor-pointer">
                                                <div className="w-full p-2 border border-gray-300 rounded-lg text-center hover:bg-gray-50">
                                                    Choose Image
                                                </div>
                                            </Label>
                                            <input
                                                id="image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Additional Images */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Additional Images (Optional)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
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
                                                            className="absolute top-1 right-1 h-6 w-6 p-0"
                                                            onClick={() => removeAdditionalImage(index)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Upload additional images */}
                                        <div>
                                            <Label htmlFor="additional-images" className="cursor-pointer">
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50">
                                                    <Plus className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-600">Add more images</p>
                                                </div>
                                            </Label>
                                            <input
                                                id="additional-images"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleAdditionalImageUpload}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tags */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Tags</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {tags.map((tag) => (
                                            <div key={tag.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={tag.id}
                                                    checked={selectedTags.includes(tag.id)}
                                                    onChange={() => handleTagToggle(tag.id)}
                                                    className="rounded"
                                                />
                                                <Label htmlFor={tag.id} className="text-sm">
                                                    {tag.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="is_active"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between">
                                                <div>
                                                    <FormLabel>Active</FormLabel>
                                                    <FormDescription>Product is visible to customers</FormDescription>
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
                                            <FormItem className="flex items-center justify-between">
                                                <div>
                                                    <FormLabel>Available</FormLabel>
                                                    <FormDescription>Product is in stock</FormDescription>
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
                                            <FormItem className="flex items-center justify-between">
                                                <div>
                                                    <FormLabel>Bulk Order</FormLabel>
                                                    <FormDescription>Available for bulk orders</FormDescription>
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
                                            <FormItem className="flex items-center justify-between">
                                                <div>
                                                    <FormLabel>Cash on Delivery</FormLabel>
                                                    <FormDescription>Available for COD</FormDescription>
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
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Upload Progress */}
                    {loading && uploadProgress > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                <span>Uploading product...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/user-admin/products')}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Create Product
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
