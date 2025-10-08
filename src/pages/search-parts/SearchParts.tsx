import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Grid, List, ChevronRight, Wrench, Zap, Lightbulb, Cable, Shield, Settings, Cpu, Gauge } from 'lucide-react';
import { shopApi, shopProductsApi, categoryProductsApi } from '@/lib/api';
import VehicleSelector from '@/components/VehicleSelector';

// Domain types used in this page
interface Vehicle {
    id: string;
    maker: string;
    model: string;
    year: number;
    variant?: string;
    makerId?: string;
    modelId?: string;
    variantId?: string;
}

interface Category {
    id: number;
    name: string;
    icon?: React.ComponentType<{ className?: string }>;
    parent?: number;
    children?: Category[];
    ref_name?: string;
    category_icon?: string;
}

interface Part {
    product_id: string;
    title: string;
    price: number;
    discounted_price?: number;
    final_price?: number;
    purchase_price?: number;
    price_inclusive_tax: number;
    discount_amount?: number;
    discount_percentage?: number;
    image?: string;
    category?: { id: number; title: string; ref_name: string };
    brand?: { id: number; name: string };
    stock: number;
    is_active: boolean;
    rating?: number;
}

export default function SearchParts() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [parts, setParts] = useState<Part[]>([]);
    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        loadMainCategories();
    }, []);

    const loadMainCategories = async () => {
        try {
            setLoading(true);
            const response = await shopApi.get('/shop-main-categories/') as any;
            let categoriesData: any[] = [];
            if (response && response.data && Array.isArray(response.data)) categoriesData = response.data;
            else if (response && Array.isArray(response)) categoriesData = response;
            const mapped = categoriesData.map((cat: any) => ({
                id: cat.id,
                name: cat.title,
                icon: getCategoryIcon(cat.title),
                parent: cat.parent?.id,
                ref_name: cat.ref_name,
                category_icon: cat.category_icon
            }));
            setCategories(mapped);
            setCurrentCategory(null);
            setBreadcrumbs([]);
            setParts([]);
            setHasSearched(false);
        } catch (e) {
            console.error('Error loading main categories:', e);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const handleProductSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            setLoading(true);
            setHasSearched(true);
            const data = await shopProductsApi.search(searchQuery);
            if (Array.isArray(data)) setParts(data as unknown as Part[]);
            else setParts([]);
            setCategories([]);
            setCurrentCategory(null);
            setBreadcrumbs([]);
        } catch (e) {
            console.error('Error searching parts:', e);
            setParts([]);
        } finally {
            setLoading(false);
        }
    };

    const searchPartsByVehicle = async (vehicle: Vehicle) => {
        try {
            setLoading(true);
            setHasSearched(false); // Don't mark as searched, we want to show categories
            // Load main categories when vehicle is selected
            const response = await shopApi.get('/shop-main-categories/') as any;
            let categoriesData: any[] = [];
            if (response && response.data && Array.isArray(response.data)) categoriesData = response.data;
            else if (response && Array.isArray(response)) categoriesData = response;
            const mapped = categoriesData.map((cat: any) => ({
                id: cat.id,
                name: cat.title,
                icon: getCategoryIcon(cat.title),
                parent: cat.parent?.id,
                ref_name: cat.ref_name,
                category_icon: cat.category_icon
            }));
            setCategories(mapped);
            setCurrentCategory(null);
            setBreadcrumbs([]);
            setParts([]);
        } catch (error) {
            console.error('Error loading categories for vehicle:', error);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryIcon = (categoryName: string) => {
        const name = categoryName.toLowerCase();
        if (name.includes('maintenance') || name.includes('service')) return Wrench;
        if (name.includes('filter')) return Filter;
        if (name.includes('windscreen') || name.includes('cleaning')) return Zap;
        if (name.includes('accessory') || name.includes('accessories')) return Settings;
        if (name.includes('light') || name.includes('lighting')) return Lightbulb;
        if (name.includes('cable') || name.includes('control')) return Cable;
        if (name.includes('brake')) return Shield;
        if (name.includes('bearing')) return Gauge;
        if (name.includes('clutch')) return Settings;
        if (name.includes('electric') || name.includes('electronic')) return Cpu;
        return Filter;
    };

    const handleCategoryClick = async (category: Category) => {
        try {
            setLoading(true);

            // First, try to get products for this category with vehicle filtering
            const productParams: any = {
                category_id: category.id,
            };

            // Add vehicle parameters if selected
            if (selectedVehicle) {
                if (selectedVehicle.variantId) {
                    productParams.variant_id = selectedVehicle.variantId;
                } else if (selectedVehicle.modelId) {
                    productParams.model_id = selectedVehicle.modelId;
                    if (selectedVehicle.year) {
                        productParams.year = selectedVehicle.year;
                    }
                } else if (selectedVehicle.makerId) {
                    productParams.maker_id = selectedVehicle.makerId;
                }
            }

            console.log('🔍 Fetching products with params:', productParams);

            // Get products using the correct API
            const products = await categoryProductsApi.getProducts(productParams);
            console.log('📦 Products found:', products.length);

            if (products && products.length > 0) {
                // This category has products - show them
                console.log('✅ Using filtered products from categoryProductsApi:', products.length);
                setParts(Array.isArray(products) ? products : []);
                setCategories([]);
                setCurrentCategory(category);
                setBreadcrumbs(prev => (prev.some(b => b.id === category.id) ? prev : [...prev, category]));
                setHasSearched(true);
            } else {
                // No products found, check if this category has children
                console.log('🔍 No products found, checking for subcategories...');

                // Get category details to check for children
                const categoryResp = await shopApi.get(`/shop-product-category-list/${category.id}/`) as any;
                const categoryData = categoryResp?.data ?? categoryResp;

                const rawChildren = categoryData?.children ?? [];
                const children = (rawChildren || []).map((cat: any) => ({
                    id: cat.id,
                    name: cat.title,
                    icon: getCategoryIcon(cat.title),
                    parent: category.id,
                    ref_name: cat.ref_name,
                    category_icon: cat.category_icon,
                }));

                if (children.length > 0) {
                    // Has children - show subcategories
                    console.log('✅ Found subcategories:', children.length);
                    setCategories(children);
                    setCurrentCategory(category);
                    setBreadcrumbs(prev => (prev.some(b => b.id === category.id) ? prev : [...prev, category]));
                    setParts([]);
                    setHasSearched(false);
                } else {
                    // No children and no products - show empty results
                    console.log('🚫 No products or subcategories found');
                    setParts([]);
                    setCategories([]);
                    setCurrentCategory(category);
                    setBreadcrumbs(prev => (prev.some(b => b.id === category.id) ? prev : [...prev, category]));
                    setHasSearched(true);
                }
            }
        } catch (error) {
            console.error('Error loading category:', error);
            setParts([]);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            loadMainCategories();
            setCurrentCategory(null);
            setBreadcrumbs([]);
            setParts([]);
            setHasSearched(false);
        } else {
            const targetCategory = breadcrumbs[index];
            setBreadcrumbs(breadcrumbs.slice(0, index));
            handleCategoryClick(targetCategory);
        }
    };

    const renderCategoryGrid = () => (
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4`}>
            {categories.map((category) => (
                <Card key={category.id} className="cursor-pointer hover:shadow-lg transition-all duration-300 group" onClick={() => handleCategoryClick(category)}>
                    <CardContent className="p-4 text-center">
                        <div className="flex justify-center mb-6">
                            {category.category_icon ? (
                                <img
                                    src={category.category_icon}
                                    alt={category.name}
                                    className="w-24 h-24 object-contain"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        // Show fallback icon when image fails to load
                                        const fallbackIcon = target.nextElementSibling as HTMLElement;
                                        if (fallbackIcon) fallbackIcon.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            {(!category.category_icon || category.category_icon === '') && (
                                <div style={{ display: category.category_icon ? 'none' : 'flex' }} className="w-24 h-24 items-center justify-center">
                                    {category.icon ? (
                                        <category.icon className="h-16 w-16 text-indigo-600" />
                                    ) : (
                                        <Filter className="h-16 w-16 text-indigo-600" />
                                    )}
                                </div>
                            )}
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                            {category.name}
                        </h3>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    const renderPartsGrid = () => {
        console.log('🎨 renderPartsGrid called with parts:', parts.length, 'items');
        console.log('🎨 Parts data:', parts);
        return (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'grid-cols-1 gap-3'}`}>
                {parts.map((part) => (
                    <Card key={part.product_id} className="flex flex-col hover:shadow-lg transition-shadow duration-200">
                        {/* Product Image */}
                        <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                            {part.image ? (
                                <img
                                    src={part.image}
                                    alt={part.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                    <div className="text-gray-400 text-center">
                                        <div className="text-4xl mb-2">📦</div>
                                        <div className="text-sm">No Image</div>
                                    </div>
                                </div>
                            )}
                            {part.discount_percentage && part.discount_percentage > 0 && (
                                <div className="absolute top-2 left-2">
                                    <Badge variant="destructive" className="text-xs font-semibold">
                                        {part.discount_percentage}% OFF
                                    </Badge>
                                </div>
                            )}
                            {!part.is_active && (
                                <div className="absolute top-2 right-2">
                                    <Badge variant="secondary" className="text-xs">
                                        Out of Stock
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <CardContent className="flex-1 p-4">
                            {/* Product Title */}
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                                {part.title}
                            </h3>

                            {/* Pricing Information */}
                            <div className="space-y-2 mb-4">
                                {/* Regular Price */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Price:</span>
                                    <span className="text-lg font-semibold text-gray-900">
                                        ₹{part.price.toFixed(2)}
                                    </span>
                                </div>

                                {/* Discounted Price */}
                                {part.discounted_price && part.discounted_price !== part.price && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Discounted Price:</span>
                                        <span className="text-lg font-semibold text-green-600">
                                            ₹{part.discounted_price.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {/* Final Price (if different from regular price) */}
                                {part.final_price && part.final_price !== part.price && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Final Price:</span>
                                        <span className="text-xl font-bold text-indigo-600">
                                            ₹{part.final_price.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {/* Purchase Price (for admin/internal use) */}
                                {part.purchase_price && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Purchase Price:</span>
                                        <span className="text-sm text-gray-500">
                                            ₹{part.purchase_price.toFixed(2)}
                                        </span>
                                    </div>
                                )}

                                {/* Stock Information */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Stock:</span>
                                    <span className={`text-sm font-medium ${part.stock > 10 ? 'text-green-600' : part.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {part.stock} units
                                    </span>
                                </div>
                            </div>

                            {/* Category and Brand Info */}
                            <div className="space-y-1 mb-4 text-xs text-gray-500">
                                {part.category && (
                                    <div className="flex items-center justify-between">
                                        <span>Category:</span>
                                        <span className="truncate ml-2">{part.category.title}</span>
                                    </div>
                                )}
                                {part.brand && (
                                    <div className="flex items-center justify-between">
                                        <span>Brand:</span>
                                        <span className="truncate ml-2">{part.brand.name}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        {/* Action Button */}
                        <div className="p-4 border-t bg-gray-50">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-indigo-600 hover:text-indigo-700 border-indigo-600 hover:border-indigo-700 hover:bg-indigo-50"
                                disabled={!part.is_active || part.stock === 0}
                            >
                                {!part.is_active || part.stock === 0 ? 'Out of Stock' : 'View Details'}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-12">
                        <div className="flex items-center space-x-3">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/app-selection')} className="flex items-center space-x-1 text-sm">
                                <ArrowLeft className="h-3 w-3" />
                                <span>Back to Apps</span>
                            </Button>
                            <div className="h-4 w-px bg-gray-300" />
                            <h1 className="text-lg font-semibold text-gray-900">Search Parts</h1>
                        </div>
                        <div className="flex items-center space-x-2">
                            {parts.length > 0 && (
                                <div className="flex items-center space-x-1">
                                    <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')} className="h-7 px-2">
                                        <Grid className="h-3 w-3" />
                                    </Button>
                                    <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} className="h-7 px-2">
                                        <List className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Card className="mb-4">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="flex-1">
                                <Input placeholder="Search for any part, product name, or part number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleProductSearch()} className="w-full py-2" />
                            </div>
                            <Button onClick={handleProductSearch} disabled={loading} className="px-6 py-2">{loading ? 'Searching...' : 'Search Products'}</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-4">
                    <CardContent className="p-4">
                        <div className="mb-3">
                            <h2 className="text-lg font-bold"><span className="text-blue-900">Search by</span> <span className="text-blue-500">Vehicle</span></h2>
                        </div>
                        <div className="bg-blue-900 p-4 rounded-lg">
                            <div className="flex flex-col lg:flex-row gap-3">
                                <div className="flex-1">
                                    <VehicleSelector onVehicleSelect={(vehicle) => {
                                        setSelectedVehicle(vehicle);
                                        if (vehicle) {
                                            searchPartsByVehicle(vehicle);
                                        } else {
                                            // When vehicle is deselected, reload main categories
                                            loadMainCategories();
                                        }
                                    }} selectedVehicle={selectedVehicle} />
                                </div>
                                <div className="flex items-center">
                                    <Button onClick={() => selectedVehicle && searchPartsByVehicle(selectedVehicle)} disabled={!selectedVehicle || loading} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 font-semibold">{loading ? 'Loading...' : 'BROWSE CATEGORIES'}</Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {breadcrumbs.length > 0 && (
                    <div className="flex items-center space-x-1 mb-4">
                        <Button variant="ghost" size="sm" onClick={() => handleBreadcrumbClick(-1)} className="text-indigo-600 hover:text-indigo-700 text-xs h-6 px-2">All Categories</Button>
                        {breadcrumbs.map((category, index) => (
                            <React.Fragment key={category.id}>
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                                <Button variant="ghost" size="sm" onClick={() => handleBreadcrumbClick(index)} className="text-indigo-600 hover:text-indigo-700 text-xs h-6 px-2">{category.name}</Button>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {selectedVehicle && !searchQuery && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 text-sm">🚗</span>
                                </div>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-800">
                                    <span className="font-medium">Vehicle Selected:</span> {selectedVehicle.maker} {selectedVehicle.model} ({selectedVehicle.year})
                                </p>
                                {selectedVehicle.variant && (
                                    <p className="text-xs text-blue-700">
                                        Variant: {selectedVehicle.variant} (ID: {selectedVehicle.variantId || 'N/A'})
                                    </p>
                                )}
                                <p className="text-xs text-blue-600 mt-1">
                                    Products will be filtered to show only compatible parts for this vehicle.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-600">Loading...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {hasSearched && searchQuery && parts.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-semibold text-gray-900">Search Results</h2>
                                    <Badge variant="secondary" className="text-xs">{parts.length} parts found</Badge>
                                </div>
                                {renderPartsGrid()}
                            </div>
                        )}
                        {hasSearched && searchQuery && parts.length === 0 && (
                            <div className="text-center py-8 mb-6">
                                <Search className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                                <h3 className="text-base font-medium text-gray-900 mb-2">No products found</h3>
                                <p className="text-sm text-gray-600">Try different keywords or browse categories below.</p>
                            </div>
                        )}
                        {!searchQuery && categories.length > 0 && (
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 mb-3">{currentCategory ? `${currentCategory.name} Categories` : 'Categories'}</h2>
                                {renderCategoryGrid()}
                            </div>
                        )}
                        {!searchQuery && parts.length > 0 && categories.length === 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-semibold text-gray-900">
                                        {currentCategory ? `${currentCategory.name} Products` : 'Products'}
                                        {selectedVehicle && ` for ${selectedVehicle.maker} ${selectedVehicle.model}`}
                                    </h2>
                                    <Badge variant="secondary" className="text-xs">{parts.length} products found</Badge>
                                </div>
                                {renderPartsGrid()}
                            </div>
                        )}
                        {!searchQuery && !hasSearched && categories.length === 0 && parts.length === 0 && (
                            <div className="text-center py-8">
                                <Search className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                                <h3 className="text-base font-medium text-gray-900 mb-2">Search for Parts</h3>
                                <p className="text-sm text-gray-600">Use the search bar above, select your vehicle, or browse categories below.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}