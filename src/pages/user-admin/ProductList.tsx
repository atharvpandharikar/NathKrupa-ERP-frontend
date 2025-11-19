import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    LayoutGrid,
    Download,
    FileSpreadsheet,
    FileText,
    Loader2,
    RefreshCw,
    History,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";
import { shopProductsApi, shopCategoriesApi, ShopProduct, SHOP_API_ROOT, getTokens } from '@/lib/shop-api';
import { exportService, ExportJob } from '@/services/exportService';
import { useToast } from '@/hooks/use-toast';
import { useExportNotifications } from '@/context/ExportNotificationContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from '@/components/ui/pagination';

const PAGE_SIZE = 20;
const MAX_PAGES_TO_SHOW = 5;

export default function ProductList() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { trackJob } = useExportNotifications();
    const queryClient = useQueryClient();
    const isInitialMount = useRef(true);
    const previousPathname = useRef<string>('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [showActiveOnly, setShowActiveOnly] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Export related state
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
    const [exportVendorId, setExportVendorId] = useState<string>('all');
    const [exportCategoryId, setExportCategoryId] = useState<string>('all');
    const [exportStartDate, setExportStartDate] = useState<string>('');
    const [exportEndDate, setExportEndDate] = useState<string>('');
    const [currentExportJob, setCurrentExportJob] = useState<ExportJob | null>(null);
    const [categories, setCategories] = useState<any[]>([]);

    // Debounce search term - fixed to prevent focus loss
    const prevSearchTermRef = useRef<string>('');
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only update if search term actually changed
            if (searchTerm !== prevSearchTermRef.current) {
                setDebouncedSearchTerm(searchTerm);
                prevSearchTermRef.current = searchTerm;
                // Reset to page 1 only when search term actually changes
                setCurrentPage(1);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]); // Only depend on searchTerm to prevent unnecessary re-renders

    // Fetch products with React Query (cached)
    const { data: productsData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['products', currentPage, debouncedSearchTerm, showActiveOnly],
        queryFn: async () => {
            // Convert page and page_size to limit and offset (backend expects limit/offset)
            const offset = (currentPage - 1) * PAGE_SIZE;
            const limit = PAGE_SIZE;

            const params: Record<string, any> = {
                ordering: '-id', // Backend uses -id as default, not -created_at
                limit: limit,
                offset: offset,
            };

            // Add is_active filter to backend params (server-side filtering for proper pagination)
            if (showActiveOnly) {
                params.is_active = 'true';
            }

            // If search term exists, use search API, otherwise use paginated list
            if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
                const searchResponse = await shopProductsApi.searchTypesense(debouncedSearchTerm, {
                    limit: PAGE_SIZE,
                    page: currentPage,
                });

                let products: ShopProduct[] = [];
                if (searchResponse && !searchResponse.error && Array.isArray(searchResponse.data)) {
                    products = searchResponse.data;
                } else if (Array.isArray(searchResponse)) {
                    products = searchResponse;
                }

                // Apply active filter client-side for search results (Typesense search doesn't support is_active filter)
                if (showActiveOnly) {
                    products = products.filter(p => p.is_active);
                }

                return {
                    data: products,
                    count: searchResponse.count || products.length,
                };
            } else {
                // Use paginated list API with limit/offset (backend handles is_active filter)
                const response = await shopProductsApi.listPaginated(params);
                const products = response.data || [];

                return {
                    data: products,
                    count: response.count || products.length,
                };
            }
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });

    const products = productsData?.data || [];
    const totalCount = productsData?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Fetch categories
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await shopCategoriesApi.list();
                setCategories(data);
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };
        loadCategories();
    }, []);

    // Refresh data when navigating back from add/edit pages
    useEffect(() => {
        if (isInitialMount.current) {
            previousPathname.current = location.pathname;
            isInitialMount.current = false;
            return;
        }

        const currentPath = location.pathname;
        const prevPath = previousPathname.current;

        const isProductListPage = currentPath === '/user-admin/products';
        const isFromAddEdit = prevPath.includes('/products/add') || prevPath.includes('/products/edit');

        if (isProductListPage && isFromAddEdit && prevPath !== currentPath) {
            // Invalidate cache to refresh data
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }

        previousPathname.current = currentPath;
    }, [location.pathname, queryClient]);

    // Update local job state (notifications handled globally by ExportNotificationProvider)
    useEffect(() => {
        const unsubscribe = exportService.subscribe((job) => {
            if (currentExportJob && job.taskId === currentExportJob.taskId) {
                setCurrentExportJob(job);
                if (job.status === 'SUCCESS' || job.status === 'FAILURE') {
                    setCurrentExportJob(null);
                }
            }
        });

        return unsubscribe;
    }, [currentExportJob]);

    // Delete mutation with cache invalidation
    const deleteMutation = useMutation({
        mutationFn: (productId: string) => shopProductsApi.delete(productId),
        onSuccess: () => {
            // Invalidate cache to refresh the list immediately
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({
                title: 'Product deleted',
                description: 'The product has been successfully deleted.',
                variant: 'default',
            });
        },
        onError: (error: any) => {
            console.error('Error deleting product:', error);
            toast({
                title: 'Delete failed',
                description: error?.message || 'Failed to delete product. Please try again.',
                variant: 'destructive',
            });
        },
    });

    const handleEdit = (productId: string) => {
        navigate(`/user-admin/products/edit/${productId}`);
    };

    const handleDelete = async (productId: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            deleteMutation.mutate(productId);
        }
    };

    const handleView = (productId: string) => {
        navigate(`/user-admin/products/view/${productId}`);
    };

    const handleAddProduct = () => {
        navigate('/user-admin/products/add');
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Scroll to top when page changes
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Helper function to download files with authentication
    const downloadAuthenticatedFile = async (url: string, defaultFilename: string) => {
        try {
            const tokens = getTokens();

            if (!tokens?.access) {
                alert("Authentication required. Please log in again.");
                return;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${tokens.access}`,
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert("Session expired. Please log in again.");
                } else if (response.status === 404) {
                    alert("File not found. The report may have been deleted.");
                } else {
                    alert(`Failed to download: ${response.statusText}`);
                }
                return;
            }

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = defaultFilename;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download report. Please try again.');
        }
    };

    const handleExportProducts = async () => {
        setShowExportDialog(false);

        setTimeout(() => {
            toast({
                title: 'Export Request Submitted',
                description: 'Your export request is being processed in the background. You can continue working and we will notify you when it\'s ready for download.',
                variant: 'info',
                duration: 6000,
            });
        }, 100);

        try {
            const taskId = await exportService.startExport({
                format: exportFormat,
                vendor_id: exportVendorId !== 'all' ? exportVendorId : undefined,
                category_id: exportCategoryId !== 'all' ? exportCategoryId : undefined,
                start_date: exportStartDate || undefined,
                end_date: exportEndDate || undefined,
            });

            const job = exportService.getJob(taskId);
            if (job) {
                setCurrentExportJob(job);
                trackJob(taskId);
            }
        } catch (error: any) {
            console.error('Error exporting products:', error);
            const errorMessage = error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to export products. Please try again.';
            toast({
                title: 'Export Failed',
                description: errorMessage,
                variant: 'error',
                duration: 5000,
            });
        }
    };

    const resolveProductImageUrl = (product: ShopProduct): string | null => {
        const candidate = (product as any).image || ((product as any).images && (product as any).images[0]?.image) || '';
        if (!candidate) {
            return null;
        }
        if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
            return candidate;
        }
        if (candidate.includes('amazonaws.com') || candidate.includes('s3.')) {
            return candidate;
        }
        if (candidate.startsWith('/media/') || candidate.startsWith('/static/')) {
            return `${SHOP_API_ROOT}${candidate}`;
        }
        const path = candidate.startsWith('/') ? candidate : `/${candidate}`;
        const fullUrl = `${SHOP_API_ROOT}${path}`;
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

    // Calculate stats from all products (we need to fetch all for accurate stats)
    const statsQuery = useQuery({
        queryKey: ['products-stats'],
        queryFn: async () => {
            const response = await shopProductsApi.listPaginated({ page_size: 1000 });
            return response.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const allProductsForStats = statsQuery.data || [];
    const totalProducts = totalCount; // Use totalCount from paginated query
    const activeProducts = allProductsForStats.filter(p => p.is_active).length;
    const inactiveProducts = allProductsForStats.filter(p => !p.is_active).length;
    const lowStockProducts = allProductsForStats.filter(p => ((p as any).stock_quantity ?? p.stock ?? 0) <= 5).length;

    const renderPageNumbers = () => {
        if (totalPages <= 1) return null;
        let start = Math.max(currentPage - Math.floor(MAX_PAGES_TO_SHOW / 2), 1);
        const end = Math.min(start + MAX_PAGES_TO_SHOW - 1, totalPages);
        if (end - start < MAX_PAGES_TO_SHOW - 1) {
            start = Math.max(end - MAX_PAGES_TO_SHOW + 1, 1);
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
            i => (
                <PaginationItem key={i}>
                    <PaginationLink
                        href="#"
                        isActive={currentPage === i}
                        onClick={e => {
                            e.preventDefault();
                            handlePageChange(i);
                        }}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>
            ),
        );
    };

    if (isLoading && !productsData) {
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
                        <p className="text-sm text-muted-foreground">Total products: {totalCount}</p>
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
                        onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ['products'] });
                            refetch();
                        }}
                        size="sm"
                        variant="outline"
                        className="text-sm"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => navigate('/user-admin/export-history')}
                        size="sm"
                        variant="outline"
                        className="text-sm"
                    >
                        <History className="w-4 h-4 mr-1" />
                        History
                    </Button>
                    <Button
                        onClick={() => setShowExportDialog(true)}
                        size="sm"
                        variant="outline"
                        className="text-sm"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Export
                    </Button>
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
                            onCheckedChange={(checked) => {
                                setShowActiveOnly(checked);
                                setCurrentPage(1); // Reset to page 1 when filter changes
                            }}
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
                        <div className="text-lg font-bold text-indigo-600">{totalProducts}</div>
                        <div className="text-xs text-muted-foreground">Total Products</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <div className="text-lg font-bold text-green-600">
                            {activeProducts}
                        </div>
                        <div className="text-xs text-muted-foreground">Active Products</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <div className="text-lg font-bold text-orange-600">
                            {inactiveProducts}
                        </div>
                        <div className="text-xs text-muted-foreground">Inactive Products</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3">
                        <div className="text-lg font-bold text-red-600">
                            {lowStockProducts}
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
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax (%)</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={13} className="px-2 py-4 text-center">
                                                <div className="flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Loading products...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : isError ? (
                                        <tr>
                                            <td colSpan={13} className="px-2 py-4 text-center text-red-500">
                                                Error loading products: {(error as Error)?.message || 'Unknown error'}
                                            </td>
                                        </tr>
                                    ) : products.length === 0 ? (
                                        <tr>
                                            <td colSpan={13} className="px-2 py-4 text-center text-gray-500">
                                                No products found
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((product, index) => (
                                            <tr key={product.product_id} className="hover:bg-gray-50">
                                                <td className="px-2 py-2 text-xs text-gray-900">
                                                    {(currentPage - 1) * PAGE_SIZE + index + 1}
                                                </td>
                                                <td className="px-2 py-2">
                                                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                                        {(() => {
                                                            const src = resolveProductImageUrl(product);
                                                            return src ? (
                                                                <img
                                                                    src={src}
                                                                    alt={product.title}
                                                                    className="w-full h-full object-cover rounded"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        const s = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                                        if (s) s.style.display = 'block';
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
                                                    {product.purchase_price ? formatPrice(product.purchase_price) : '-'}
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
                                                            disabled={deleteMutation.isPending}
                                                        >
                                                            {deleteMutation.isPending ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3 h-3" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-muted/20 flex flex-col items-center justify-between gap-4 border-t p-4 sm:flex-row">
                                <div className="text-muted-foreground text-sm">
                                    Showing{' '}
                                    <span className="text-foreground font-medium">
                                        {totalCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
                                    </span>{' '}
                                    to{' '}
                                    <span className="text-foreground font-medium">
                                        {Math.min(currentPage * PAGE_SIZE, totalCount)}
                                    </span>{' '}
                                    of{' '}
                                    <span className="text-foreground font-medium">{totalCount}</span>{' '}
                                    products
                                </div>

                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationLink
                                                href="#"
                                                onClick={e => {
                                                    e.preventDefault();
                                                    handlePageChange(1);
                                                }}
                                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                                aria-label="First page"
                                            >
                                                <ChevronsLeft className="h-4 w-4" />
                                            </PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={e => {
                                                    e.preventDefault();
                                                    if (currentPage > 1) handlePageChange(currentPage - 1);
                                                }}
                                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        {renderPageNumbers()}
                                        {totalPages > MAX_PAGES_TO_SHOW && currentPage + 2 < totalPages && (
                                            <PaginationItem>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        )}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={e => {
                                                    e.preventDefault();
                                                    if (currentPage < totalPages) handlePageChange(currentPage + 1);
                                                }}
                                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink
                                                href="#"
                                                onClick={e => {
                                                    e.preventDefault();
                                                    handlePageChange(totalPages);
                                                }}
                                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                                aria-label="Last page"
                                            >
                                                <ChevronsRight className="h-4 w-4" />
                                            </PaginationLink>
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
                        {isLoading ? (
                            <div className="col-span-full text-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Loading products...</p>
                            </div>
                        ) : isError ? (
                            <div className="col-span-full text-center py-8 text-red-500">
                                Error loading products: {(error as Error)?.message || 'Unknown error'}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-gray-500">
                                No products found
                            </div>
                        ) : (
                            products.map((product) => (
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
                                                    const src = resolveProductImageUrl(product);
                                                    return src ? (
                                                        <img
                                                            src={src}
                                                            alt={product.title}
                                                            className="w-full h-full object-cover rounded"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                const s = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                                if (s) s.style.display = 'block';
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
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    {deleteMutation.isPending ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3 h-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    {/* Pagination for Grid View */}
                    {totalPages > 1 && (
                        <div className="bg-muted/20 flex flex-col items-center justify-between gap-4 border-t p-4 mt-4 sm:flex-row">
                            <div className="text-muted-foreground text-sm">
                                Showing{' '}
                                <span className="text-foreground font-medium">
                                    {totalCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
                                </span>{' '}
                                to{' '}
                                <span className="text-foreground font-medium">
                                    {Math.min(currentPage * PAGE_SIZE, totalCount)}
                                </span>{' '}
                                of{' '}
                                <span className="text-foreground font-medium">{totalCount}</span>{' '}
                                products
                            </div>

                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                handlePageChange(1);
                                            }}
                                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                            aria-label="First page"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </PaginationLink>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                if (currentPage > 1) handlePageChange(currentPage - 1);
                                            }}
                                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    {renderPageNumbers()}
                                    {totalPages > MAX_PAGES_TO_SHOW && currentPage + 2 < totalPages && (
                                        <PaginationItem>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    )}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                if (currentPage < totalPages) handlePageChange(currentPage + 1);
                                            }}
                                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                handlePageChange(totalPages);
                                            }}
                                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                            aria-label="Last page"
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </PaginationLink>
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </>
            )}

            {/* Empty State */}
            {products.length === 0 && !isLoading && (
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

            {/* Export Dialog */}
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Export Products</DialogTitle>
                        <DialogDescription>
                            Export products to Excel or PDF with optional filters
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Format Selection */}
                        <div className="space-y-2">
                            <Label>Export Format</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={exportFormat === 'excel' ? 'default' : 'outline'}
                                    onClick={() => setExportFormat('excel')}
                                    className="flex-1"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    Excel
                                </Button>
                                <Button
                                    type="button"
                                    variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                                    onClick={() => setExportFormat('pdf')}
                                    className="flex-1"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    PDF
                                </Button>
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={exportCategoryId} onValueChange={setExportCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Vendor Filter */}
                        <div className="space-y-2">
                            <Label>Vendor/Seller ID</Label>
                            <Input
                                placeholder="Enter vendor ID or leave blank for all"
                                value={exportVendorId === 'all' ? '' : exportVendorId}
                                onChange={(e) => setExportVendorId(e.target.value || 'all')}
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank to export all vendors. Enter a specific vendor UUID to filter.
                            </p>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date (Optional)</Label>
                                <Input
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date (Optional)</Label>
                                <Input
                                    type="date"
                                    value={exportEndDate}
                                    onChange={(e) => setExportEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Info Message */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-start gap-2">
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium mb-1">Background Processing</p>
                                    <p className="text-xs">
                                        Your export will process in the background. You can continue working and will be notified when it's ready.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={() => {
                                    setShowExportDialog(false);
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleExportProducts}
                                className="flex-1"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Start Export
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
