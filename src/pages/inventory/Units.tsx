import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inventoryApiFunctions, type Unit } from "@/lib/api";

export default function Units() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

    // Fetch units
    const { data: units = [], isLoading } = useQuery({
        queryKey: ['inventory', 'units'],
        queryFn: inventoryApiFunctions.units.list,
    });

    // Create unit mutation
    const createMutation = useMutation({
        mutationFn: inventoryApiFunctions.units.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] });
            toast({
                title: "Unit created",
                description: "Unit has been created successfully",
            });
            setIsCreateDialogOpen(false);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to create unit",
                variant: "destructive",
            });
        },
    });

    // Update unit mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: number; data: Partial<Unit> }) =>
            inventoryApiFunctions.units.update(data.id, data.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] });
            toast({
                title: "Unit updated",
                description: "Unit has been updated successfully",
            });
            setEditingUnit(null);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to update unit",
                variant: "destructive",
            });
        },
    });

    // Delete unit mutation
    const deleteMutation = useMutation({
        mutationFn: inventoryApiFunctions.units.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] });
            toast({
                title: "Unit deleted",
                description: "Unit has been deleted successfully",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error?.message || "Failed to delete unit",
                variant: "destructive",
            });
        },
    });

    // Filter units based on search term
    const filteredUnits = units.filter(unit =>
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateUnit = (data: Partial<Unit>) => {
        createMutation.mutate(data);
    };

    const handleDeleteUnit = (id: number) => {
        if (window.confirm("Are you sure you want to delete this unit?")) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Measurement Units</h1>
                    <p className="text-muted-foreground">Manage units of measurement for inventory</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Unit
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Unit</DialogTitle>
                            <DialogDescription>
                                Add a new unit of measurement (e.g., kg, liter, piece)
                            </DialogDescription>
                        </DialogHeader>
                        <UnitForm
                            onSubmit={handleCreateUnit}
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
                        placeholder="Search units..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Units Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        All Units
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading units...</div>
                    ) : filteredUnits.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No units found</h3>
                            <p className="text-muted-foreground mb-4">
                                {searchTerm ? "No units match your search." : "Get started by creating your first unit."}
                            </p>
                            {!searchTerm && (
                                <Button onClick={() => setIsCreateDialogOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Unit
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Decimal</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUnits.map((unit) => (
                                    <TableRow key={unit.id}>
                                        <TableCell className="font-medium">{unit.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{unit.code}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {unit.description || "-"}
                                        </TableCell>
                                        <TableCell>
                                            {unit.is_decimal ? (
                                                <Badge variant="secondary">Decimal</Badge>
                                            ) : (
                                                <Badge variant="outline">Whole</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={unit.is_active ? "default" : "secondary"}>
                                                {unit.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditingUnit(unit)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteUnit(unit.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            {editingUnit && (
                <Dialog open={!!editingUnit} onOpenChange={() => setEditingUnit(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Unit</DialogTitle>
                            <DialogDescription>
                                Update unit information
                            </DialogDescription>
                        </DialogHeader>
                        <UnitForm
                            unit={editingUnit}
                            onSubmit={(data) => {
                                if (editingUnit) {
                                    updateMutation.mutate({ id: editingUnit.id, data });
                                }
                            }}
                            onCancel={() => setEditingUnit(null)}
                            isLoading={updateMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Unit Form Component
interface UnitFormProps {
    unit?: Unit | null;
    onSubmit: (data: Partial<Unit>) => void;
    onCancel: () => void;
    isLoading: boolean;
}

function UnitForm({ unit, onSubmit, onCancel, isLoading }: UnitFormProps) {
    const [formData, setFormData] = useState({
        name: unit?.name || "",
        code: unit?.code || "",
        description: unit?.description || "",
        is_decimal: unit?.is_decimal ?? false,
        is_active: unit?.is_active ?? true,
    });

    // Update form data when unit changes
    const prevUnitRef = React.useRef(unit);
    if (prevUnitRef.current !== unit) {
        prevUnitRef.current = unit;
        setFormData({
            name: unit?.name || "",
            code: unit?.code || "",
            description: unit?.description || "",
            is_decimal: unit?.is_decimal ?? false,
            is_active: unit?.is_active ?? true,
        });
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Kilogram"
                    required
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Code *</label>
                <Input
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., kg"
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

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="is_decimal"
                    checked={formData.is_decimal}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_decimal: e.target.checked }))}
                    className="rounded"
                />
                <label htmlFor="is_decimal" className="text-sm font-medium">
                    Allow Decimal Values
                </label>
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
                    {isLoading ? "Saving..." : unit ? "Update" : "Create"}
                </Button>
            </DialogFooter>
        </form>
    );
}
