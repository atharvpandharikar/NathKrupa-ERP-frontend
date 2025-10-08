import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { optimizedShopApi, ShopCategory } from '@/lib/optimized-shop-api';
import { SHOP_API_ROOT, authHeaders } from '@/lib/shop-api';

// Memoized image component for better performance
const CategoryImage = React.memo(({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactNode }) => {
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
                onError={() => {
                    setImageError(true);
                    setIsLoading(false);
                }}
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
});

CategoryImage.displayName = 'CategoryImage';

// Memoized breadcrumb building function
const buildBreadcrumbPath = (category: ShopCategory, categoryMap: Map<string, ShopCategory>, visited = new Set<string>()): string => {
    if (visited.has(category.id.toString())) {
        return category.title;
    }
    visited.add(category.id.toString());

    let parentId: string | null = null;
    if (typeof category.parent === 'string' && category.parent.trim() !== '') {
        parentId = category.parent;
    } else if (typeof category.parent === 'number') {
        parentId = (category.parent as any).toString();
    } else if (category.parent && typeof category.parent === 'object' && 'id' in category.parent) {
        parentId = (category.parent as any).id?.toString() || null;
    }

    if (parentId) {
        const parent = categoryMap.get(parentId);
        if (parent) {
            const parentPath = buildBreadcrumbPath(parent, categoryMap, visited);
            return `${parentPath} > ${category.title}`;
        }
    }

    return category.title;
};

// Memoized categories processing
const buildCategoriesWithBreadcrumbs = (categories: ShopCategory[]): ShopCategory[] => {
    const categoryMap = new Map<string, ShopCategory>();
    const processedCategories: ShopCategory[] = [];

    categories.forEach(category => {
        categoryMap.set(category.id.toString(), { ...category });
    });

    categories.forEach(category => {
        const breadcrumbTitle = buildBreadcrumbPath(category, categoryMap);
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

export default function OptimizedCategoryList() {
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

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 300); // Reduced debounce time

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Load categories with caching
    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading categories...');

            const data = await optimizedShopApi.categories.list();
            console.log('✅ Categories loaded:', data.length);

            setCategories(data);
            setTotalPages(Math.ceil(data.length / pageSize));
        } catch (error) {
            console.error('❌ Error loading categories:', error);
            setCategories([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Memoized breadcrumb categories
    const breadcrumbCategories = useMemo(() => {
        return buildCategoriesWithBreadcrumbs(categories);
    }, [categories]);

    // Memoized filtered categories
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

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filtered.slice(startIndex, endIndex);
    }, [breadcrumbCategories, debouncedSearchTerm, currentPage, pageSize]);

    // Memoized stats
    const stats = useMemo(() => {
        const totalCategories = categories.length;
        const parentCategories = categories.filter(c => !c.parent).length;
        const childCategories = categories.filter(c => c.parent).length;
        const totalProducts = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);

        return {
            totalCategories,
            parentCategories,
            childCategories,
            totalProducts
        };
    }, [categories]);

    // Memoized filtered parent categories
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

    const handleView = useCallback((id: string) => {
        navigate(`/user-admin/categories/view/${id}`);
    }, [navigate]);

    const handleDelete = useCallback(async (id: string, name: string) => {
        if (!confirm(`Delete category "${name}"?`)) return;

        try {
            await optimizedShopApi.categories.delete(id);
            await fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    }, [fetchCategories]);

    const handleEdit = useCallback((category: ShopCategory) => {
        setEditing(category);

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

        if (parentId) {
            const parentCategory = breadcrumbCategories.find(pc => pc.id === parentId);
            setParentSearchTerm(parentCategory ? (parentCategory.displayTitle || parentCategory.title) : "");
        } else {
            setParentSearchTerm("");
        }

        setOpen(true);
    }, [breadcrumbCategories]);

    const handleCreate = useCallback(() => {
        setEditing(null);
        setForm({
            title: "",
            ref_name: "",
            parent_id: null,
            category_icon: null
        });
        setFormErrors({});
        setParentSearchTerm("");
        setOpen(true);
    }, []);

    const handleSave = useCallback(async () => {
        const errors: any = {};
        if (!form.title.trim()) errors.title = 'Title is required';
        if (!form.ref_name.trim()) errors.ref_name = 'Reference name is required';

        setFormErrors(errors);
        if (Object.keys(errors).length) return;

        setSaving(true);
        try {
            let result;

            if (form.category_icon) {
                const formData = new FormData();
                formData.append('title', form.title.trim());
                formData.append('ref_name', form.ref_name.trim());
                formData.append('category_icon', form.category_icon);

                if (form.parent_id && form.parent_id !== '' && form.parent_id !== 'null') {
                    formData.append('parent', form.parent_id);
                }

                if (editing) {
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
                } else {
                    result = await optimizedShopApi.categories.create({
                        title: form.title.trim(),
                        ref_name: form.ref_name.trim(),
                        parent: form.parent_id ? parseInt(form.parent_id) || form.parent_id : undefined
                    });
                }
            } else {
                const payload: any = {
                    title: form.title.trim(),
                    ref_name: form.ref_name.trim()
                };

                if (form.parent_id && form.parent_id !== '' && form.parent_id !== 'null') {
                    payload.parent = parseInt(form.parent_id) || form.parent_id;
                }

                if (editing) {
                    result = await optimizedShopApi.categories.update(editing.id, payload);
                } else {
                    result = await optimizedShopApi.categories.create(payload);
                }
            }

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

            await fetchCategories();
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
    }, [form, editing, fetchCategories]);

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
                    <CardTitle>Category Management (Optimized)</CardTitle>
                    <CardDescription>
                        Manage product categories with improved performance
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
                {/* Stats Section */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.totalCategories}</div>
                            <div className="text-sm text-muted-foreground">Total Categories</div>
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
                    {/* Search */}
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

                    {/* Table View */}
                    {viewMode === 'table' && (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Icon</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Path</TableHead>
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

            {/* Add/Edit Dialog - Same as original */}
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
