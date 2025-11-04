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
import { carVariantsApi, carModelsApi, shopApi, CarVariant, CarModel, CarMaker } from '@/lib/shop-api';
import optimizedShopApi from '@/lib/optimized-shop-api';
import { cacheHelpers, CACHE_KEYS } from '@/lib/cache';

// Component to handle image loading with fallback
function CarVariantImage({ src, alt, fallback }: { src: string; alt: string; fallback: React.ReactNode }) {
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

export default function CarVariantList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const modelId = searchParams.get('model');

    const [carVariants, setCarVariants] = useState<CarVariant[]>([]);
    const [carModels, setCarModels] = useState<CarModel[]>([]);
    const [carMakers, setCarMakers] = useState<CarMaker[]>([]);
    const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<CarVariant | null>(null);
    const [formErrors, setFormErrors] = useState<{ name?: string; slug?: string; model_id?: string; form?: string }>({});
    const [form, setForm] = useState<{
        name: string;
        slug: string;
        image?: File | null;
        model_id: string;
        car_maker_id: string;
        year_start?: string;
        year_end?: string;
        engine_liters?: string;
        engine_type?: string;
        fuel_engine?: string;
    }>({
        name: "",
        slug: "",
        image: null,
        model_id: modelId || "",
        car_maker_id: "",
        year_start: "",
        year_end: "",
        engine_liters: "",
        engine_type: "",
        fuel_engine: "",
    });

    useEffect(() => {
        cacheHelpers.invalidatePrefix(CACHE_KEYS.CAR_VARIANTS);
        fetchCarMakers();
        fetchCarModels();
        if (modelId) {
            fetchCarVariants(modelId);
        } else {
            fetchCarVariants();
        }
    }, [modelId]);

    const fetchCarMakers = async () => {
        try {
            const makers = await optimizedShopApi.carMakers.list();
            setCarMakers(makers);
        } catch (error) {
            console.error('Error loading car makers:', error);
        }
    };

    const fetchCarModels = async () => {
        try {
            const models = await optimizedShopApi.carModels.list();
            setCarModels(models);

            if (modelId) {
                const model = models.find(m => m.id === modelId);
                setSelectedModel(model || null);
                if (model) {
                    setForm(f => ({ ...f, car_maker_id: model.car_maker_id || model.car_maker?.id || "" }));
                }
            }
        } catch (error) {
            console.error('Error loading car models:', error);
        }
    };

    const fetchCarVariants = async (modelId?: string) => {
        try {
            setLoading(true);
            console.log('🔄 Fetching car variants...', { modelId });
            const data = await carVariantsApi.list(modelId);
            console.log('📦 Car variants response:', data);

            if (Array.isArray(data)) {
                setCarVariants(data);

                // Filter based on search term
                let filteredData = data;
                if (searchTerm) {
                    filteredData = data.filter(variant =>
                        variant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        variant.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        variant.model?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        variant.car_maker?.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }

                setTotalPages(Math.ceil(filteredData.length / pageSize));
            } else {
                console.error('Invalid car variants data format:', data);
                setCarVariants([]);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Error loading car variants:', error);
            setCarVariants([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        cacheHelpers.invalidatePrefix(CACHE_KEYS.CAR_VARIANTS);
        fetchCarVariants(modelId || undefined);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this car variant? This action cannot be undone.')) {
            return;
        }

        try {
            await carVariantsApi.delete(id);
            await fetchCarVariants(modelId || undefined);
        } catch (error) {
            console.error('Error deleting car variant:', error);
            alert('Failed to delete car variant. Please try again.');
        }
    };

    const handleEdit = (variant: CarVariant) => {
        setEditing(variant);
        setForm({
            name: variant.name || "",
            slug: variant.slug || "",
            image: null,
            model_id: variant.model_id || variant.model?.id || "",
            car_maker_id: variant.car_maker_id || variant.car_maker?.id || "",
            year_start: variant.year_start?.toString() || "",
            year_end: variant.year_end?.toString() || "",
            engine_liters: variant.engine_liters?.toString() || "",
            engine_type: variant.engine_type || "",
            fuel_engine: variant.fuel_engine || "",
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
            model_id: modelId || "",
            car_maker_id: selectedModel?.car_maker_id || selectedModel?.car_maker?.id || "",
            year_start: "",
            year_end: "",
            engine_liters: "",
            engine_type: "",
            fuel_engine: "",
        });
        setFormErrors({});
        setOpen(true);
    };

    const handleSave = async () => {
        const errors: any = {};
        if (!form.name.trim()) errors.name = 'Car variant name is required';
        if (!form.model_id.trim()) errors.model_id = 'Car model is required';

        setFormErrors(errors);
        if (Object.keys(errors).length) return;

        setSaving(true);
        try {
            let result;

            // Prepare payload
            const payload: any = {
                name: form.name.trim(),
                slug: form.slug.trim() || undefined,
                model_id: form.model_id,
                car_maker_id: form.car_maker_id || undefined,
                year_start: form.year_start ? parseInt(form.year_start) : undefined,
                year_end: form.year_end ? parseInt(form.year_end) : undefined,
                engine_liters: form.engine_liters ? parseFloat(form.engine_liters) : undefined,
                engine_type: form.engine_type || undefined,
                fuel_engine: form.fuel_engine || undefined,
            };

            // Check if there's an image file to upload
            if (form.image) {
                const formData = new FormData();
                Object.keys(payload).forEach(key => {
                    if (payload[key] !== undefined) {
                        formData.append(key, payload[key].toString());
                    }
                });
                formData.append('image', form.image);

                if (editing) {
                    result = await shopApi.putForm(`/shop/car-variants-crud/${editing.id}/`, formData);
                } else {
                    result = await shopApi.postForm('/shop/car-variants-crud/', formData);
                }
                cacheHelpers.invalidate(CACHE_KEYS.CAR_VARIANTS);
            } else {
                if (editing) {
                    result = await carVariantsApi.update(editing.id, payload);
                } else {
                    result = await carVariantsApi.create(payload);
                }
            }

            // Close dialog and reset form
            setOpen(false);
            setForm({
                name: "",
                slug: "",
                image: null,
                model_id: modelId || "",
                car_maker_id: selectedModel?.car_maker_id || selectedModel?.car_maker?.id || "",
                year_start: "",
                year_end: "",
                engine_liters: "",
                engine_type: "",
                fuel_engine: "",
            });
            setFormErrors({});
            setEditing(null);

            // Refresh car variants list
            await fetchCarVariants(modelId || undefined);
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

    // Filter car variants for display
    const filteredCarVariants = useMemo(() => {
        let filtered = carVariants;
        if (searchTerm) {
            filtered = carVariants.filter(variant =>
                variant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                variant.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                variant.model?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                variant.car_maker?.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filtered.slice(startIndex, endIndex);
    }, [carVariants, searchTerm, currentPage, pageSize]);

    // Update form when model changes
    const handleModelChange = (modelId: string) => {
        const model = carModels.find(m => m.id === modelId);
        setForm(f => ({
            ...f,
            model_id: modelId,
            car_maker_id: model?.car_maker_id || model?.car_maker?.id || ""
        }));
    };

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
                        {modelId && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/user-admin/car-models')}
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Models
                            </Button>
                        )}
                        <div>
                            <h1 className="text-2xl font-semibold mb-1">
                                {modelId ? `${selectedModel?.name} Variants` : 'Car Variants Management'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {modelId ? `Manage variants for ${selectedModel?.name}` : 'Manage vehicle variants across all models'}
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
                            Add Car Variant
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search car variants..."
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
                                    <TableHead>Model</TableHead>
                                    <TableHead>Car Maker</TableHead>
                                    <TableHead>Years</TableHead>
                                    <TableHead>Engine</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCarVariants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <Car className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-muted-foreground">No car variants found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCarVariants.map((variant) => (
                                        <TableRow key={variant.id}>
                                            <TableCell>
                                                {variant.image ? (
                                                    <CarVariantImage
                                                        src={variant.image}
                                                        alt={variant.name}
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
                                            <TableCell className="font-medium">{variant.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {variant.model?.name || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {variant.car_maker?.name || variant.model?.car_maker?.name || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {variant.year_start && variant.year_end
                                                    ? `${variant.year_start} - ${variant.year_end}`
                                                    : variant.year_start
                                                    ? variant.year_start.toString()
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {variant.engine_liters && variant.engine_type
                                                    ? `${variant.engine_liters}L ${variant.engine_type}`
                                                    : variant.engine_liters
                                                    ? `${variant.engine_liters}L`
                                                    : variant.fuel_engine || '-'}
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
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleEdit(variant)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(variant.id)}
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
                                    {editing ? "Edit Car Variant" : "Add Car Variant"}
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
                                        <label className="text-sm font-medium">Car Variant Name *</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="Enter car variant name"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                        {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Slug</label>
                                        <input
                                            type="text"
                                            value={form.slug}
                                            onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                            placeholder="Enter slug (optional)"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Car Model *</label>
                                        <select
                                            value={form.model_id}
                                            onChange={e => handleModelChange(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                            disabled={!!modelId}
                                        >
                                            <option value="">Select a car model</option>
                                            {carModels.map(model => (
                                                <option key={model.id} value={model.id}>
                                                    {model.car_maker?.name} - {model.name}
                                                </option>
                                            ))}
                                        </select>
                                        {formErrors.model_id && <p className="text-xs text-red-600">{formErrors.model_id}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Car Maker</label>
                                        <select
                                            value={form.car_maker_id}
                                            onChange={e => setForm(f => ({ ...f, car_maker_id: e.target.value }))}
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                            disabled={!!form.model_id}
                                        >
                                            <option value="">Select a car maker</option>
                                            {carMakers.map(maker => (
                                                <option key={maker.id} value={maker.id}>
                                                    {maker.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Year Start</label>
                                        <input
                                            type="number"
                                            value={form.year_start}
                                            onChange={e => setForm(f => ({ ...f, year_start: e.target.value }))}
                                            placeholder="e.g., 2020"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Year End</label>
                                        <input
                                            type="number"
                                            value={form.year_end}
                                            onChange={e => setForm(f => ({ ...f, year_end: e.target.value }))}
                                            placeholder="e.g., 2024"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Engine Liters</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={form.engine_liters}
                                            onChange={e => setForm(f => ({ ...f, engine_liters: e.target.value }))}
                                            placeholder="e.g., 1.5"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Engine Type</label>
                                        <input
                                            type="text"
                                            value={form.engine_type}
                                            onChange={e => setForm(f => ({ ...f, engine_type: e.target.value }))}
                                            placeholder="e.g., Diesel, Petrol"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fuel Engine</label>
                                    <input
                                        type="text"
                                        value={form.fuel_engine}
                                        onChange={e => setForm(f => ({ ...f, fuel_engine: e.target.value }))}
                                        placeholder="e.g., Diesel, Petrol, Electric"
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Variant Image</label>
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
