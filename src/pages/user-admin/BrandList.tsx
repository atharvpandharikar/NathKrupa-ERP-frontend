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
import { Switch } from '@/components/ui/switch';
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
    Plus
} from 'lucide-react';
import { shopBrandsApi, shopApi, ShopBrand } from '@/lib/shop-api';

// Component to handle image loading with fallback
function BrandImage({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactNode }) {
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
}

export default function BrandList() {
    const navigate = useNavigate();
    const [brands, setBrands] = useState<ShopBrand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(10);
    const [showInactive, setShowInactive] = useState(false);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ShopBrand | null>(null);
    const [formErrors, setFormErrors] = useState<{ name?: string; slug?: string; form?: string }>({});
    const [form, setForm] = useState<{
        name: string;
        slug: string;
        description?: string;
        is_active: boolean;
        logo?: File | null;
    }>({
        name: "",
        slug: "",
        description: "",
        is_active: true,
        logo: null
    });

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1); // Reset to first page when searching
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchBrands();
    }, [currentPage, debouncedSearchTerm, showInactive]);

    const fetchBrands = async () => {
        try {
            setLoading(true);
            console.log('Fetching brands from API...');

            let data = await shopBrandsApi.list();
            console.log('Raw API response:', data);
            console.log('Data type:', typeof data);
            console.log('Is array:', Array.isArray(data));
            console.log('Data length:', data?.length);

            // If no data from simple list, try listAll as fallback
            if (!Array.isArray(data) || data.length === 0) {
                console.log('No data from list(), trying listAll()...');
                data = await shopBrandsApi.listAll();
                console.log('listAll response:', data);
            }

            if (Array.isArray(data)) {
                setBrands(data);
                console.log('Set brands:', data);

                // Filter based on search term and active status
                let filteredData = data;
                if (debouncedSearchTerm) {
                    filteredData = data.filter(brand =>
                        brand.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                        brand.slug?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                    );
                }

                if (showInactive) {
                    filteredData = filteredData.filter(brand => !brand.is_active);
                } else {
                    filteredData = filteredData.filter(brand => brand.is_active);
                }

                setTotalPages(Math.ceil(filteredData.length / pageSize));
            } else {
                console.error('Invalid brands data format:', data);
                setBrands([]);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Error loading brands:', error);
            setBrands([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (id: string) => {
        navigate(`/user-admin/brands/view/${id}`);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete brand "${name}"? This action cannot be undone.`)) return;

        try {
            await shopBrandsApi.delete(id);
            await fetchBrands();
        } catch (error) {
            console.error('Error deleting brand:', error);
        }
    };

    const handleEdit = (brand: ShopBrand) => {
        setEditing(brand);
        setForm({
            name: brand.name || "",
            slug: brand.slug || "",
            description: brand.description || "",
            is_active: brand.is_active !== false,
            logo: null
        });
        setFormErrors({});
        setOpen(true);
    };

    const handleCreate = () => {
        setEditing(null);
        setForm({
            name: "",
            slug: "",
            description: "",
            is_active: true,
            logo: null
        });
        setFormErrors({});
        setOpen(true);
    };

    const handleSave = async () => {
        const errors: any = {};
        if (!form.name.trim()) errors.name = 'Brand name is required';
        if (!form.slug.trim()) errors.slug = 'Slug is required';

        setFormErrors(errors);
        if (Object.keys(errors).length) return;

        setSaving(true);
        try {
            let result;

            // Check if there's a logo file to upload
            if (form.logo) {
                // Use FormData for file upload
                const formData = new FormData();
                formData.append('name', form.name.trim());
                formData.append('slug', form.slug.trim());
                formData.append('description', form.description || '');
                formData.append('is_active', form.is_active.toString());
                formData.append('logo', form.logo);

                console.log('Sending FormData with logo:', {
                    name: form.name.trim(),
                    slug: form.slug.trim(),
                    description: form.description,
                    is_active: form.is_active,
                    hasLogo: !!form.logo
                });

                if (editing) {
                    result = await shopApi.putForm(`/shop/brands/${editing.id}/`, formData);
                    console.log('Update result with logo:', result);
                } else {
                    result = await shopApi.postForm('/shop/brands/', formData);
                    console.log('Create result with logo:', result);
                }
            } else {
                // Use regular JSON payload for no logo
                const payload: any = {
                    name: form.name.trim(),
                    slug: form.slug.trim(),
                    description: form.description || '',
                    is_active: form.is_active
                };

                console.log('Sending JSON payload:', payload);

                if (editing) {
                    result = await shopBrandsApi.update(editing.id, payload);
                    console.log('Update result:', result);
                } else {
                    result = await shopBrandsApi.create(payload);
                    console.log('Create result:', result);
                }
            }

            // Close dialog and reset form
            setOpen(false);
            setForm({
                name: "",
                slug: "",
                description: "",
                is_active: true,
                logo: null
            });
            setFormErrors({});
            setEditing(null);

            // Refresh brands list
            await fetchBrands();

            console.log(`Brand ${editing ? 'updated' : 'created'} successfully`);
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
        fetchBrands();
    };

    // Filter brands for display
    const filteredBrands = useMemo(() => {
        let filtered = brands;
        if (debouncedSearchTerm) {
            filtered = brands.filter(brand =>
                brand.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                brand.slug?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            );
        }

        if (showInactive) {
            filtered = filtered.filter(brand => !brand.is_active);
        } else {
            filtered = filtered.filter(brand => brand.is_active);
        }

        // Apply pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filtered.slice(startIndex, endIndex);
    }, [brands, debouncedSearchTerm, showInactive, currentPage, pageSize]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="text-muted-foreground animate-spin h-8 w-8" />
            </div>
        );
    }

    return (
        <>
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold mb-1">Product Brands Management</h1>
                        <p className="text-sm text-muted-foreground">Manage product brands and their information</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefresh}>
                            <Loader2 className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button onClick={handleCreate} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Brand
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search brands..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={showInactive}
                            onCheckedChange={setShowInactive}
                            className="cursor-pointer"
                        />
                        <span className="text-sm font-medium">
                            {showInactive ? 'Show Inactive' : 'Show Active'}
                        </span>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Logo</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Products</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBrands.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <Package className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-muted-foreground">
                                                    {showInactive ? 'No inactive brands found' : 'No brands found'}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBrands.map((brand) => (
                                        <TableRow key={brand.id}>
                                            <TableCell>
                                                {brand.logo ? (
                                                    <BrandImage
                                                        src={brand.logo}
                                                        alt={brand.name}
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
                                            <TableCell className="font-medium">{brand.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                {brand.description || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {brand.product_count || 0} products
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={brand.is_active ? 'default' : 'secondary'}>
                                                    {brand.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(brand.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleView(brand.id)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(brand)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(brand.id, brand.name)}
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
                    </CardContent>
                </Card>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages} • Showing {filteredBrands.length} brands
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
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
            </section>

            {/* Add/Edit Dialog */}
            {open && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">
                                    {editing ? "Edit Brand" : "Add Brand"}
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
                                    <label className="text-sm font-medium">Brand Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Enter brand name"
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Slug *</label>
                                    <input
                                        type="text"
                                        value={form.slug}
                                        onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                        placeholder="Enter slug"
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    {formErrors.slug && <p className="text-xs text-red-600">{formErrors.slug}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <textarea
                                        value={form.description || ""}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="Enter description (optional)"
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Brand Logo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setForm(f => ({ ...f, logo: e.target.files?.[0] || null }))}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    {form.logo && (
                                        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                                            Selected: {form.logo.name}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={form.is_active}
                                        onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: checked }))}
                                        className="cursor-pointer"
                                    />
                                    <label className="text-sm font-medium">Active</label>
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
        </>
    );
}