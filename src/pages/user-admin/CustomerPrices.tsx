import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    History,
    X,
    Save,
    Trash2,
    Layers,
} from "lucide-react";
import { 
    customerProductPricesApi, 
    shopCustomersApi, 
    shopProductsApi, 
    type CustomerProductPrice,
    type CustomerProductPriceTier,
    type CustomerProductPriceHistory,
    type ShopCustomer,
    type ShopProduct,
} from "@/lib/api";
import { ProductSearchSelect } from "@/components/ui/ProductSearchSelect";
import { toast } from "sonner";

export default function CustomerPrices() {
    const [customerPrices, setCustomerPrices] = useState<CustomerProductPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCustomer, setFilterCustomer] = useState<string>("all");
    const [filterActive, setFilterActive] = useState<string>("all");

    const [customers, setCustomers] = useState<ShopCustomer[]>([]);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState<string>("");
    const [selectedProductObject, setSelectedProductObject] = useState<ShopProduct | null>(null);
    const [selectedCustomerForAdd, setSelectedCustomerForAdd] = useState<string>("");

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isTiersDialogOpen, setIsTiersDialogOpen] = useState(false);
    const [selectedPrice, setSelectedPrice] = useState<CustomerProductPrice | null>(null);
    const [priceHistory, setPriceHistory] = useState<CustomerProductPriceHistory[]>([]);
    const [priceTiers, setPriceTiers] = useState<CustomerProductPriceTier[]>([]);

    const [editForm, setEditForm] = useState({
        selling_price: "",
        discount_percentage: "",
        is_active: true,
        notes: "",
    });

    const [tierForm, setTierForm] = useState({
        min_quantity: "1",
        max_quantity: "",
        tier_price: "",
        tier_discount_percentage: "",
        priority: 0,
        is_active: true,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pricesResponse, customersResponse] = await Promise.all([
                customerProductPricesApi.list(),
                shopCustomersApi.list(),
            ]);

            setCustomerPrices(pricesResponse);
            setCustomers(customersResponse);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load customer prices');
        } finally {
            setLoading(false);
        }
    };

    const openEditDialog = (price: CustomerProductPrice) => {
        setSelectedPrice(price);
        setEditForm({
            selling_price: price.selling_price || "",
            discount_percentage: price.discount_percentage || "",
            is_active: price.is_active,
            notes: price.notes || "",
        });
        setIsEditDialogOpen(true);
    };

    const openHistoryDialog = async (price: CustomerProductPrice) => {
        setSelectedPrice(price);
        try {
            if (price.customer && price.product_id) {
                const history = await customerProductPricesApi.getPriceHistory(price.customer, price.product_id);
                setPriceHistory(history);
                setIsHistoryDialogOpen(true);
            }
        } catch (error) {
            console.error('Failed to fetch price history:', error);
            toast.error('Failed to load price history');
        }
    };

    const openTiersDialog = async (price: CustomerProductPrice) => {
        setSelectedPrice(price);
        setPriceTiers(price.price_tiers || []);
        setIsTiersDialogOpen(true);
    };

    const handleSave = async () => {
        if (!selectedPrice) return;

        if (!editForm.selling_price && !editForm.discount_percentage) {
            toast.error('Either selling price or discount percentage is required');
            return;
        }

        try {
            await customerProductPricesApi.update(selectedPrice.id, {
                selling_price: editForm.selling_price ? String(parseFloat(editForm.selling_price)) : undefined,
                discount_percentage: editForm.discount_percentage ? String(parseFloat(editForm.discount_percentage)) : undefined,
                is_active: editForm.is_active,
                notes: editForm.notes,
            });

            toast.success('Customer price updated successfully');
            setIsEditDialogOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Failed to update customer price:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update customer price';
            toast.error(errorMessage);
        }
    };

    const handleAdd = async () => {
        if (!selectedCustomerForAdd || selectedCustomerForAdd === "all") {
            toast.error('Please select a customer');
            return;
        }

        if (!selectedProductForAdd) {
            toast.error('Please select a product');
            return;
        }

        if (!editForm.selling_price && !editForm.discount_percentage) {
            toast.error('Either selling price or discount percentage is required');
            return;
        }

        try {
            await customerProductPricesApi.create({
                customer: selectedCustomerForAdd,
                product: selectedProductForAdd,
                selling_price: editForm.selling_price ? String(parseFloat(editForm.selling_price)) : undefined,
                discount_percentage: editForm.discount_percentage ? String(parseFloat(editForm.discount_percentage)) : undefined,
                is_active: editForm.is_active,
                notes: editForm.notes,
            });

            toast.success('Customer price added successfully');
            setIsAddDialogOpen(false);
            setSelectedProductForAdd("");
            setSelectedProductObject(null);
            setSelectedCustomerForAdd("");
            setEditForm({
                selling_price: "",
                discount_percentage: "",
                is_active: true,
                notes: "",
            });
            fetchData();
        } catch (error: any) {
            console.error('Failed to create customer price:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to add customer price';
            toast.error(errorMessage);
        }
    };

    const handleAddTier = async () => {
        if (!selectedPrice) return;

        if (!tierForm.tier_price && !tierForm.tier_discount_percentage) {
            toast.error('Either tier price or tier discount percentage is required');
            return;
        }

        try {
            // Get the full price object to add tier
            const priceData = await customerProductPricesApi.get(selectedPrice.id);
            
            // Add tier to existing tiers
            const updatedTiers = [
                ...(priceData.price_tiers || []),
                {
                    min_quantity: parseFloat(tierForm.min_quantity),
                    max_quantity: tierForm.max_quantity ? parseFloat(tierForm.max_quantity) : undefined,
                    tier_price: tierForm.tier_price ? parseFloat(tierForm.tier_price) : undefined,
                    tier_discount_percentage: tierForm.tier_discount_percentage ? parseFloat(tierForm.tier_discount_percentage) : undefined,
                    priority: tierForm.priority,
                    is_active: tierForm.is_active,
                }
            ];

            // Update with nested tiers using PUT
            await customerProductPricesApi.update(selectedPrice.id, {
                customer: priceData.customer,
                product: priceData.product,
                selling_price: priceData.selling_price,
                discount_percentage: priceData.discount_percentage,
                is_active: priceData.is_active,
                notes: priceData.notes,
                price_tiers: updatedTiers as any,
            });

            toast.success('Price tier added successfully');
            setTierForm({
                min_quantity: "1",
                max_quantity: "",
                tier_price: "",
                tier_discount_percentage: "",
                priority: 0,
                is_active: true,
            });
            fetchData();
            // Keep dialog open to add more tiers
        } catch (error: any) {
            console.error('Failed to add tier:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to add price tier';
            toast.error(errorMessage);
        }
    };

    const filteredPrices = customerPrices.filter(price => {
        const matchesSearch = searchTerm === "" ||
            (price.product_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (price.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCustomer = filterCustomer === "all" || price.customer === filterCustomer;
        const matchesActive = filterActive === "all" ||
            (filterActive === "active" && price.is_active) ||
            (filterActive === "inactive" && !price.is_active);

        return matchesSearch && matchesCustomer && matchesActive;
    });

    // Group prices by product for comparison
    const pricesByProduct = filteredPrices.reduce((acc, price) => {
        const productId = price.product_id || price.product;
        if (!acc[productId]) {
            acc[productId] = [];
        }
        acc[productId].push(price);
        return acc;
    }, {} as Record<string, CustomerProductPrice[]>);

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Product Prices</h1>
                    <p className="text-sm text-gray-600">Manage customer-specific pricing</p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Price
                </Button>
            </div>

            {/* Filters */}
            <Card className="shadow-sm">
                <CardContent className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Search products or customers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-xs"
                            />
                        </div>
                        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="All Customers" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Customers</SelectItem>
                                {customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                        {customer.full_name || customer.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterActive} onValueChange={setFilterActive}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Grouped Customer Prices */}
            <Card className="shadow-sm">
                <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm font-semibold">
                        {Object.keys(pricesByProduct).length} Products • {filteredPrices.length} Customer Prices
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    {Object.keys(pricesByProduct).length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-500">
                            No customer prices found
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(pricesByProduct).map(([productId, prices]) => (
                                <div
                                    key={productId}
                                    className="border rounded p-2.5 hover:border-primary/50 transition-colors bg-white"
                                >
                                    {/* Product Header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-xs truncate">{prices[0].product_title}</h3>
                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 mt-0.5">
                                                {prices.length} customer{prices.length > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Customer Cards Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
                                        {prices.map((price) => (
                                            <div
                                                key={price.id}
                                                className="border rounded p-1.5 text-[10px] border-gray-200 bg-gray-50/30"
                                            >
                                                {/* Customer Name */}
                                                <div className="font-medium text-gray-900 truncate text-[10px] mb-0.5">
                                                    {price.customer_name || price.customer_email || 'Unknown'}
                                                </div>

                                                {/* Price */}
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    {price.selling_price ? (
                                                        <span className="text-sm font-bold text-primary">
                                                            ₹{parseFloat(price.selling_price).toFixed(2)}
                                                        </span>
                                                    ) : price.discount_percentage ? (
                                                        <span className="text-sm font-bold text-primary">
                                                            {parseFloat(price.discount_percentage).toFixed(2)}% off
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No price set</span>
                                                    )}
                                                    {!price.is_active && (
                                                        <Badge variant="secondary" className="text-[8px] h-3 px-1 leading-none">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Has Tiers Indicator */}
                                                {price.price_tiers && price.price_tiers.length > 0 && (
                                                    <div className="flex items-center gap-0.5 mb-1 text-[9px] text-gray-600">
                                                        <Layers className="h-2.5 w-2.5" />
                                                        {price.price_tiers.length} tier{price.price_tiers.length > 1 ? 's' : ''}
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-0.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-5 px-1.5 text-[9px] flex-1"
                                                        onClick={() => openEditDialog(price)}
                                                    >
                                                        <Edit className="h-2.5 w-2.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-5 px-1.5 text-[9px] flex-1"
                                                        onClick={() => openTiersDialog(price)}
                                                    >
                                                        <Layers className="h-2.5 w-2.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-5 px-1.5 text-[9px] flex-1"
                                                        onClick={() => openHistoryDialog(price)}
                                                    >
                                                        <History className="h-2.5 w-2.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Customer Price</DialogTitle>
                        <DialogDescription>
                            {selectedPrice && `Update price for ${selectedPrice.product_title} for ${selectedPrice.customer_name || selectedPrice.customer_email}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Selling Price (₹)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.selling_price}
                                    onChange={(e) => setEditForm({ ...editForm, selling_price: e.target.value })}
                                    placeholder="Fixed price"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Discount Percentage (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editForm.discount_percentage}
                                    onChange={(e) => setEditForm({ ...editForm, discount_percentage: e.target.value })}
                                    placeholder="Percentage off base price"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Set either selling price (fixed) or discount percentage (percentage off base price), not both.
                        </p>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={editForm.is_active}
                                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                className="rounded"
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                rows={3}
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Customer Price</DialogTitle>
                        <DialogDescription>
                            Add a new customer-specific price for a product
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Customer *</Label>
                                <Select value={selectedCustomerForAdd} onValueChange={setSelectedCustomerForAdd}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map((customer) => (
                                            <SelectItem key={customer.id} value={customer.id}>
                                                {customer.full_name || customer.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Product *</Label>
                                <ProductSearchSelect
                                    value={selectedProductForAdd}
                                    onValueChange={(product) => {
                                        if (product) {
                                            setSelectedProductForAdd(product.product_id);
                                            setSelectedProductObject(product);
                                        } else {
                                            setSelectedProductForAdd("");
                                            setSelectedProductObject(null);
                                        }
                                    }}
                                    placeholder="Search and select product..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Selling Price (₹)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.selling_price}
                                    onChange={(e) => setEditForm({ ...editForm, selling_price: e.target.value })}
                                    placeholder="Fixed price"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Discount Percentage (%)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editForm.discount_percentage}
                                    onChange={(e) => setEditForm({ ...editForm, discount_percentage: e.target.value })}
                                    placeholder="Percentage off base price"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            Set either selling price (fixed) or discount percentage (percentage off base price), not both.
                        </p>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="add_is_active"
                                checked={editForm.is_active}
                                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                className="rounded"
                            />
                            <Label htmlFor="add_is_active">Active</Label>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                rows={3}
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Price
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Price History Dialog */}
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Price History</DialogTitle>
                        <DialogDescription>
                            {selectedPrice && `Price history for ${selectedPrice.product_title} for ${selectedPrice.customer_name || selectedPrice.customer_email}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {priceHistory.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No price history available
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Effective From</TableHead>
                                        <TableHead>Effective To</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {priceHistory.map((history) => (
                                        <TableRow key={history.id}>
                                            <TableCell className="font-semibold">
                                                {history.selling_price ? `₹${parseFloat(history.selling_price).toFixed(2)}` : "—"}
                                            </TableCell>
                                            <TableCell>
                                                {history.discount_percentage ? `${parseFloat(history.discount_percentage).toFixed(2)}%` : "—"}
                                            </TableCell>
                                            <TableCell>{new Date(history.effective_from).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                {history.effective_to
                                                    ? new Date(history.effective_to).toLocaleDateString()
                                                    : <Badge>Current</Badge>
                                                }
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {history.notes || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Tiers Dialog */}
            <Dialog open={isTiersDialogOpen} onOpenChange={setIsTiersDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Price Tiers</DialogTitle>
                        <DialogDescription>
                            {selectedPrice && `Manage quantity-based pricing tiers for ${selectedPrice.product_title} for ${selectedPrice.customer_name || selectedPrice.customer_email}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Existing Tiers */}
                        {priceTiers.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Existing Tiers</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Min Qty</TableHead>
                                            <TableHead>Max Qty</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Discount</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {priceTiers.map((tier) => (
                                            <TableRow key={tier.id}>
                                                <TableCell>{tier.min_quantity}</TableCell>
                                                <TableCell>{tier.max_quantity || "∞"}</TableCell>
                                                <TableCell>{tier.tier_price ? `₹${parseFloat(tier.tier_price).toFixed(2)}` : "—"}</TableCell>
                                                <TableCell>{tier.tier_discount_percentage ? `${parseFloat(tier.tier_discount_percentage).toFixed(2)}%` : "—"}</TableCell>
                                                <TableCell>{tier.priority}</TableCell>
                                                <TableCell>
                                                    <Badge variant={tier.is_active ? "default" : "secondary"}>
                                                        {tier.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Add New Tier */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-2">Add New Tier</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Min Quantity *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={tierForm.min_quantity}
                                        onChange={(e) => setTierForm({ ...tierForm, min_quantity: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Quantity</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={tierForm.max_quantity}
                                        onChange={(e) => setTierForm({ ...tierForm, max_quantity: e.target.value })}
                                        placeholder="Leave empty for unlimited"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tier Price (₹)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={tierForm.tier_price}
                                        onChange={(e) => setTierForm({ ...tierForm, tier_price: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tier Discount (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={tierForm.tier_discount_percentage}
                                        onChange={(e) => setTierForm({ ...tierForm, tier_discount_percentage: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Input
                                        type="number"
                                        value={tierForm.priority}
                                        onChange={(e) => setTierForm({ ...tierForm, priority: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2 flex items-end">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="tier_is_active"
                                            checked={tierForm.is_active}
                                            onChange={(e) => setTierForm({ ...tierForm, is_active: e.target.checked })}
                                            className="rounded"
                                        />
                                        <Label htmlFor="tier_is_active">Active</Label>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Set either tier price (fixed) or tier discount percentage (percentage off base price), not both.
                            </p>
                            <Button onClick={handleAddTier} className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Tier
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTiersDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

