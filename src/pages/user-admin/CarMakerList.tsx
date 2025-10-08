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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Search,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Star,
    Car,
    Loader2,
    Plus
} from 'lucide-react';
import { carMakersApi, shopApi, CarMaker } from '@/lib/shop-api';
import optimizedShopApi from '@/lib/optimized-shop-api';
import { cacheHelpers, CACHE_KEYS } from '@/lib/cache';

// Component to handle image loading with fallback
function CarMakerImage({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactNode }) {
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

export default function CarMakerList() {
    const navigate = useNavigate();
    const [carMakers, setCarMakers] = useState<CarMaker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<CarMaker | null>(null);
    const [formErrors, setFormErrors] = useState<{ name?: string; slug?: string; form?: string }>({});
    const [form, setForm] = useState<{
        name: string;
        slug: string;
        image?: File | null;
        vin_url?: string;
        oem_url?: string;
        is_featured: boolean;
        is_popular: boolean;
        sort: number;
        discount_percent: number;
        discount_description?: string;
    }>({
        name: "",
        slug: "",
        image: null,
        vin_url: "",
        oem_url: "",
        is_featured: false,
        is_popular: false,
        sort: 0,
        discount_percent: 0,
        discount_description: ""
    });

    useEffect(() => {
        fetchCarMakers();
    }, [currentPage, searchTerm]);

    const fetchCarMakers = async () => {
        try {
            setLoading(true);
            const data = await optimizedShopApi.carMakers.list();

            if (Array.isArray(data)) {
                setCarMakers(data);

                // Filter based on search term
                let filteredData = data;
                if (searchTerm) {
                    filteredData = data.filter(maker =>
                        maker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        maker.slug?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }

                setTotalPages(Math.ceil(filteredData.length / pageSize));
            } else {
                console.error('Invalid car makers data format:', data);
                setCarMakers([]);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Error loading car makers:', error);
            setCarMakers([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchCarMakers();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this car maker? This action cannot be undone.')) {
            return;
        }

        try {
            await optimizedShopApi.carMakers.delete(id);
            await fetchCarMakers();
        } catch (error) {
            console.error('Error deleting car maker:', error);
        }
    };

    const handleEdit = (maker: CarMaker) => {
        setEditing(maker);
        setForm({
            name: maker.name || "",
            slug: maker.slug || "",
            image: null,
            vin_url: maker.vin_url || "",
            oem_url: maker.oem_url || "",
            is_featured: maker.is_featured || false,
            is_popular: maker.is_popular || false,
            sort: maker.sort || 0,
            discount_percent: maker.discount_percent || 0,
            discount_description: maker.discount_description || ""
        });
        setFormErrors({});
        setOpen(true);
    };

    const handleCreate = () => {
        setEditing(null);
        setForm({
            name: "",
            slug: "",
            image: null,
            vin_url: "",
            oem_url: "",
            is_featured: false,
            is_popular: false,
            sort: 0,
            discount_percent: 0,
            discount_description: ""
        });
        setFormErrors({});
        setOpen(true);
    };

    const handleSave = async () => {
        const errors: any = {};
        if (!form.name.trim()) errors.name = 'Car maker name is required';
        if (!form.slug.trim()) errors.slug = 'Slug is required';

        setFormErrors(errors);
        if (Object.keys(errors).length) return;

        setSaving(true);
        try {
            let result;

            // Check if there's an image file to upload
            if (form.image) {
                // Use FormData for file upload
                const formData = new FormData();
                formData.append('name', form.name.trim());
                formData.append('slug', form.slug.trim());
                formData.append('vin_url', form.vin_url || '');
                formData.append('oem_url', form.oem_url || '');
                formData.append('is_featured', form.is_featured.toString());
                formData.append('is_popular', form.is_popular.toString());
                formData.append('sort', form.sort.toString());
                formData.append('discount_percent', form.discount_percent.toString());
                formData.append('discount_description', form.discount_description || '');
                formData.append('image', form.image);

                if (editing) {
                    result = await shopApi.putForm(`/shop/car-makers/${editing.id}/`, formData);
                } else {
                    result = await shopApi.postForm('/shop/car-makers/', formData);
                }
                cacheHelpers.invalidate(CACHE_KEYS.CAR_MAKERS);
            } else {
                // Use regular JSON payload for no image
                const payload: any = {
                    name: form.name.trim(),
                    slug: form.slug.trim(),
                    vin_url: form.vin_url || '',
                    oem_url: form.oem_url || '',
                    is_featured: form.is_featured,
                    is_popular: form.is_popular,
                    sort: form.sort,
                    discount_percent: form.discount_percent,
                    discount_description: form.discount_description || ''
                };

                if (editing) {
                    result = await optimizedShopApi.carMakers.update(editing.id, payload);
                } else {
                    result = await optimizedShopApi.carMakers.create(payload);
                }
            }

            // Close dialog and reset form
            setOpen(false);
            setForm({
                name: "",
                slug: "",
                image: null,
                vin_url: "",
                oem_url: "",
                is_featured: false,
                is_popular: false,
                sort: 0,
                discount_percent: 0,
                discount_description: ""
            });
            setFormErrors({});
            setEditing(null);

            // Refresh car makers list
            await fetchCarMakers();
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

    // Filter car makers for display
    const filteredCarMakers = useMemo(() => {
        let filtered = carMakers;
        if (searchTerm) {
            filtered = carMakers.filter(maker =>
                maker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                maker.slug?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filtered.slice(startIndex, endIndex);
    }, [carMakers, searchTerm, currentPage, pageSize]);

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
                        <h1 className="text-2xl font-semibold mb-1">Car Makers Management</h1>
                        <p className="text-sm text-muted-foreground">Manage vehicle manufacturers and brands</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefresh}>
                            <Loader2 className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button onClick={handleCreate} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Car Maker
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search car makers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
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
                                    <TableHead>Models</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Sort Order</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCarMakers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <Car className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-muted-foreground">No car makers found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCarMakers.map((maker) => (
                                        <TableRow key={maker.id}>
                                            <TableCell>
                                                {maker.image ? (
                                                    <CarMakerImage
                                                        src={maker.image}
                                                        alt={maker.name}
                                                        fallback={
                                                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                                <Car className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        }
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                        <Car className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{maker.name}</TableCell>
                                            <TableCell>{maker.slug}</TableCell>
                                            <TableCell>{maker.model_count || 0}</TableCell>
                                            <TableCell>
                                                {(maker.discount_percent || 0) > 0 ? (
                                                    <Badge variant="secondary">
                                                        {maker.discount_percent}% OFF
                                                    </Badge>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {maker.is_featured && (
                                                        <Badge variant="default">Featured</Badge>
                                                    )}
                                                    {maker.is_popular && (
                                                        <Badge variant="outline">
                                                            <Star className="mr-1 h-3 w-3" />
                                                            Popular
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{maker.sort}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => navigate(`/user-admin/car-models?maker=${maker.id}`)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Models
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleEdit(maker)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(maker.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                        Page {currentPage} of {totalPages}
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
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">
                                    {editing ? "Edit Car Maker" : "Add Car Maker"}
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Car Maker Name *</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="Enter car maker name"
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
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">VIN URL</label>
                                        <input
                                            type="url"
                                            value={form.vin_url || ""}
                                            onChange={e => setForm(f => ({ ...f, vin_url: e.target.value }))}
                                            placeholder="Enter VIN URL"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">OEM URL</label>
                                        <input
                                            type="url"
                                            value={form.oem_url || ""}
                                            onChange={e => setForm(f => ({ ...f, oem_url: e.target.value }))}
                                            placeholder="Enter OEM URL"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Logo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setForm(f => ({ ...f, image: e.target.files?.[0] || null }))}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    {form.image && (
                                        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                                            Selected: {form.image?.name}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Sort Order</label>
                                        <input
                                            type="number"
                                            value={form.sort}
                                            onChange={e => setForm(f => ({ ...f, sort: parseInt(e.target.value) || 0 }))}
                                            placeholder="Enter sort order"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Discount %</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={form.discount_percent}
                                            onChange={e => setForm(f => ({ ...f, discount_percent: parseInt(e.target.value) || 0 }))}
                                            placeholder="Enter discount percentage"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Discount Description</label>
                                    <textarea
                                        value={form.discount_description || ""}
                                        onChange={e => setForm(f => ({ ...f, discount_description: e.target.value }))}
                                        placeholder="Enter discount description"
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                        rows={2}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={form.is_featured}
                                            onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                                            className="rounded"
                                        />
                                        <label className="text-sm font-medium">Featured</label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={form.is_popular}
                                            onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))}
                                            className="rounded"
                                        />
                                        <label className="text-sm font-medium">Popular</label>
                                    </div>
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