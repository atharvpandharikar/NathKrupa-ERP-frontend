import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Car, Settings, Check, ChevronsUpDown, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_ROOT, getTokens, clearTokens } from '@/lib/api';

interface CarMaker {
    id: string;
    name: string;
    slug: string;
    image?: string;
}

interface CarModel {
    id: string;
    name: string;
    slug: string;
    car_maker: CarMaker;
}

interface CarVariant {
    id: string;
    name: string;
    slug: string;
    model: CarModel;
    car_maker: CarMaker;
    year_start?: number;
    year_end?: number;
    fuel_engine?: string;
    vehicle_type: string;
}

interface CompatibilityGroup {
    id: string;
    name: string;
    description?: string;
    car_maker?: CarMaker;
    variants: CarVariant[];
    year_start?: number;
    year_end?: number;
    fuel_engine?: string;
    is_mapped: boolean;
    created_at: string;
    updated_at: string;
}

interface Product {
    id: string;
    title: string;
    price: number;
    discounted_price?: number;
    compatibility_group?: CompatibilityGroup;
    compatible_variants: CarVariant[];
}

const VehicleCompatibilityList: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [compatibilityGroups, setCompatibilityGroups] = useState<CompatibilityGroup[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [carMakers, setCarMakers] = useState<CarMaker[]>([]);
    const [carModels, setCarModels] = useState<CarModel[]>([]);
    const [carVariants, setCarVariants] = useState<CarVariant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMaker, setSelectedMaker] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [selectedVariant, setSelectedVariant] = useState<string>('');

    // Search states for dropdowns
    const [carMakerSearchOpen, setCarMakerSearchOpen] = useState(false);
    const [variantSearchOpen, setVariantSearchOpen] = useState(false);
    const [carMakerSearchValue, setCarMakerSearchValue] = useState('');
    const [variantSearchValue, setVariantSearchValue] = useState('');

    // Helper function to get headers with authentication
    const getHeaders = () => {
        const tokens = getTokens();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (tokens?.access) {
            headers['Authorization'] = `Bearer ${tokens.access}`;
        }
        return headers;
    };

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<CompatibilityGroup | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        car_maker_id: '',
        year_start: '',
        year_end: '',
        fuel_engine: '',
        variant_ids: [] as string[]
    });

    // Fetch data
    useEffect(() => {
        fetchCompatibilityGroups();
        fetchCarMakers();
        fetchProducts();
    }, []);

    // Fetch car models when maker changes
    useEffect(() => {
        if (formData.car_maker_id) {
            fetchCarModels(formData.car_maker_id);
            fetchAllVariantsForMaker(formData.car_maker_id);
        } else {
            setCarModels([]);
            setCarVariants([]);
        }
    }, [formData.car_maker_id]);

    // Fetch car variants when model changes
    useEffect(() => {
        if (selectedModel) {
            fetchCarVariants(selectedModel);
        } else {
            setCarVariants([]);
        }
    }, [selectedModel]);

    const fetchCompatibilityGroups = async () => {
        try {
            const response = await fetch(`${API_ROOT}/api/shop/shop/compatibility-groups/`, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Fetched compatibility groups:', data);
            if (data.error) {
                throw new Error(data.message);
            }
            console.log('Compatibility groups data:', data.data);
            if (data.data && data.data.length > 0) {
                console.log('First group car_maker:', data.data[0].car_maker);
            }
            setCompatibilityGroups(data.data || []);
        } catch (error) {
            console.error('Error fetching compatibility groups:', error);
            toast({
                title: "Error",
                description: "Failed to fetch compatibility groups. Please check if the server is running.",
                variant: "destructive",
            });
            // Set empty array to prevent blank page
            setCompatibilityGroups([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCarMakers = async () => {
        try {
            const response = await fetch(`${API_ROOT}/api/shop/shop/car-makers-readonly/`, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.message);
            }
            setCarMakers(data.data || []);
        } catch (error) {
            console.error('Error fetching car makers:', error);
            setCarMakers([]);
        }
    };

    const fetchCarModels = async (makerId: string) => {
        try {
            console.log('Fetching car models for maker ID:', makerId);
            const response = await fetch(`${API_ROOT}/api/shop/shop/car-models-readonly/?maker_id=${makerId}`, {
                method: 'GET',
                headers: getHeaders(),
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
            console.log('Car models response:', data);
            if (data.error) {
                throw new Error(data.message);
            }
            setCarModels(data.data || []);
        } catch (error) {
            console.error('Error fetching car models:', error);
        }
    };

    const fetchCarVariants = async (modelId: string) => {
        try {
            console.log('Fetching car variants for model ID:', modelId);
            const response = await fetch(`${API_ROOT}/api/shop/shop/car-variants/?model_id=${modelId}`, {
                method: 'GET',
                headers: getHeaders(),
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
            console.log('Car variants response:', data);
            if (data.error) {
                throw new Error(data.message);
            }
            setCarVariants(data.data || []);
        } catch (error) {
            console.error('Error fetching car variants:', error);
        }
    };

    const fetchAllVariantsForMaker = async (makerId: string) => {
        try {
            console.log('Fetching all variants for maker ID:', makerId);

            // First try to get variants directly by car_maker_id
            const response = await fetch(`${API_ROOT}/api/shop/shop/car-variants/?car_maker_id=${makerId}`, {
                method: 'GET',
                headers: getHeaders(),
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
            console.log('All variants response:', data);

            if (data.error) {
                throw new Error(data.message);
            }

            // If we got variants, use them
            if (data.data && data.data.length > 0) {
                setCarVariants(data.data);
                return;
            }

            // If no variants found directly, try to get all models for this maker and fetch variants for each
            console.log('No variants found directly, trying to fetch via models...');
            const modelsResponse = await fetch(`${API_ROOT}/api/shop/shop/car-models-readonly/?maker_id=${makerId}`, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (modelsResponse.ok) {
                const modelsData = await modelsResponse.json();
                console.log('Models for maker:', modelsData);

                if (modelsData.data && modelsData.data.length > 0) {
                    // Fetch variants for each model
                    const allVariants: CarVariant[] = [];
                    for (const model of modelsData.data) {
                        try {
                            const variantsResponse = await fetch(`${API_ROOT}/api/shop/shop/car-variants/?model_id=${model.id}`, {
                                method: 'GET',
                                headers: getHeaders(),
                            });

                            if (variantsResponse.ok) {
                                const variantsData = await variantsResponse.json();
                                if (variantsData.data) {
                                    allVariants.push(...variantsData.data);
                                }
                            }
                        } catch (error) {
                            console.error(`Error fetching variants for model ${model.id}:`, error);
                        }
                    }

                    console.log('All variants collected:', allVariants);
                    setCarVariants(allVariants);
                } else {
                    setCarVariants([]);
                }
            } else {
                setCarVariants([]);
            }
        } catch (error) {
            console.error('Error fetching all variants for maker:', error);
            setCarVariants([]);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await fetch(`${API_ROOT}/api/shop/shop-product-list/`, {
                method: 'GET',
                headers: getHeaders(),
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.message);
            }
            setProducts(data.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            setProducts([]);
        }
    };

    const handleCreateGroup = async () => {
        try {
            // Validate required fields
            if (!formData.name.trim()) {
                toast({
                    title: "Error",
                    description: "Group name is required",
                    variant: "destructive",
                });
                return;
            }

            const requestData = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                car_maker: formData.car_maker_id || null,
                year_start: formData.year_start ? parseInt(formData.year_start) : null,
                year_end: formData.year_end ? parseInt(formData.year_end) : null,
                fuel_engine: formData.fuel_engine.trim() || null,
                variants_ids: formData.variant_ids, // Note: serializer expects variants_ids, not variant_ids
            };

            console.log('Creating compatibility group with data:', requestData);

            const response = await fetch(`${API_ROOT}/api/shop/shop/compatibility-groups/`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(requestData),
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            const data = await response.json();
            console.log('Create group response:', data);

            if (data.error) {
                throw new Error(data.message || 'Unknown error occurred');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            toast({
                title: "Success",
                description: "Compatibility group created successfully",
            });

            setIsCreateDialogOpen(false);
            resetForm();
            fetchCompatibilityGroups();
        } catch (error) {
            console.error('Error creating compatibility group:', error);
            toast({
                title: "Error",
                description: `Failed to create compatibility group: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: "destructive",
            });
        }
    };

    const handleEditGroup = async () => {
        if (!selectedGroup) return;

        try {
            // Validate required fields
            if (!formData.name.trim()) {
                toast({
                    title: "Error",
                    description: "Group name is required",
                    variant: "destructive",
                });
                return;
            }

            const requestData = {
                name: formData.name.trim(),
                description: formData.description.trim() || null,
                car_maker: formData.car_maker_id || null,
                year_start: formData.year_start ? parseInt(formData.year_start) : null,
                year_end: formData.year_end ? parseInt(formData.year_end) : null,
                fuel_engine: formData.fuel_engine.trim() || null,
                variants_ids: formData.variant_ids, // Note: serializer expects variants_ids, not variant_ids
            };

            console.log('Updating compatibility group with data:', requestData);

            const response = await fetch(`${API_ROOT}/api/shop/shop/compatibility-groups/${selectedGroup.id}/`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(requestData),
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            const data = await response.json();
            console.log('Update group response:', data);

            if (data.error) {
                throw new Error(data.message || 'Unknown error occurred');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            toast({
                title: "Success",
                description: "Compatibility group updated successfully",
            });

            setIsEditDialogOpen(false);
            resetForm();
            fetchCompatibilityGroups();
        } catch (error) {
            console.error('Error updating compatibility group:', error);
            toast({
                title: "Error",
                description: `Failed to update compatibility group: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: "destructive",
            });
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('Are you sure you want to delete this compatibility group?')) return;

        try {
            const response = await fetch(`${API_ROOT}/api/shop/shop/compatibility-groups/${groupId}/`, {
                method: 'DELETE',
                headers: getHeaders(),
            });

            if (response.status === 401) {
                clearTokens();
                window.location.href = '/login';
                throw new Error('Authentication required');
            }

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Compatibility group deleted successfully",
                });
                fetchCompatibilityGroups();
            } else {
                throw new Error('Failed to delete compatibility group');
            }
        } catch (error) {
            console.error('Error deleting compatibility group:', error);
            toast({
                title: "Error",
                description: "Failed to delete compatibility group",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            car_maker_id: '',
            year_start: '',
            year_end: '',
            fuel_engine: '',
            variant_ids: []
        });
        setSelectedMaker('');
        setSelectedModel('');
        setSelectedVariant('');
        setCarMakerSearchOpen(false);
        setVariantSearchOpen(false);
        setCarMakerSearchValue('');
        setVariantSearchValue('');
    };

    const openEditDialog = (group: CompatibilityGroup) => {
        setSelectedGroup(group);
        setFormData({
            name: group.name,
            description: group.description || '',
            car_maker_id: group.car_maker?.id || '',
            year_start: group.year_start?.toString() || '',
            year_end: group.year_end?.toString() || '',
            fuel_engine: group.fuel_engine || '',
            variant_ids: group.variants.map(v => v.id)
        });
        setSelectedMaker(group.car_maker?.id || '');
        setIsEditDialogOpen(true);
    };

    const openViewDialog = (group: CompatibilityGroup) => {
        setSelectedGroup(group);
        setIsViewDialogOpen(true);
    };

    const filteredGroups = compatibilityGroups.filter(group => {
        const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMaker = !selectedMaker || selectedMaker === 'all' || group.car_maker?.id === selectedMaker;
        return matchesSearch && matchesMaker;
    });

    const getProductsForGroup = (groupId: string) => {
        return products.filter(product => product.compatibility_group?.id === groupId);
    };

    const getProductsForVariant = (variantId: string) => {
        return products.filter(product =>
            product.compatible_variants.some(variant => variant.id === variantId)
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading compatibility groups...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vehicle Compatibility</h1>
                    <p className="text-muted-foreground">
                        Manage vehicle compatibility groups and product associations
                    </p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => resetForm()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Group
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create Compatibility Group</DialogTitle>
                            <DialogDescription>
                                Create a new vehicle compatibility group to associate products with multiple vehicle variants.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">Group Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Toyota Corolla 2010-2015"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="car_maker">Car Maker</Label>
                                    <Popover open={carMakerSearchOpen} onOpenChange={setCarMakerSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={carMakerSearchOpen}
                                                className="w-full justify-between"
                                            >
                                                {formData.car_maker_id
                                                    ? carMakers.find((maker) => maker.id === formData.car_maker_id)?.name
                                                    : "Select car maker..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-full p-0">
                                            <Command>
                                                <CommandInput
                                                    placeholder="Search car makers..."
                                                    value={carMakerSearchValue}
                                                    onValueChange={setCarMakerSearchValue}
                                                />
                                                <CommandList>
                                                    <CommandEmpty>No car maker found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {carMakers.map((maker) => (
                                                            <CommandItem
                                                                key={maker.id}
                                                                value={maker.name}
                                                                onSelect={() => {
                                                                    setFormData({ ...formData, car_maker_id: maker.id });
                                                                    setSelectedMaker(maker.id);
                                                                    setCarMakerSearchOpen(false);
                                                                    setCarMakerSearchValue('');
                                                                }}
                                                            >
                                                                <Check
                                                                    className={`mr-2 h-4 w-4 ${formData.car_maker_id === maker.id ? "opacity-100" : "opacity-0"
                                                                        }`}
                                                                />
                                                                {maker.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe this compatibility group..."
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="year_start">Start Year</Label>
                                    <Input
                                        id="year_start"
                                        type="number"
                                        value={formData.year_start}
                                        onChange={(e) => setFormData({ ...formData, year_start: e.target.value })}
                                        placeholder="2010"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="year_end">End Year</Label>
                                    <Input
                                        id="year_end"
                                        type="number"
                                        value={formData.year_end}
                                        onChange={(e) => setFormData({ ...formData, year_end: e.target.value })}
                                        placeholder="2015"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="fuel_engine">Fuel Type</Label>
                                    <Input
                                        id="fuel_engine"
                                        value={formData.fuel_engine}
                                        onChange={(e) => setFormData({ ...formData, fuel_engine: e.target.value })}
                                        placeholder="Petrol, Diesel, etc."
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Vehicle Variants</Label>
                                <Popover open={variantSearchOpen} onOpenChange={setVariantSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={variantSearchOpen}
                                            className="w-full justify-between"
                                        >
                                            {formData.variant_ids.length > 0
                                                ? `${formData.variant_ids.length} variant(s) selected`
                                                : "Select vehicle variants..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder="Search vehicle variants..."
                                                value={variantSearchValue}
                                                onValueChange={setVariantSearchValue}
                                            />
                                            <CommandList>
                                                <CommandEmpty>No vehicle variants found.</CommandEmpty>
                                                <CommandGroup>
                                                    {carVariants.map((variant) => (
                                                        <CommandItem
                                                            key={variant.id}
                                                            value={`${variant.car_maker.name} ${variant.model.name} ${variant.name}`}
                                                            onSelect={() => {
                                                                const isSelected = formData.variant_ids.includes(variant.id);
                                                                if (isSelected) {
                                                                    setFormData({
                                                                        ...formData,
                                                                        variant_ids: formData.variant_ids.filter(id => id !== variant.id)
                                                                    });
                                                                } else {
                                                                    setFormData({
                                                                        ...formData,
                                                                        variant_ids: [...formData.variant_ids, variant.id]
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Check
                                                                className={`mr-2 h-4 w-4 ${formData.variant_ids.includes(variant.id) ? "opacity-100" : "opacity-0"
                                                                    }`}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">
                                                                    {variant.car_maker.name} {variant.model.name} {variant.name}
                                                                </span>
                                                                {variant.year_start && variant.year_end && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {variant.year_start}-{variant.year_end}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                {/* Selected variants display */}
                                {formData.variant_ids.length > 0 && (
                                    <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                                        {formData.variant_ids.map((variantId) => {
                                            const variant = carVariants.find(v => v.id === variantId);
                                            if (!variant) return null;
                                            return (
                                                <div key={variantId} className="flex items-center justify-between text-sm bg-muted px-2 py-1 rounded">
                                                    <span>
                                                        {variant.car_maker.name} {variant.model.name} {variant.name}
                                                        {variant.year_start && variant.year_end &&
                                                            ` (${variant.year_start}-${variant.year_end})`
                                                        }
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                variant_ids: formData.variant_ids.filter(id => id !== variantId)
                                                            });
                                                        }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateGroup}>
                                    Create Group
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search groups..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="maker-filter">Car Maker</Label>
                            <Select value={selectedMaker || undefined} onValueChange={setSelectedMaker}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All makers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All makers</SelectItem>
                                    {carMakers.map((maker) => (
                                        <SelectItem key={maker.id} value={maker.id}>
                                            {maker.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Compatibility Groups Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Compatibility Groups</CardTitle>
                    <CardDescription>
                        Manage vehicle compatibility groups and their associated products
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Group Name</TableHead>
                                    <TableHead>Car Maker</TableHead>
                                    <TableHead>Year Range</TableHead>
                                    <TableHead>Variants</TableHead>
                                    <TableHead>Products</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredGroups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell className="font-medium">
                                            <div className="truncate">
                                                {group.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="truncate">
                                                {group.car_maker?.name || 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="truncate">
                                                {group.year_start && group.year_end
                                                    ? `${group.year_start}-${group.year_end}`
                                                    : group.year_start || 'N/A'
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {group.variants.length} variants
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {getProductsForGroup(group.id).length} products
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={group.is_mapped ? "default" : "secondary"}>
                                                {group.is_mapped ? "Mapped" : "Unmapped"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openViewDialog(group)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditDialog(group)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteGroup(group.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Compatibility Group</DialogTitle>
                        <DialogDescription>
                            Update the compatibility group details and vehicle associations.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-name">Group Name *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Toyota Corolla 2010-2015"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-car_maker">Car Maker</Label>
                                <Popover open={carMakerSearchOpen} onOpenChange={setCarMakerSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={carMakerSearchOpen}
                                            className="w-full justify-between"
                                        >
                                            {formData.car_maker_id
                                                ? carMakers.find((maker) => maker.id === formData.car_maker_id)?.name
                                                : "Select car maker..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput
                                                placeholder="Search car makers..."
                                                value={carMakerSearchValue}
                                                onValueChange={setCarMakerSearchValue}
                                            />
                                            <CommandList>
                                                <CommandEmpty>No car maker found.</CommandEmpty>
                                                <CommandGroup>
                                                    {carMakers.map((maker) => (
                                                        <CommandItem
                                                            key={maker.id}
                                                            value={maker.name}
                                                            onSelect={() => {
                                                                setFormData({ ...formData, car_maker_id: maker.id });
                                                                setSelectedMaker(maker.id);
                                                                setCarMakerSearchOpen(false);
                                                                setCarMakerSearchValue('');
                                                            }}
                                                        >
                                                            <Check
                                                                className={`mr-2 h-4 w-4 ${formData.car_maker_id === maker.id ? "opacity-100" : "opacity-0"
                                                                    }`}
                                                            />
                                                            {maker.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe this compatibility group..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="edit-year_start">Start Year</Label>
                                <Input
                                    id="edit-year_start"
                                    type="number"
                                    value={formData.year_start}
                                    onChange={(e) => setFormData({ ...formData, year_start: e.target.value })}
                                    placeholder="2010"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-year_end">End Year</Label>
                                <Input
                                    id="edit-year_end"
                                    type="number"
                                    value={formData.year_end}
                                    onChange={(e) => setFormData({ ...formData, year_end: e.target.value })}
                                    placeholder="2015"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-fuel_engine">Fuel Type</Label>
                                <Input
                                    id="edit-fuel_engine"
                                    value={formData.fuel_engine}
                                    onChange={(e) => setFormData({ ...formData, fuel_engine: e.target.value })}
                                    placeholder="Petrol, Diesel, etc."
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Vehicle Variants</Label>
                            <Popover open={variantSearchOpen} onOpenChange={setVariantSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={variantSearchOpen}
                                        className="w-full justify-between"
                                    >
                                        {formData.variant_ids.length > 0
                                            ? `${formData.variant_ids.length} variant(s) selected`
                                            : "Select vehicle variants..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search vehicle variants..."
                                            value={variantSearchValue}
                                            onValueChange={setVariantSearchValue}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No vehicle variants found.</CommandEmpty>
                                            <CommandGroup>
                                                {carVariants.map((variant) => (
                                                    <CommandItem
                                                        key={variant.id}
                                                        value={`${variant.car_maker.name} ${variant.model.name} ${variant.name}`}
                                                        onSelect={() => {
                                                            const isSelected = formData.variant_ids.includes(variant.id);
                                                            if (isSelected) {
                                                                setFormData({
                                                                    ...formData,
                                                                    variant_ids: formData.variant_ids.filter(id => id !== variant.id)
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    variant_ids: [...formData.variant_ids, variant.id]
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${formData.variant_ids.includes(variant.id) ? "opacity-100" : "opacity-0"
                                                                }`}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {variant.car_maker.name} {variant.model.name} {variant.name}
                                                            </span>
                                                            {variant.year_start && variant.year_end && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {variant.year_start}-{variant.year_end}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {/* Selected variants display */}
                            {formData.variant_ids.length > 0 && (
                                <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                                    {formData.variant_ids.map((variantId) => {
                                        const variant = carVariants.find(v => v.id === variantId);
                                        if (!variant) return null;
                                        return (
                                            <div key={variantId} className="flex items-center justify-between text-sm bg-muted px-2 py-1 rounded">
                                                <span>
                                                    {variant.car_maker.name} {variant.model.name} {variant.name}
                                                    {variant.year_start && variant.year_end &&
                                                        ` (${variant.year_start}-${variant.year_end})`
                                                    }
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            variant_ids: formData.variant_ids.filter(id => id !== variantId)
                                                        });
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleEditGroup}>
                                Update Group
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{selectedGroup?.name}</DialogTitle>
                        <DialogDescription>
                            View compatibility group details and associated products
                        </DialogDescription>
                    </DialogHeader>
                    {selectedGroup && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="font-semibold">Description</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedGroup.description || 'No description provided'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="font-semibold">Car Maker</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedGroup.car_maker?.name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="font-semibold">Year Range</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedGroup.year_start && selectedGroup.year_end
                                            ? `${selectedGroup.year_start} - ${selectedGroup.year_end}`
                                            : selectedGroup.year_start || 'N/A'
                                        }
                                    </p>
                                </div>
                                <div>
                                    <Label className="font-semibold">Fuel Type</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedGroup.fuel_engine || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <Label className="font-semibold">Vehicle Variants ({selectedGroup.variants.length})</Label>
                                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                                    {selectedGroup.variants.map((variant) => (
                                        <div key={variant.id} className="flex items-center space-x-2 text-sm">
                                            <Car className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {variant.car_maker.name} {variant.model.name} {variant.name}
                                                {variant.year_start && variant.year_end &&
                                                    ` (${variant.year_start}-${variant.year_end})`
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="font-semibold">Associated Products ({getProductsForGroup(selectedGroup.id).length})</Label>
                                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                                    {getProductsForGroup(selectedGroup.id).map((product) => (
                                        <div key={product.id} className="flex items-center justify-between text-sm">
                                            <span>{product.title}</span>
                                            <Badge variant="outline">
                                                ₹{product.discounted_price || product.price}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default VehicleCompatibilityList;
