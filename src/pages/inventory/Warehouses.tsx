import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    Warehouse,
    Plus,
    Search,
    MapPin,
    Phone,
    Edit,
    Trash2,
    Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { inventoryApiFunctions, type Warehouse as WarehouseType } from "@/lib/api";

export default function Warehouses() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);

    // Check if we're on the new warehouse page
    const isNewWarehouse = location.pathname.includes('/new');

    // Auto-open create dialog if on new warehouse page
    useEffect(() => {
        if (isNewWarehouse) {
            setIsCreateDialogOpen(true);
        }
    }, [isNewWarehouse]);

    // Fetch warehouses
    const { data: warehouses = [], isLoading } = useQuery({
        queryKey: ['inventory', 'warehouses'],
        queryFn: inventoryApiFunctions.warehouses.list,
    });

    // Create warehouse mutation
    const createMutation = useMutation({
        mutationFn: inventoryApiFunctions.warehouses.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'warehouses'] });
            toast({
                title: "Warehouse created",
                description: "Warehouse has been created successfully",
            });
            setIsCreateDialogOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to create warehouse",
                variant: "destructive",
            });
        },
    });

    // Delete warehouse mutation
    const deleteMutation = useMutation({
        mutationFn: inventoryApiFunctions.warehouses.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'warehouses'] });
            toast({
                title: "Warehouse deleted",
                description: "Warehouse has been deleted successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to delete warehouse",
                variant: "destructive",
            });
        },
    });

    // Filter warehouses based on search term
    const filteredWarehouses = warehouses.filter(warehouse =>
        warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.state?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateWarehouse = (data: Partial<WarehouseType>) => {
        createMutation.mutate(data);
    };

    const handleDeleteWarehouse = (id: string) => {
        if (window.confirm("Are you sure you want to delete this warehouse?")) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Warehouses</h1>
                    <p className="text-muted-foreground">Manage your warehouse locations</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Warehouse
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Warehouse</DialogTitle>
                            <DialogDescription>
                                Add a new warehouse location to your inventory system
                            </DialogDescription>
                        </DialogHeader>
                        <WarehouseForm
                            onSubmit={handleCreateWarehouse}
                            onCancel={() => setIsCreateDialogOpen(false)}
                            isLoading={createMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search warehouses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Warehouses Grid */}
            {isLoading ? (
                <div className="text-center py-8">Loading warehouses...</div>
            ) : filteredWarehouses.length === 0 ? (
                <div className="text-center py-8">
                    <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No warehouses found</h3>
                    <p className="text-muted-foreground mb-4">
                        {searchTerm ? "No warehouses match your search." : "Get started by creating your first warehouse."}
                    </p>
                    {!searchTerm && (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Warehouse
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredWarehouses.map((warehouse) => (
                        <Card key={warehouse.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Warehouse className="h-5 w-5 text-muted-foreground" />
                                        <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                                    </div>
                                    <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                                        {warehouse.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Code: {warehouse.code}</p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {warehouse.address && (
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div className="text-sm">
                                            <div>{warehouse.address}</div>
                                            {warehouse.city && warehouse.state && (
                                                <div className="text-muted-foreground">
                                                    {warehouse.city}, {warehouse.state} {warehouse.pin_code}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {warehouse.contact_person && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <div className="text-sm">
                                            <div>{warehouse.contact_person}</div>
                                            {warehouse.contact_number && (
                                                <div className="text-muted-foreground">{warehouse.contact_number}</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-sm">
                                    <div>
                                        <span className="font-medium">{warehouse.total_racks || 0}</span> racks
                                    </div>
                                    <div>
                                        <span className="font-medium">{warehouse.total_inventory_items || 0}</span> items
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button asChild size="sm" variant="outline" className="flex-1">
                                        <Link to={`/inventory/warehouses/${warehouse.id}`}>
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                        </Link>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingWarehouse(warehouse)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteWarehouse(warehouse.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            {editingWarehouse && (
                <Dialog open={!!editingWarehouse} onOpenChange={() => setEditingWarehouse(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Warehouse</DialogTitle>
                            <DialogDescription>
                                Update warehouse information
                            </DialogDescription>
                        </DialogHeader>
                        <WarehouseForm
                            warehouse={editingWarehouse}
                            onSubmit={(data) => {
                                // Handle update
                                setEditingWarehouse(null);
                            }}
                            onCancel={() => setEditingWarehouse(null)}
                            isLoading={false}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Warehouse Form Component
interface WarehouseFormProps {
    warehouse?: WarehouseType | null;
    onSubmit: (data: Partial<WarehouseType>) => void;
    onCancel: () => void;
    isLoading: boolean;
}

function WarehouseForm({ warehouse, onSubmit, onCancel, isLoading }: WarehouseFormProps) {
    const [formData, setFormData] = useState({
        name: warehouse?.name || "",
        code: warehouse?.code || "",
        address: warehouse?.address || "",
        city: warehouse?.city || "",
        state: warehouse?.state || "",
        pin_code: warehouse?.pin_code || "",
        contact_person: warehouse?.contact_person || "",
        contact_number: warehouse?.contact_number || "",
        is_active: warehouse?.is_active ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Warehouse name"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Code *</label>
                    <Input
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="WH001"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Full address"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">PIN Code</label>
                    <Input
                        value={formData.pin_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, pin_code: e.target.value }))}
                        placeholder="123456"
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Person</label>
                    <Input
                        value={formData.contact_person}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                        placeholder="Contact person name"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Number</label>
                    <Input
                        value={formData.contact_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_number: e.target.value }))}
                        placeholder="Phone number"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                    Active
                </label>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : warehouse ? "Update" : "Create"}
                </Button>
            </DialogFooter>
        </form>
    );
}


