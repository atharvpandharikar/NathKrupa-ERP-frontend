import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Package,
    Plus,
    Search,
    MapPin,
    Edit,
    Trash2,
    Eye,
    Filter,
    AlertTriangle,
    ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { inventoryApiFunctions, type InventoryEntry, type Warehouse, type Unit } from "@/lib/api";
import { ProductSearchSelect } from "@/components/ui/ProductSearchSelect";

export default function InventoryEntries() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<InventoryEntry | null>(null);

    // Check if we're viewing a specific entry
    const isDetailView = id !== undefined;
    const isNewEntry = location.pathname.includes('/new');

    // Fetch data
    const { data: entries = [], isLoading } = useQuery({
        queryKey: ['inventory', 'entries', selectedWarehouse],
        queryFn: () => inventoryApiFunctions.inventory.list({
            warehouse: selectedWarehouse === "all" ? undefined : selectedWarehouse
        }),
        enabled: !isDetailView, // Only fetch list when not in detail view
    });

    // Fetch specific entry for detail view
    const { data: entry, isLoading: isLoadingEntry } = useQuery({
        queryKey: ['inventory', 'entries', id],
        queryFn: () => inventoryApiFunctions.inventory.get(id!),
        enabled: isDetailView && !!id,
    });

    const { data: warehouses = [] } = useQuery({
        queryKey: ['inventory', 'warehouses'],
        queryFn: inventoryApiFunctions.warehouses.list,
    });

    const { data: units = [] } = useQuery({
        queryKey: ['inventory', 'units'],
        queryFn: inventoryApiFunctions.units.list,
    });

    // Create entry mutation
    const createMutation = useMutation({
        mutationFn: inventoryApiFunctions.inventory.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'entries'] });
            toast({
                title: "Inventory entry created",
                description: "Inventory entry has been created successfully",
            });
            setIsCreateDialogOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to create inventory entry",
                variant: "destructive",
            });
        },
    });

    // Delete entry mutation
    const deleteMutation = useMutation({
        mutationFn: inventoryApiFunctions.inventory.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'entries'] });
            toast({
                title: "Inventory entry deleted",
                description: "Inventory entry has been deleted successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to delete inventory entry",
                variant: "destructive",
            });
        },
    });

    // Filter entries based on search term
    const filteredEntries = entries.filter(entry =>
        (entry as any).product_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.location_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry as any).warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateEntry = (data: Partial<InventoryEntry>) => {
        createMutation.mutate(data);
    };

    const handleDeleteEntry = (id: string) => {
        if (window.confirm("Are you sure you want to delete this inventory entry?")) {
            deleteMutation.mutate(id);
        }
    };

    // Show detail view for specific entry
    if (isDetailView) {
        if (isLoadingEntry) {
            return <div className="container mx-auto p-6">Loading entry details...</div>;
        }

        if (!entry) {
            return <div className="container mx-auto p-6">Entry not found</div>;
        }

        return (
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Inventory Entry Details</h1>
                        <p className="text-muted-foreground">View detailed information about this inventory entry</p>
                    </div>
                    <Button asChild variant="outline">
                        <Link to="/inventory/entries">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Entries
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            {(entry as any).product_title || 'Unknown Product'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Product ID</label>
                                <p className="text-sm">{entry.product || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Warehouse</label>
                                <p className="text-sm">{(entry as any).warehouse_name || 'Unknown'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Rack</label>
                                <p className="text-sm">{(entry as any).rack_number || 'Unknown'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Location</label>
                                <p className="text-sm">{entry.location_code || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Row</label>
                                <p className="text-sm">{entry.row || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Column</label>
                                <p className="text-sm">{entry.column || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                                <p className="text-sm font-medium">{entry.quantity} {(entry as any).unit_code || 'units'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Created</label>
                                <p className="text-sm">{new Date(entry.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {entry.product_variant && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Product Variant</label>
                                <p className="text-sm">{entry.product_variant}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Entries</h1>
                    <p className="text-muted-foreground">Manage product inventory by location</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Entry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New Inventory Entry</DialogTitle>
                            <DialogDescription>
                                Add a new inventory entry with location and quantity
                            </DialogDescription>
                        </DialogHeader>
                        <InventoryEntryForm
                            warehouses={warehouses}
                            units={units}
                            onSubmit={handleCreateEntry}
                            onCancel={() => setIsCreateDialogOpen(false)}
                            isLoading={createMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search entries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Warehouses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Warehouses</SelectItem>
                        {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Entries Table */}
            {isLoading ? (
                <div className="text-center py-8">Loading inventory entries...</div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No inventory entries found</h3>
                    <p className="text-muted-foreground mb-4">
                        {searchTerm || selectedWarehouse !== "all" ? "No entries match your filters." : "Get started by creating your first inventory entry."}
                    </p>
                    {!searchTerm && selectedWarehouse === "all" && (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Entry
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEntries.map((entry) => (
                        <Card key={entry.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-medium">{(entry as any).product_title || 'Unknown Product'}</h3>
                                            {entry.product_variant && (
                                                <Badge variant="outline" className="text-xs">
                                                    Variant
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-4 w-4" />
                                                <span>{entry.location_code}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">{entry.quantity}</span> {(entry as any).unit_code || 'units'}
                                            </div>
                                            <div>
                                                Warehouse: {(entry as any).warehouse_name || 'Unknown'}
                                            </div>
                                            <div>
                                                Rack: {(entry as any).rack_number || 'Unknown'}
                                            </div>
                                        </div>

                                        {entry.product_details && (entry.product_details.weight || entry.product_details.length || entry.product_details.width || entry.product_details.height) && (
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                Dimensions: {entry.product_details.length && `${entry.product_details.length}×${entry.product_details.width}×${entry.product_details.height}cm`}
                                                {entry.product_details.weight && ` | Weight: ${entry.product_details.weight}kg`}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        <Button asChild size="sm" variant="outline">
                                            <Link to={`/inventory/entries/${entry.id}`}>
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingEntry(entry)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            {editingEntry && (
                <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Inventory Entry</DialogTitle>
                            <DialogDescription>
                                Update inventory entry information
                            </DialogDescription>
                        </DialogHeader>
                        <InventoryEntryForm
                            entry={editingEntry}
                            warehouses={warehouses}
                            units={units}
                            onSubmit={(data) => {
                                // Handle update
                                setEditingEntry(null);
                            }}
                            onCancel={() => setEditingEntry(null)}
                            isLoading={false}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Inventory Entry Form Component
interface InventoryEntryFormProps {
    entry?: InventoryEntry | null;
    warehouses: Warehouse[];
    units: Unit[];
    onSubmit: (data: Partial<InventoryEntry>) => void;
    onCancel: () => void;
    isLoading: boolean;
}

function InventoryEntryForm({ entry, warehouses, units, onSubmit, onCancel, isLoading }: InventoryEntryFormProps) {
    const [formData, setFormData] = useState({
        product: entry?.product || "",
        product_variant: entry?.product_variant || "",
        warehouse: entry?.warehouse || "",
        rack: entry?.rack || "",
        row: entry?.row || "",
        column: entry?.column || "",
        quantity: entry?.quantity || "",
        unit: entry?.unit?.toString() || "",
    });

    const [selectedWarehouse, setSelectedWarehouse] = useState(entry?.warehouse || "");

    // Fetch racks when warehouse changes
    const { data: warehouseRacks = [] } = useQuery({
        queryKey: ['inventory', 'racks', selectedWarehouse],
        queryFn: () => inventoryApiFunctions.racks.list({ warehouse: selectedWarehouse }),
        enabled: !!selectedWarehouse,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData: any = {
            ...formData,
            unit: formData.unit ? parseInt(formData.unit) : undefined,
            row: typeof formData.row === 'string' ? parseInt(formData.row) : formData.row,
            column: typeof formData.column === 'string' ? parseInt(formData.column) : formData.column,
        };
        onSubmit(submitData);
    };

    const handleWarehouseChange = (warehouseId: string) => {
        setSelectedWarehouse(warehouseId);
        setFormData(prev => ({ ...prev, warehouse: warehouseId, rack: "" }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Product *</label>
                    <ProductSearchSelect
                        value={formData.product}
                        onValueChange={(product) => {
                            if (product) {
                                setFormData(prev => ({
                                    ...prev,
                                    product: product.product_id,
                                    // Set unit to product's default, or 'default' if none
                                    unit: (product as any).unit ? (product as any).unit.toString() : 'default'
                                }));
                            } else {
                                setFormData(prev => ({ ...prev, product: '', unit: 'default' }));
                            }
                        }}
                        placeholder="Search and select product..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Product Variant</label>
                    <Input
                        value={formData.product_variant}
                        onChange={(e) => setFormData(prev => ({ ...prev, product_variant: e.target.value }))}
                        placeholder="Variant ID (optional)"
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Warehouse *</label>
                    <Select value={selectedWarehouse} onValueChange={handleWarehouseChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Rack *</label>
                    <Select
                        value={formData.rack}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, rack: value }))}
                        disabled={!selectedWarehouse || warehouseRacks.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={warehouseRacks.length === 0 ? "No racks available" : "Select rack"} />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouseRacks.map((rack) => (
                                <SelectItem key={rack.id} value={rack.id}>
                                    {rack.rack_number} ({rack.row_count}×{rack.column_count})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Row *</label>
                    <Input
                        type="number"
                        min="1"
                        value={formData.row}
                        onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({
                                ...prev,
                                row: value === '' ? '' : parseInt(value) || 1
                            }));
                        }}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Column *</label>
                    <Input
                        type="number"
                        min="1"
                        value={formData.column}
                        onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({
                                ...prev,
                                column: value === '' ? '' : parseInt(value) || 1
                            }));
                        }}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity *</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={formData.quantity}
                        onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({
                                ...prev,
                                quantity: value === '' ? '' : parseFloat(value) || 0
                            }));
                        }}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select unit (will use product default if not specified)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Use Product Default</SelectItem>
                        {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id.toString()}>
                                {unit.name} ({unit.code})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    If no unit is selected, the product's default unit will be used
                </p>
            </div>

            <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                    📦 Product dimensions and stock are managed at the product level. This form tracks quantity and location for inventory management.
                </p>
                <p className="text-xs text-muted-foreground">
                    💡 Product stock is automatically calculated from all inventory entries across warehouses.
                </p>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : entry ? "Update" : "Create"}
                </Button>
            </DialogFooter>
        </form>
    );
}
