import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Search,
    Eye,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Package,
    Loader2,
    Plus,
    Grid3X3,
    List,
    X
} from 'lucide-react';
import { shopCategoriesApi, shopApi, ShopCategory, SHOP_API_ROOT, authHeaders } from '@/lib/shop-api';
import optimizedShopApi from '@/lib/optimized-shop-api';

// Use ShopCategory directly - it now includes displayTitle and children_count

// Component to handle image loading with fallback
function CategoryImage({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactNode }) {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    if (imageError) {
        return <>{fallback}</>;
    }

    return (
        <div className="w-12 h-12 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-gray-100 rounded flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-contain rounded"
                loading="lazy"
                onError={() => {
                    setImageError(true);
                    setIsLoading(false);
                }}
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
}

// Function to build breadcrumb path for categories
const buildBreadcrumbPath = (
    category: ShopCategory,
    categoryMap: Map<string, ShopCategory>,
    memo: Map<string, string>
): string => {
    const id = category.id.toString();
    const cached = memo.get(id);
    if (cached) return cached;

    let parentId: string | null = null;
    if (typeof category.parent === 'string' && category.parent.trim() !== '') {
        parentId = category.parent;
    } else if (typeof category.parent === 'number') {
        parentId = (category.parent as any).toString();
    } else if (category.parent && typeof category.parent === 'object' && 'id' in category.parent) {
        parentId = (category.parent as any).id?.toString() || null;
    }

    let path = category.title;
    if (parentId) {
        const parent = categoryMap.get(parentId);
        if (parent) {
            const parentPath = buildBreadcrumbPath(parent, categoryMap, memo);
            path = `${parentPath} > ${category.title}`;
        }
    }

    memo.set(id, path);
    return path;
};

// Function to build categories with breadcrumb display names
const buildCategoriesWithBreadcrumbs = (categories: ShopCategory[]): ShopCategory[] => {
    const categoryMap = new Map<string, ShopCategory>();
    const processedCategories: ShopCategory[] = [];
    const memo = new Map<string, string>();

    categories.forEach(category => {
        categoryMap.set(category.id.toString(), category);
    });

    categories.forEach(category => {
        const breadcrumbTitle = buildBreadcrumbPath(category, categoryMap, memo);
        processedCategories.push({
            ...category,
            displayTitle: breadcrumbTitle,
            children_count: category.children_count !== undefined ? category.children_count : 0
        });
    });

    processedCategories.sort((a, b) => {
        const aPath = a.displayTitle || a.title;
        const bPath = b.displayTitle || b.title;
        return aPath.localeCompare(bPath);
    });

    return processedCategories;
};

export default function CategoryList() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<ShopCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ShopCategory | null>(null);
    const [formErrors, setFormErrors] = useState<{ title?: string; ref_name?: string; parent_id?: string; form?: string }>({});
    const [form, setForm] = useState<{
        title: string;
        ref_name: string;
        parent_id?: string | null;
        category_icon?: File | null;
    }>({
        title: "",
        ref_name: "",
        parent_id: null,
        category_icon: null
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;
    const [parentSearchTerm, setParentSearchTerm] = useState('');

    // Debounce search term with improved logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1); // Reset to first page when searching
        }, 500); // Increased debounce time to 500ms

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchCategories();
    }, [debouncedSearchTerm]); // Removed currentPage dependency to fix search issues

    const fetchCategories = async () => {
        try {
            setLoading(true);

            // Use optimized cached API to reduce calls and improve speed
            const data = await optimizedShopApi.categories.list();
            console.log('✅ Categories loaded:', data.length);

            if (Array.isArray(data)) {
                setCategories(data);

                // Filter based on search term
                let filteredData = data;
                if (debouncedSearchTerm) {
                    filteredData = data.filter(category =>
                        category.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                        category.ref_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                        category.slug?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                    );
                }

                setTotalPages(Math.ceil(filteredData.length / pageSize));
            } else {
                console.error('Invalid categories data format:', data);
                setCategories([]);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            setCategories([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (id: string) => {
        navigate(`/user-admin/categories/view/${id}`);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete category "${name}"?`)) return;

        try {
            await shopCategoriesApi.delete(id);
            await fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const handleEdit = (category: ShopCategory) => {
        setEditing(category);

        // Extract parent ID properly
        let parentId: string | null = null;
        if (typeof category.parent === 'string') {
            parentId = category.parent;
        } else if (category.parent && typeof category.parent === 'object' && 'id' in category.parent) {
            parentId = (category.parent as any).id?.toString() || null;
        }

        setForm({
            title: category.title || "",
            ref_name: category.ref_name || "",
            parent_id: parentId,
            category_icon: null
        });
        setFormErrors({});

        // Set parent search term to show current parent
        if (parentId) {
            const parentCategory = breadcrumbCategories.find(pc => pc.id === parentId);
            setParentSearchTerm(parentCategory ? (parentCategory.displayTitle || parentCategory.title) : "");
        } else {
            setParentSearchTerm("");
        }

        setOpen(true);
    };

    const handleCreate = () => {
        console.log('Creating new category...');
        setEditing(null);
        setForm({
            title: "",
            ref_name: "",
            parent_id: null,
            category_icon: null
        });
        setFormErrors({});
        setParentSearchTerm("");
        console.log('About to set dialog open to true');
        setOpen(true);
        console.log('Dialog state set to open, current open state:', open);
    };

    const handleSave = async () => {
        const errors: any = {};
        if (!form.title.trim()) errors.title = 'Title is required';
        if (!form.ref_name.trim()) errors.ref_name = 'Reference name is required';

        setFormErrors(errors);
        if (Object.keys(errors).length) return;

        setSaving(true);
        try {
            let result;

            // Check if there's an image file to upload
            if (form.category_icon) {
                // Use FormData for file upload
                const formData = new FormData();
                formData.append('title', form.title.trim());
                formData.append('ref_name', form.ref_name.trim());
                formData.append('category_icon', form.category_icon);

                // Handle parent ID properly
                if (form.parent_id && form.parent_id !== '' && form.parent_id !== 'null') {
                    formData.append('parent', form.parent_id);
                }

                console.log('Sending FormData with image:', {
                    title: form.title.trim(),
                    ref_name: form.ref_name.trim(),
                    parent: form.parent_id,
                    hasImage: !!form.category_icon
                });

                if (editing) {
                    // For updates with images, we'll use a direct fetch request
                    const response = await fetch(`${SHOP_API_ROOT}/api/shop/shop-product-category-list/${editing.id}/`, {
                        method: "PATCH",
                        body: formData,
                        headers: {
                            ...authHeaders()
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                    }

                    result = await response.json();
                    console.log('Update result with image:', result);
                } else {
                    result = await shopApi.postForm('/shop-product-category-list/', formData);
                    console.log('Create result with image:', result);
                }
            } else {
                // Use regular JSON payload for no image
                const payload: any = {
                    title: form.title.trim(),
                    ref_name: form.ref_name.trim()
                };

                // Handle parent ID properly
                if (form.parent_id && form.parent_id !== '' && form.parent_id !== 'null') {
                    payload.parent = parseInt(form.parent_id) || form.parent_id;
                }

                console.log('Sending JSON payload:', payload);

                if (editing) {
                    result = await shopCategoriesApi.update(editing.id, payload);
                    console.log('Update result:', result);
                } else {
                    result = await shopCategoriesApi.create(payload);
                    console.log('Create result:', result);
                }
            }

            // Close dialog and reset form
            setOpen(false);
            setForm({
                title: "",
                ref_name: "",
                parent_id: null,
                category_icon: null
            });
            setFormErrors({});
            setParentSearchTerm("");
            setEditing(null);

            // Refresh categories list
            await fetchCategories();

            // Show success message
            console.log(`Category ${editing ? 'updated' : 'created'} successfully`);
        } catch (e: any) {
            console.error('Save error:', e);
            let errorMessage = 'Save failed. Please try again.';

            if (e?.message) {
                errorMessage = e.message;
            } else if (typeof e === 'string') {
                errorMessage = e;
            }

            setFormErrors({ form: errorMessage });
        } finally {
            setSaving(false);
        }
    };

    const handleRefresh = () => {
        fetchCategories();
    };

    // Build categories with breadcrumbs
    const breadcrumbCategories = useMemo(() => {
        console.log('🔗 Building breadcrumbs for', categories.length, 'categories');
        const result = buildCategoriesWithBreadcrumbs(categories);
        console.log('✅ Breadcrumbs built, sample:', result.slice(0, 3).map(c => ({ title: c.title, displayTitle: c.displayTitle })));
        return result;
    }, [categories]);

    // Filter parent categories based on search term
    const filteredParentCategories = useMemo(() => {
        return breadcrumbCategories
            .filter(pc => editing ? pc.id !== editing.id : true)
            .filter(pc => {
                if (!parentSearchTerm) return true;
                const searchLower = parentSearchTerm.toLowerCase();
                return (pc.displayTitle || pc.title).toLowerCase().includes(searchLower) ||
                    pc.ref_name.toLowerCase().includes(searchLower);
            });
    }, [breadcrumbCategories, parentSearchTerm, editing]);

    // Filter categories for display
    const filteredCategories = useMemo(() => {
        let filtered = breadcrumbCategories;
        if (debouncedSearchTerm) {
            filtered = breadcrumbCategories.filter(category =>
                category.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                category.ref_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                category.slug?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (category.displayTitle && category.displayTitle.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
            );
        }

        // Apply pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filtered.slice(startIndex, endIndex);
    }, [breadcrumbCategories, debouncedSearchTerm, currentPage, pageSize]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalCategories = categories.length;
        const activeCategories = categories.length; // All categories are considered active since no is_active field
        const inactiveCategories = 0; // No inactive categories without is_active field
        const parentCategories = categories.filter(c => !c.parent).length;
        const childCategories = categories.filter(c => c.parent).length;
        const totalProducts = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);

        return {
            totalCategories,
            activeCategories,
            inactiveCategories,
            parentCategories,
            childCategories,
            totalProducts
        };
    }, [categories]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="text-muted-foreground animate-spin h-8 w-8" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Category Management</CardTitle>
                    <CardDescription>
                        Manage product categories and their information
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md">
                        <Button
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('table')}
                            className="h-8 px-3"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'card' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('card')}
                            className="h-8 px-3"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Category
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* Stats Section - Moved to top */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.totalCategories}</div>
                            <div className="text-sm text-muted-foreground">Total Categories</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.activeCategories}</div>
                            <div className="text-sm text-muted-foreground">Active</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{stats.inactiveCategories}</div>
                            <div className="text-sm text-muted-foreground">Inactive</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.parentCategories}</div>
                            <div className="text-sm text-muted-foreground">Parent Categories</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.childCategories}</div>
                            <div className="text-sm text-muted-foreground">Sub Categories</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-cyan-600">{stats.totalProducts}</div>
                            <div className="text-sm text-muted-foreground">Total Products</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search categories..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    {/* Content based on view mode */}
                    {viewMode === 'table' ? (
                        /* Table View */
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Icon</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Link URL</TableHead>
                                        <TableHead>Children</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCategories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Package className="h-8 w-8 text-muted-foreground" />
                                                    <p className="text-muted-foreground">No categories found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCategories.map((category) => (
                                            <TableRow key={category.id}>
                                                <TableCell>
                                                    {category.category_icon ? (
                                                        <CategoryImage
                                                            src={category.category_icon}
                                                            alt={category.title}
                                                            fallback={
                                                                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                                    <Package className="h-6 w-6 text-gray-400" />
                                                                </div>
                                                            }
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                            <Package className="h-6 w-6 text-gray-400" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">{category.title}</TableCell>
                                                <TableCell className="text-muted-foreground">{category.ref_name}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    <div className="max-w-sm truncate" title={category.displayTitle || category.title}>
                                                        {category.displayTitle || category.title}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {category.children_count || 0} children
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleView(category.id)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(category)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(category.id, category.title)}
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        /* Card View */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredCategories.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-12">
                                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground text-lg">No categories found</p>
                                </div>
                            ) : (
                                filteredCategories.map((category) => (
                                    <Card key={category.id} className="overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    {category.category_icon ? (
                                                        <CategoryImage
                                                            src={category.category_icon}
                                                            alt={category.title}
                                                            fallback={
                                                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                    <Package className="h-5 w-5 text-gray-400" />
                                                                </div>
                                                            }
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                            <Package className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="font-medium text-sm">{category.title}</h3>
                                                        <p className="text-xs text-muted-foreground">{category.ref_name}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="default" className="text-xs">
                                                    Active
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs">
                                                    {category.children_count || 0} children
                                                </Badge>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleView(category.id)}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(category)}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(category.id, category.title)}
                                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages} • Showing {filteredCategories.length} categories
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const page = i + 1;
                                    return (
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className="h-8 w-8 p-0"
                                        >
                                            {page}
                                        </Button>
                                    );
                                })}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Add/Edit Dialog */}
            {open && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">
                                    {editing ? "Edit Category" : "Add Category"}
                                </h2>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formErrors.form && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-600">{formErrors.form}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Title *</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="Enter category title"
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    {formErrors.title && <p className="text-xs text-red-600">{formErrors.title}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reference Name *</label>
                                    <input
                                        type="text"
                                        value={form.ref_name}
                                        onChange={e => setForm(f => ({ ...f, ref_name: e.target.value }))}
                                        placeholder="Enter reference name"
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    {formErrors.ref_name && <p className="text-xs text-red-600">{formErrors.ref_name}</p>}
                                </div>


                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Parent Category</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search parent categories..."
                                            value={parentSearchTerm}
                                            onChange={e => setParentSearchTerm(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md mb-2"
                                        />
                                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md bg-white">
                                            <div
                                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                    setForm(f => ({ ...f, parent_id: null }));
                                                    setParentSearchTerm("");
                                                }}
                                            >
                                                No Parent Category
                                            </div>
                                            {filteredParentCategories.map(pc => (
                                                <div
                                                    key={pc.id}
                                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => {
                                                        setForm(f => ({ ...f, parent_id: pc.id }));
                                                        setParentSearchTerm(pc.displayTitle || pc.title);
                                                    }}
                                                >
                                                    {pc.displayTitle || pc.title}
                                                </div>
                                            ))}
                                            {filteredParentCategories.length === 0 && parentSearchTerm && (
                                                <div className="p-2 text-gray-500 text-sm">
                                                    No categories found matching "{parentSearchTerm}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category Icon</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setForm(f => ({ ...f, category_icon: e.target.files?.[0] || null }))}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    {form.category_icon && (
                                        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                                            Selected: {form.category_icon.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={saving}
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : (editing ? "Update" : "Create")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </Card>
    );
}
