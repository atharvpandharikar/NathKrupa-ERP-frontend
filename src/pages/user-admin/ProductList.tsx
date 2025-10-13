import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Package,
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    Filter,
    Box,
    Grid3X3,
    List,
    LayoutGrid
} from "lucide-react";
import { shopProductsApi, ShopProduct, SHOP_API_ROOT } from '@/lib/shop-api';

export default function ProductList() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<ShopProduct[]>([]);
    const [showActiveOnly, setShowActiveOnly] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        let filtered = products.filter(product =>
            product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.brand?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (showActiveOnly) {
            filtered = filtered.filter(product => product.is_active);
        }

        setFilteredProducts(filtered);
    }, [products, searchTerm, showActiveOnly]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await shopProductsApi.list();
            console.log('📦 Loaded products:', data.length);
            console.log('📦 Sample product data:', data[0]);
            console.log('📦 Sample product image:', data[0]?.image);
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (productId: string) => {
        navigate(`/user-admin/products/edit/${productId}`);
    };

    const handleDelete = async (productId: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await shopProductsApi.delete(productId);
                await loadProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
            }
        }
    };

    const handleView = (productId: string) => {
        navigate(`/user-admin/products/view/${productId}`);
    };

    const handleAddProduct = () => {
        navigate('/user-admin/products/add');
    };

    const resolveProductImageUrl = (product: ShopProduct): string | null => {
        const candidate = (product as any).image || ((product as any).images && (product as any).images[0]?.image) || '';
        console.log('🖼️ Resolving image for product:', product.title, 'candidate:', candidate);
        if (!candidate) {
            console.log('🖼️ No image candidate found');
            return null;
        }
        if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
            console.log('🖼️ Full URL found:', candidate);
            return candidate;
        }
        // Handle S3 URLs - they should already be full URLs from the backend
        if (candidate.includes('amazonaws.com') || candidate.includes('s3.')) {
            console.log('🖼️ S3 URL found:', candidate);
            return candidate;
        }
        // Handle relative URLs - don't prepend API root for image URLs
        if (candidate.startsWith('/media/') || candidate.startsWith('/static/')) {
            console.log('🖼️ Media/Static URL found:', candidate);
            return `${SHOP_API_ROOT}${candidate}`;
        }
        // Handle other relative URLs
        const path = candidate.startsWith('/') ? candidate : `/${candidate}`;
        const fullUrl = `${SHOP_API_ROOT}${path}`;
        console.log('🖼️ Constructed URL:', fullUrl);
        return fullUrl;
    };

    const getStatusBadge = (product: ShopProduct) => {
        if (!product.is_active) {
            return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>;
        }
        if ((product as any).stock_quantity !== undefined ? (product as any).stock_quantity <= 5 : (product.stock ?? 0) <= 5) {
            return <Badge variant="destructive">Low Stock</Badge>;
        }
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>;
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(price);
    };

    const calculateDiscountedPrice = (product: ShopProduct) => {
        // Handle both percentage and fixed amount discounts
        if (product.discount_amount && product.discount_amount > 0) {
            return product.price - product.discount_amount;
        } else if (product.discount_percentage && product.discount_percentage > 0) {
            return product.price - (product.price * product.discount_percentage / 100);
        }
        return product.price;
    };

    const calculateTaxIncludedPrice = (price: number, taxRate: number) => {
        return price + (price * taxRate / 100);
    };

    const calculateFinalPrice = (product: ShopProduct) => {
        const discountedPrice = calculateDiscountedPrice(product);
        const taxRate = (product as any).tax_rate ?? product.taxes ?? 0;
        return calculateTaxIncludedPrice(discountedPrice, taxRate);
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="bg-white rounded-lg p-6">
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Box className="w-6 h-6 text-indigo-600" />
                    <div>
                        <h1 className="text-lg font-bold">Product Management</h1>
                        <p className="text-sm text-muted-foreground">Total products: {products.length}</p>
                    </div>
                </div>
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-full lg:w-64 text-sm"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                        <Search className="w-4 h-4 mr-1" />
                        Search
                    </Button>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 border rounded-lg p-1">
                        <Button
                            size="sm"
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            onClick={() => setViewMode('table')}
                            className="px-2 py-1 h-8"
                        >
                            <List className="w-3 h-3" />
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === 'grid' ? 'default' : 'ghost'}
                            onClick={() => setViewMode('grid')}
                            className="px-2 py-1 h-8"
                        >
                            <LayoutGrid className="w-3 h-3" />
                        </Button>
                    </div>

                    <Button
                        onClick={handleAddProduct}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-sm"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Product
                    </Button>
                    <div className="flex items-center gap-1">
                        <Switch
                            checked={showActiveOnly}
                            onCheckedChange={setShowActiveOnly}
                            className="scale-75"
                        />
                        <span className="text-xs text-gray-600">Show Active</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <Card>
                    <CardContent className="p-3">
                        <div className="text-lg font-bold text-indigo-600">{products.length}</div>
                        <div className="text-xs text-muted-foreground">Total Products</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <div className="text-lg font-bold text-green-600">
                            {products.filter(p => p.is_active).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Active Products</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <div className="text-lg font-bold text-orange-600">
                            {products.filter(p => !p.is_active).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Inactive Products</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <div className="text-lg font-bold text-red-600">
                            {products.filter(p => ((p as any).stock_quantity ?? p.stock ?? 0) <= 5).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Low Stock</div>
                    </CardContent>
                </Card>
            </div>

            {/* Table View */}
            {viewMode === 'table' && (
                <Card className="w-full overflow-hidden">
                    <CardContent className="p-0">
                        <div className="w-full">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax (%)</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredProducts.map((product, index) => (
                                        <tr key={product.product_id} className="hover:bg-gray-50">
                                            <td className="px-2 py-2 text-xs text-gray-900">
                                                {index + 1}
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                                    {(() => {
                                                        const src = resolveProductImageUrl(product); return src ? (
                                                            <img
                                                                src={src}
                                                                alt={product.title}
                                                                className="w-full h-full object-cover rounded"
                                                                onError={(e) => {
                                                                    console.error('🖼️ Image failed to load:', src);
                                                                    e.currentTarget.style.display = 'none';
                                                                    const s = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                                    if (s) s.style.display = 'block';
                                                                }}
                                                                onLoad={() => {
                                                                    console.log('🖼️ Image loaded successfully:', src);
                                                                }}
                                                            />
                                                        ) : null;
                                                    })()}
                                                    <span className="text-xs text-gray-400" style={{ display: resolveProductImageUrl(product) ? 'none' : 'block' }}>📦</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <div className="text-xs font-medium text-gray-900 truncate" title={product.title}>
                                                    {product.title}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-xs text-gray-900">
                                                <div className="truncate" title={product.brand?.name || '-'}>
                                                    {product.brand?.name || '-'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-xs text-gray-900">
                                                <div className="truncate" title={product.category?.title || '-'}>
                                                    {product.category?.title || '-'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-xs text-gray-900">
                                                <div className="space-y-0.5">
                                                    <div className="font-medium">{formatPrice(product.price)}</div>
                                                    {((product.discount_percentage ?? 0) > 0 || (product.discount_amount ?? 0) > 0) && (
                                                        <div className="text-green-600 text-xs">
                                                            -{formatPrice(product.price - calculateDiscountedPrice(product))}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-500">
                                                        Inc. Tax: {formatPrice(calculateFinalPrice(product))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-xs text-gray-900 text-center">
                                                {(product as any).tax_rate ?? product.taxes ?? 0}%
                                            </td>
                                            <td className="px-2 py-2 text-xs text-gray-900 text-center">
                                                {product.hsn_code || '-'}
                                            </td>
                                            <td className="px-2 py-2 text-xs text-gray-900 text-center">
                                                {product.barcode || '-'}
                                            </td>
                                            <td className="px-2 py-2 text-xs text-gray-900 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-medium">{(product as any).stock_quantity ?? product.stock}</span>
                                                    {((product as any).stock_quantity ?? product.stock ?? 0) <= 5 && (
                                                        <span className="text-xs text-red-600">Low</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <Badge
                                                    variant={product.is_active ? "default" : "secondary"}
                                                    className={`text-xs px-1.5 py-0.5 ${product.is_active
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                >
                                                    {product.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleView(product.product_id)}
                                                        className="p-1 h-6 w-6"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEdit(product.product_id)}
                                                        className="p-1 h-6 w-6"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(product.product_id)}
                                                        className="p-1 h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
                    {filteredProducts.map((product) => (
                        <Card key={product.product_id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-sm line-clamp-2">{product.title}</CardTitle>
                                        <CardDescription className="mt-1 text-xs">
                                            {product.description || 'No description'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge
                                            variant={product.is_active ? "default" : "secondary"}
                                            className={`text-xs px-1.5 py-0.5 ${product.is_active
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {product.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    {/* Product Image */}
                                    <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                                        {(() => {
                                            const src = resolveProductImageUrl(product); return src ? (
                                                <img
                                                    src={src}
                                                    alt={product.title}
                                                    className="w-full h-full object-cover rounded"
                                                    onError={(e) => {
                                                        console.error('🖼️ Image failed to load:', src);
                                                        e.currentTarget.style.display = 'none';
                                                        const s = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                        if (s) s.style.display = 'block';
                                                    }}
                                                    onLoad={() => {
                                                        console.log('🖼️ Image loaded successfully:', src);
                                                    }}
                                                />
                                            ) : null;
                                        })()}
                                        <Package className="w-8 h-8 text-gray-400" style={{ display: resolveProductImageUrl(product) ? 'none' : 'block' }} />
                                    </div>

                                    {/* Product Details */}
                                    <div className="space-y-1">
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">Price:</span> {formatPrice(product.price)}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">Stock:</span> {(product as any).stock_quantity ?? product.stock}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">Brand:</span> {product.brand?.name || 'No brand'}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            <span className="font-medium">Category:</span> {product.category?.title || 'No category'}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 pt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleView(product.product_id)}
                                            className="flex-1 text-xs h-7"
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            View
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEdit(product.product_id)}
                                            className="flex-1 text-xs h-7"
                                        >
                                            <Edit className="w-3 h-3 mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(product.product_id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {filteredProducts.length === 0 && !loading && (
                <Card className="text-center py-12">
                    <CardContent>
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm ? 'No products match your search criteria.' : 'Get started by adding your first product.'}
                        </p>
                        <Button
                            onClick={handleAddProduct}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Product
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}