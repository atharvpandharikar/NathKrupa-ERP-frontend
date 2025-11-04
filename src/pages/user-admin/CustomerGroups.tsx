import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
    Save,
    Users,
    Percent,
} from "lucide-react";
import { customerGroupsApi, type CustomerGroup } from "@/lib/api";
import { toast } from "sonner";

export default function CustomerGroups() {
    const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<CustomerGroup | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        discount_percentage: "0",
        description: "",
        is_active: true,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const groups = await customerGroupsApi.list();
            setCustomerGroups(groups);
        } catch (error) {
            console.error('Failed to fetch customer groups:', error);
            toast.error('Failed to load customer groups');
        } finally {
            setLoading(false);
        }
    };

    const openAddDialog = () => {
        setFormData({
            name: "",
            discount_percentage: "0",
            description: "",
            is_active: true,
        });
        setIsAddDialogOpen(true);
    };

    const openEditDialog = (group: CustomerGroup) => {
        setSelectedGroup(group);
        setFormData({
            name: group.name,
            discount_percentage: group.discount_percentage,
            description: group.description || "",
            is_active: group.is_active,
        });
        setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Group name is required');
            return;
        }

        const discountValue = parseFloat(formData.discount_percentage);
        if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
            toast.error('Discount percentage must be between 0 and 100');
            return;
        }

        try {
            if (selectedGroup) {
                // Update existing
                await customerGroupsApi.update(selectedGroup.id, {
                    name: formData.name.trim(),
                    discount_percentage: discountValue.toString(),
                    description: formData.description.trim() || undefined,
                    is_active: formData.is_active,
                });
                toast.success('Customer group updated successfully');
            } else {
                // Create new
                await customerGroupsApi.create({
                    name: formData.name.trim(),
                    discount_percentage: discountValue.toString(),
                    description: formData.description.trim() || undefined,
                    is_active: formData.is_active,
                });
                toast.success('Customer group created successfully');
            }
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedGroup(null);
            fetchData();
        } catch (error: any) {
            console.error('Failed to save customer group:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to save customer group';
            toast.error(errorMessage);
        }
    };

    const handleDelete = async () => {
        if (!groupToDelete) return;

        try {
            await customerGroupsApi.delete(groupToDelete.id);
            toast.success('Customer group deleted successfully');
            setDeleteConfirmOpen(false);
            setGroupToDelete(null);
            fetchData();
        } catch (error: any) {
            console.error('Failed to delete customer group:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete customer group';
            toast.error(errorMessage);
        }
    };

    const openDeleteConfirm = (group: CustomerGroup) => {
        setGroupToDelete(group);
        setDeleteConfirmOpen(true);
    };

    const filteredGroups = customerGroups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Groups</h1>
                    <p className="text-sm text-gray-600">Manage customer groups with discount percentages</p>
                </div>
                <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Group
                </Button>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="p-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search groups..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Groups Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {filteredGroups.length} Customer Group{filteredGroups.length !== 1 ? 's' : ''}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredGroups.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {customerGroups.length === 0 && !searchTerm
                                ? 'No customer groups yet. Use the button above to add the first group.'
                                : 'No groups found matching your search.'}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Group Name</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Customers</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredGroups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell className="font-medium">{group.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="gap-1">
                                                <Percent className="h-3 w-3" />
                                                {parseFloat(group.discount_percentage).toFixed(2)}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4 text-gray-400" />
                                                {group.customer_count || 0}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={group.is_active ? "default" : "secondary"}>
                                                {group.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {group.description || "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditDialog(group)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDeleteConfirm(group)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
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

            {/* Add/Edit Dialog */}
            <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedGroup(null);
                }
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedGroup ? 'Edit Customer Group' : 'Add Customer Group'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedGroup
                                ? 'Update customer group details and discount percentage'
                                : 'Create a new customer group with discount percentage'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Group Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Premium Denters, Regular Painters"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Discount Percentage *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={formData.discount_percentage}
                                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                            <p className="text-xs text-gray-500">
                                Discount percentage applied to base product price for customers in this group
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Additional notes about this customer group"
                                rows={3}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded"
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddDialogOpen(false);
                                setIsEditDialogOpen(false);
                                setSelectedGroup(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" />
                            {selectedGroup ? 'Update' : 'Create'} Group
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Customer Group</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{groupToDelete?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

