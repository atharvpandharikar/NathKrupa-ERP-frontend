import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    Car,
    Loader2,
    Plus,
    ArrowLeft
} from 'lucide-react';
import { carModelsApi, shopApi, CarModel, CarMaker } from '@/lib/shop-api';
import optimizedShopApi from '@/lib/optimized-shop-api';
import { cacheHelpers, CACHE_KEYS } from '@/lib/cache';

// Component to handle image loading with fallback
function CarModelImage({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactNode }) {
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

export default function CarModelList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const makerId = searchParams.get('maker');

    const [carModels, setCarModels] = useState<CarModel[]>([]);
    const [carMakers, setCarMakers] = useState<CarMaker[]>([]);
    const [selectedMaker, setSelectedMaker] = useState<CarMaker | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<CarModel | null>(null);
    const [formErrors, setFormErrors] = useState<{ name?: string; slug?: string; car_maker_id?: string; form?: string }>({});
    const [form, setForm] = useState<{
        name: string;
        slug: string;
        image?: File | null;
        car_maker_id: string;
    }>({
        name: "",
        slug: "",
        image: null,
        car_maker_id: ""
    });

    useEffect(() => {
        // Clear all related model caches on initial load to avoid stale empty state
        cacheHelpers.invalidatePrefix(CACHE_KEYS.CAR_MODELS);
        fetchCarMakers();
        if (makerId) {
            fetchCarModels(makerId);
        } else {
            fetchCarModels();
        }
    }, [makerId]);

    const fetchCarMakers = async () => {
        try {
            const makers = await optimizedShopApi.carMakers.list();
            setCarMakers(makers);

            if (makerId) {
                const maker = makers.find(m => m.id === makerId);
                setSelectedMaker(maker || null);
            }
        } catch (error) {
            console.error('Error loading car makers:', error);
        }
    };

    const fetchCarModels = async (makerId?: string) => {
        try {
            setLoading(true);
            console.log('🔄 Fetching car models...', { makerId });
            const data = await optimizedShopApi.carModels.list(makerId);
            console.log('📦 Car models response:', data);

            if (Array.isArray(data)) {
                setCarModels(data);

                // Filter based on search term
                let filteredData = data;
                if (searchTerm) {
                    filteredData = data.filter(model =>
                        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        model.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        model.car_maker?.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }

                setTotalPages(Math.ceil(filteredData.length / pageSize));
            } else {
                console.error('Invalid car models data format:', data);
                setCarModels([]);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Error loading car models:', error);
            setCarModels([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        // Clear cache before refreshing
        cacheHelpers.invalidatePrefix(CACHE_KEYS.CAR_MODELS);
        fetchCarModels(makerId || undefined);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this car model? This action cannot be undone.')) {
            return;
        }

        try {
            await optimizedShopApi.carModels.delete(id);
            await fetchCarModels(makerId || undefined);
        } catch (error) {
            console.error('Error deleting car model:', error);
        }
    };

    const handleEdit = (model: CarModel) => {
        setEditing(model);
        setForm({
            name: model.name || "",
            slug: model.slug || "",
            image: null,
            car_maker_id: model.car_maker_id || model.car_maker?.id || ""
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
            car_maker_id: makerId || ""
        });
        setFormErrors({});
        setOpen(true);
    };

    const handleSave = async () => {
        const errors: any = {};
        if (!form.name.trim()) errors.name = 'Car model name is required';
        if (!form.slug.trim()) errors.slug = 'Slug is required';
        if (!form.car_maker_id.trim()) errors.car_maker_id = 'Car maker is required';

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
                formData.append('car_maker_id', form.car_maker_id);
                if (form.image) {
                    formData.append('image', form.image);
                }

                if (editing) {
                    result = await shopApi.putForm(`/shop/car-models/${editing.id}/`, formData);
                } else {
                    result = await shopApi.postForm('/shop/car-models/', formData);
                }
                cacheHelpers.invalidate(CACHE_KEYS.CAR_MODELS);
            } else {
                // Use regular JSON payload for no image
                const payload: any = {
                    name: form.name.trim(),
                    slug: form.slug.trim(),
                    car_maker_id: form.car_maker_id
                };

                if (editing) {
                    result = await optimizedShopApi.carModels.update(editing.id, payload);
                } else {
                    result = await optimizedShopApi.carModels.create(payload);
                }
            }

            // Close dialog and reset form
            setOpen(false);
            setForm({
                name: "",
                slug: "",
                image: null,
                car_maker_id: makerId || ""
            });
            setFormErrors({});
            setEditing(null);

            // Refresh car models list
            await fetchCarModels(makerId || undefined);
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

    // Filter car models for display
    const filteredCarModels = useMemo(() => {
        let filtered = carModels;
        if (searchTerm) {
            filtered = carModels.filter(model =>
                model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                model.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                model.car_maker?.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filtered.slice(startIndex, endIndex);
    }, [carModels, searchTerm, currentPage, pageSize]);

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
                    <div className="flex items-center gap-4">
                        {makerId && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/user-admin/car-makers')}
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Makers
                            </Button>
                        )}
                        <div>
                            <h1 className="text-2xl font-semibold mb-1">
                                {makerId ? `${selectedMaker?.name} Models` : 'Car Models Management'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {makerId ? `Manage models for ${selectedMaker?.name}` : 'Manage vehicle models across all manufacturers'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefresh}>
                            <Loader2 className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button onClick={handleCreate} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Car Model
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search car models..."
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
                                    <TableHead>Image</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Car Maker</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCarModels.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <Car className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-muted-foreground">No car models found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCarModels.map((model) => (
                                        <TableRow key={model.id}>
                                            <TableCell>
                                                {model.image ? (
                                                    <CarModelImage
                                                        src={model.image}
                                                        alt={model.name}
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
                                            <TableCell className="font-medium">{model.name}</TableCell>
                                            <TableCell>{model.slug}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {model.car_maker?.name || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(model.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => navigate(`/user-admin/car-variants?model=${model.id}`)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Variants
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleEdit(model)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(model.id)}
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
                                    {editing ? "Edit Car Model" : "Add Car Model"}
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
                                        <label className="text-sm font-medium">Car Model Name *</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="Enter car model name"
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

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Car Maker *</label>
                                    <select
                                        value={form.car_maker_id}
                                        onChange={e => setForm(f => ({ ...f, car_maker_id: e.target.value }))}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                        disabled={!!makerId}
                                    >
                                        <option value="">Select a car maker</option>
                                        {carMakers.map(maker => (
                                            <option key={maker.id} value={maker.id}>
                                                {maker.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.car_maker_id && <p className="text-xs text-red-600">{formErrors.car_maker_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Model Image</label>
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