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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Search,
    Layers,
    Grid3x3,
    Edit,
    Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { inventoryApiFunctions, type Rack, type Warehouse } from "@/lib/api";

export default function Racks() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingRack, setEditingRack] = useState<Rack | null>(null);

    // Check if we're on the new rack page
    const isNewRack = location.pathname.includes('/new');

    // Auto-open create dialog if on new rack page
    useEffect(() => {
        if (isNewRack) {
            setIsCreateDialogOpen(true);
        }
    }, [isNewRack]);

    // Fetch racks
    const { data: racks = [], isLoading } = useQuery({
        queryKey: ['inventory', 'racks'],
        queryFn: inventoryApiFunctions.racks.list,
    });

    // Fetch warehouses for the form
    const { data: warehouses = [] } = useQuery({
        queryKey: ['inventory', 'warehouses'],
        queryFn: inventoryApiFunctions.warehouses.list,
    });

    // Create rack mutation
    const createMutation = useMutation({
        mutationFn: inventoryApiFunctions.racks.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'racks'] });
            toast({
                title: "Rack created",
                description: "Rack has been created successfully",
            });
            setIsCreateDialogOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to create rack",
                variant: "destructive",
            });
        },
    });

    // Delete rack mutation
    const deleteMutation = useMutation({
        mutationFn: inventoryApiFunctions.racks.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'racks'] });
            toast({
                title: "Rack deleted",
                description: "Rack has been deleted successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to delete rack",
                variant: "destructive",
            });
        },
    });

    // Filter racks based on search term
    const filteredRacks = racks.filter(rack =>
        rack.rack_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateRack = (data: Partial<Rack>) => {
        createMutation.mutate(data);
    };

    const handleDeleteRack = (id: string) => {
        if (window.confirm("Are you sure you want to delete this rack?")) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Storage Racks</h1>
                    <p className="text-muted-foreground">Manage storage racks within warehouses</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Rack
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Rack</DialogTitle>
                            <DialogDescription>
                                Add a new storage rack to organize inventory
                            </DialogDescription>
                        </DialogHeader>
                        <RackForm
                            warehouses={warehouses}
                            onSubmit={handleCreateRack}
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
                        placeholder="Search racks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Racks Grid */}
            {isLoading ? (
                <div className="text-center py-8">Loading racks...</div>
            ) : filteredRacks.length === 0 ? (
                <div className="text-center py-8">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No racks found</h3>
                    <p className="text-muted-foreground mb-4">
                        {searchTerm ? "No racks match your search." : "Racks are created within warehouses."}
                    </p>
                    <Button asChild>
                        <Link to="/inventory/warehouses">
                            Go to Warehouses
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRacks.map((rack) => (
                        <Card key={rack.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <CardTitle className="text-lg">Rack {rack.rack_number}</CardTitle>
                                            <p className="text-sm text-muted-foreground">
                                                Warehouse: {rack.warehouse_details?.name || 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={rack.is_active ? "default" : "secondary"}>
                                        {rack.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Grid3x3 className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        <span className="font-medium">{rack.row_count}</span> rows × <span className="font-medium">{rack.column_count}</span> columns
                                    </span>
                                </div>

                                {rack.description && (
                                    <p className="text-sm text-muted-foreground">{rack.description}</p>
                                )}

                                <div className="flex items-center justify-between text-sm pt-2 border-t">
                                    <div>
                                        <span className="font-medium">{rack.total_cells || 0}</span> cells
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{rack.inventory_count || 0}</span> items
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setEditingRack(rack)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteRack(rack.id.toString())}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            {editingRack && (
                <Dialog open={!!editingRack} onOpenChange={() => setEditingRack(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Rack</DialogTitle>
                            <DialogDescription>
                                Update rack information
                            </DialogDescription>
                        </DialogHeader>
                        <RackForm
                            rack={editingRack}
                            warehouses={warehouses}
                            onSubmit={(data) => {
                                // Handle update
                                setEditingRack(null);
                            }}
                            onCancel={() => setEditingRack(null)}
                            isLoading={false}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Rack Form Component
interface RackFormProps {
    rack?: Rack | null;
    warehouses: Warehouse[];
    onSubmit: (data: Partial<Rack>) => void;
    onCancel: () => void;
    isLoading: boolean;
}

function RackForm({ rack, warehouses, onSubmit, onCancel, isLoading }: RackFormProps) {
    const [formData, setFormData] = useState({
        warehouse: rack?.warehouse || "",
        rack_number: rack?.rack_number || "",
        description: rack?.description || "",
        row_count: rack?.row_count || "",
        column_count: rack?.column_count || "",
        is_active: rack?.is_active ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Warehouse *</label>
                <Select value={formData.warehouse} onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}>
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
                <label className="text-sm font-medium">Rack Number *</label>
                <Input
                    value={formData.rack_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, rack_number: e.target.value }))}
                    placeholder="e.g., R001"
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Rows *</label>
                    <Input
                        type="number"
                        min="1"
                        value={formData.row_count}
                        onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({
                                ...prev,
                                row_count: value === '' ? '' : parseInt(value) || 1
                            }));
                        }}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Columns *</label>
                    <Input
                        type="number"
                        min="1"
                        value={formData.column_count}
                        onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({
                                ...prev,
                                column_count: value === '' ? '' : parseInt(value) || 1
                            }));
                        }}
                        required
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
                    {isLoading ? "Saving..." : rack ? "Update" : "Create"}
                </Button>
            </DialogFooter>
        </form>
    );
}
