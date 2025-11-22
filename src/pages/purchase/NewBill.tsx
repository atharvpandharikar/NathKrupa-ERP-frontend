import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Calculator,
    Trash
} from "lucide-react";
import { purchaseApi, type Vendor, type PurchaseBill, inventoryApiFunctions, type Unit } from "@/lib/api";
import { shopProductsApi, type ShopProduct } from "@/lib/shop-api";
import { toast } from "sonner";
import AddProductForm from "@/components/AddProductForm";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";

// Price source tracking - proper way to know where price came from
type PriceSource = 'manual' | 'vendor' | 'product-default';

interface BillItem {
    id?: number;
    product_id?: string; // UUID string
    product?: ShopProduct;
    quantity: number;
    purchase_price: number;
    gst_percent: number;
    gst_amount: number;
    total: number;
    priceSource?: PriceSource; // Track the source of the price
    unit_id?: number; // Unit ID
    unit?: { id: number; name: string; code: string; is_decimal: boolean } | null; // Unit details
}

// LocalStorage key for drafts
const DRAFT_KEY = 'purchase_new_bill_draft_v1';

// Helper function to convert products to SearchableSelectOption format
const convertProductsToOptions = (products: ShopProduct[]): SearchableSelectOption[] => {
    return products.map((product) => {
        const purchasePrice = (product as any).purchase_price;
        return {
            value: product.product_id,
            label: `${product.title} - MRP: ₹${product.price}${purchasePrice ? ` | Cost: ₹${purchasePrice}` : ''} | GST: ${product.taxes ?? 18}%`,
            searchableText: `${product.title} ${product.product_id} ${product.price} ${purchasePrice || ''} ${product.taxes ?? 18}`.toLowerCase()
        };
    });
};

export default function NewBill() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showNewProductForm, setShowNewProductForm] = useState(false);

    // Draft/autosave refs
    const draftSaveTimerRef = useRef<number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        vendor_id: "",
        bill_date: new Date().toISOString().split('T')[0],
        bill_number: "",
        discount: 0,
        notes: ""
    });

    const [items, setItems] = useState<BillItem[]>([
        {
            product_id: undefined,
            quantity: 1,
            purchase_price: 0,
            gst_percent: 18,
            gst_amount: 0,
            total: 0,
            priceSource: undefined,
            unit_id: undefined,
            unit: null
        }
    ]);

    // Persist draft to localStorage (debounced)
    const saveDraftToStorage = useCallback(() => {
        try {
            const payload = { formData, items, savedAt: Date.now() };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        } catch (err) {
            console.warn('Failed to save draft:', err);
        }
    }, [formData, items]);

    const scheduleSaveDraft = useCallback(() => {
        if (draftSaveTimerRef.current) {
            window.clearTimeout(draftSaveTimerRef.current);
        }
        draftSaveTimerRef.current = window.setTimeout(() => {
            saveDraftToStorage();
        }, 500);
    }, [saveDraftToStorage]);

    // Load draft on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.formData && parsed.items) {
                    setFormData(prev => ({ ...prev, ...parsed.formData }));
                    // Restore items with their price sources from draft
                    // If priceSource exists in draft, use it; otherwise infer from context
                    const draftItems = parsed.items.map((item: BillItem) => ({
                        ...item,
                        // Preserve existing priceSource if present, otherwise mark as manual if price was set
                        priceSource: item.priceSource || (item.purchase_price > 0 ? 'manual' : undefined)
                    }));
                    setItems(draftItems);
                    toast.success('Restored unsaved draft');
                }
            }
        } catch (err) {
            console.warn('Failed to load draft:', err);
        }

        return () => {
            if (draftSaveTimerRef.current) window.clearTimeout(draftSaveTimerRef.current);
        };
    }, [navigate]);

    // Whenever form data or items change, schedule saving draft
    useEffect(() => {
        scheduleSaveDraft();
    }, [formData, items, scheduleSaveDraft]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch vendors - handle pagination
                const vendorsResponse: any = await purchaseApi.vendors.list();
                // Extract results from paginated response or use array directly
                const vendorsData = Array.isArray(vendorsResponse) ? vendorsResponse : (vendorsResponse?.results || []);
                setVendors(vendorsData);

                // Fetch initial products (limit to 50 for speed)
                // We'll rely on search for finding older products
                const productsResponse = await shopProductsApi.list({ ordering: '-id', limit: 50 });
                setProducts(Array.isArray(productsResponse) ? productsResponse : []);

                // Fetch units from inventory API
                try {
                    const unitsResponse: any = await inventoryApiFunctions.units.list();
                    if (Array.isArray(unitsResponse)) {
                        setUnits(unitsResponse);
                        console.log(`✅ Loaded ${unitsResponse.length} units from inventory API`);
                    } else if (unitsResponse?.results) {
                        // Handle paginated response
                        setUnits(unitsResponse.results);
                        console.log(`✅ Loaded ${unitsResponse.results.length} units from inventory API (paginated)`);
                    } else {
                        console.warn('⚠️ Unexpected units response format:', unitsResponse);
                        setUnits([]);
                    }
                } catch (unitsError) {
                    console.error('❌ Failed to fetch units from inventory API:', unitsError);
                    toast.error('Failed to load units. Please check inventory API connection.');
                    setUnits([]); // Set empty array so dropdown still works
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Server-side search handler
    const handleProductSearch = useCallback(async (query: string) => {
        if (!query || query.length < 2) return;

        try {
            console.log('🔍 Searching products:', query);
            const response = await shopProductsApi.searchTypesense(query, { limit: 20 });

            if (response && response.data && Array.isArray(response.data)) {
                const newProducts = response.data as ShopProduct[];

                setProducts(prevProducts => {
                    // Create a map of existing products by ID for fast lookup
                    const existingIds = new Set(prevProducts.map(p => p.product_id));

                    // Filter out duplicates
                    const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.product_id));

                    if (uniqueNewProducts.length === 0) return prevProducts;

                    console.log(`✅ Added ${uniqueNewProducts.length} products from search`);
                    return [...prevProducts, ...uniqueNewProducts];
                });
            }
        } catch (error) {
            console.error('❌ Product search failed:', error);
        }
    }, []);

    const calculateItemTotal = (item: BillItem) => {
        const subtotal = item.quantity * item.purchase_price;
        const gstAmount = (subtotal * item.gst_percent) / 100;
        return subtotal + gstAmount;
    };

    // Centralized price resolution logic
    const resolvePrice = (item: BillItem, source: PriceSource, price: number) => {
        item.purchase_price = price;
        item.priceSource = source;
        // Recalculate totals
        const subtotal = item.quantity * item.purchase_price;
        item.gst_amount = (subtotal * item.gst_percent) / 100;
        item.total = subtotal + item.gst_amount;
    };

    // Function to fetch vendor price for a product
    const fetchVendorPrice = async (vendorId: string, productId: string, index: number, itemsArray: BillItem[], skipIfManual: boolean = true) => {
        // Skip fetching if price was manually entered by user
        if (skipIfManual && itemsArray[index].priceSource === 'manual') {
            return;
        }

        try {
            const response = await purchaseApi.vendorProductPrices.getPrice(parseInt(vendorId), productId);
            if (response.purchase_price) {
                resolvePrice(itemsArray[index], 'vendor', parseFloat(response.purchase_price));
            } else {
                // No vendor price found, use product's default
                const selectedProduct = products.find(p => p.product_id === productId);
                if (selectedProduct) {
                    const defaultPrice = (selectedProduct as any).purchase_price || selectedProduct.price;
                    resolvePrice(itemsArray[index], 'product-default', defaultPrice);
                }
            }
        } catch (error) {
            console.error('Failed to fetch vendor price:', error);
            // Fallback to product default price
            const selectedProduct = products.find(p => p.product_id === productId);
            if (selectedProduct) {
                const defaultPrice = (selectedProduct as any).purchase_price || selectedProduct.price;
                resolvePrice(itemsArray[index], 'product-default', defaultPrice);
            }
        }
    };

    const updateItem = async (index: number, field: keyof BillItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // If product is selected, update the product object and set default purchase price and GST%
        if (field === 'product_id') {
            const selectedProduct = products.find(p => p.product_id === value);
            if (selectedProduct) {
                newItems[index].product = selectedProduct;
                // Auto-detect GST% from product's taxes field, default to 18% if not available
                newItems[index].gst_percent = selectedProduct.taxes ?? 18;

                // Set unit from product if available
                const productUnit = (selectedProduct as any).unit;
                if (productUnit) {
                    newItems[index].unit = productUnit;
                    newItems[index].unit_id = productUnit.id;
                } else {
                    newItems[index].unit = null;
                    newItems[index].unit_id = undefined;
                }

                // Only auto-fetch price if it wasn't manually entered (new product selection)
                if (newItems[index].priceSource !== 'manual') {
                    // Fetch vendor price if vendor is already selected
                    if (formData.vendor_id) {
                        await fetchVendorPrice(formData.vendor_id, value, index, newItems, false);
                    } else {
                        // Use purchase_price if available, otherwise use price as fallback
                        const defaultPrice = (selectedProduct as any).purchase_price || selectedProduct.price;
                        resolvePrice(newItems[index], 'product-default', defaultPrice);
                    }
                }
            }
        }

        // If unit is changed
        if (field === 'unit_id') {
            const selectedUnit = units.find(u => u.id === value);
            if (selectedUnit) {
                newItems[index].unit = {
                    id: selectedUnit.id,
                    name: selectedUnit.name,
                    code: selectedUnit.code,
                    is_decimal: selectedUnit.is_decimal
                };
            } else {
                newItems[index].unit = null;
            }
        }

        // If purchase_price is manually changed, mark it as manually entered
        if (field === 'purchase_price') {
            newItems[index].priceSource = 'manual';
        }

        // Recalculate totals
        if (field === 'quantity' || field === 'purchase_price' || field === 'gst_percent' || field === 'product_id') {
            const subtotal = newItems[index].quantity * newItems[index].purchase_price;
            newItems[index].gst_amount = (subtotal * newItems[index].gst_percent) / 100;
            newItems[index].total = subtotal + newItems[index].gst_amount;
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, {
            product_id: undefined,
            quantity: 1,
            purchase_price: 0,
            gst_percent: 18,
            gst_amount: 0,
            total: 0,
            priceSource: undefined,
            unit_id: undefined,
            unit: null
        }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0);
        const totalGst = items.reduce((sum, item) => sum + item.gst_amount, 0);
        const totalBeforeDiscount = subtotal + totalGst;
        const finalTotal = totalBeforeDiscount - formData.discount;

        return {
            subtotal,
            totalGst,
            totalBeforeDiscount,
            finalTotal
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.vendor_id) {
            toast.error('Please select a vendor');
            return;
        }

        if (items.some(item => !item.product_id || item.quantity <= 0 || item.purchase_price <= 0)) {
            toast.error('Please select a product and fill in all item details correctly');
            return;
        }

        try {
            setSaving(true);

            const billData = {
                vendor_id: parseInt(formData.vendor_id),
                bill_date: formData.bill_date,
                bill_number: formData.bill_number || undefined,
                discount: formData.discount,
                notes: formData.notes,
                items: items.map(item => ({
                    quantity: item.quantity,
                    purchase_price: item.purchase_price,
                    gst_percent: item.gst_percent,
                    product_id: item.product_id,
                    unit_id: item.unit_id || undefined
                }))
            };

            const response = await purchaseApi.bills.create(billData);
            toast.success('Bill created successfully!');
            try { localStorage.removeItem(DRAFT_KEY); } catch (e) { }
            navigate(`/purchase/bills/${response.id}`);
        } catch (error) {
            console.error('Failed to create bill:', error);
            toast.error('Failed to create bill');
        } finally {
            setSaving(false);
        }
    };

    const handleProductCreated = (newProduct: any) => {
        // Convert the new product to match our ShopProduct interface
        const convertedProduct: ShopProduct = {
            product_id: newProduct.product_id,
            title: newProduct.title,
            price: newProduct.price,
            taxes: newProduct.taxes,
            discount_amount: newProduct.discount_amount,
            is_active: newProduct.is_active,
            stock: newProduct.stock,
            hsn_code: newProduct.hsn_code,
            barcode: newProduct.barcode,
            image: newProduct.image,
            category: newProduct.category,
            brand: newProduct.brand,
            tags: newProduct.tags,
            product_variant: newProduct.product_variant
        } as ShopProduct;
        setProducts(prev => {
            const next = [convertedProduct, ...prev];
            return next;
        });
        setShowNewProductForm(false);
    };

    const totals = calculateTotals();

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/purchase/bills')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Bills
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create New Bill</h1>
                        <p className="text-red-600 mt-1">Add a new purchase bill</p>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                        try { localStorage.removeItem(DRAFT_KEY); } catch (e) { }
                        setFormData({
                            vendor_id: "",
                            bill_date: new Date().toISOString().split('T')[0],
                            bill_number: "",
                            discount: 0,
                            notes: ""
                        });
                        setItems([{
                            product_id: undefined,
                            quantity: 1,
                            purchase_price: 0,
                            gst_percent: 18,
                            gst_amount: 0,
                            total: 0,
                            priceSource: undefined,
                            unit_id: undefined,
                            unit: null
                        }]);
                        toast.success('Draft cleared successfully');
                    }}
                >
                    <Trash className="h-4 w-4 mr-2" />
                    Clear Draft
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Bill Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bill Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vendor">Vendor *</Label>
                                <Select
                                    value={formData.vendor_id}
                                    onValueChange={async (value) => {
                                        setFormData({ ...formData, vendor_id: value });
                                        // Fetch vendor prices for all selected products when vendor changes
                                        // But only if prices weren't manually entered
                                        if (value) {
                                            const updatedItems = [...items];
                                            const fetchPromises = items.map((item, idx) => {
                                                if (item.product_id && item.priceSource !== 'manual') {
                                                    return fetchVendorPrice(value, item.product_id, idx, updatedItems, false);
                                                }
                                                return Promise.resolve();
                                            });
                                            await Promise.all(fetchPromises);
                                            setItems(updatedItems);
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors.map((vendor) => (
                                            <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                                {vendor.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bill_date">Bill Date *</Label>
                                <Input
                                    id="bill_date"
                                    type="date"
                                    value={formData.bill_date}
                                    onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bill_number">Bill Number</Label>
                                <Input
                                    id="bill_number"
                                    value={formData.bill_number}
                                    onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                                    placeholder="Auto-generated if empty"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="discount">Discount (₹)</Label>
                                <Input
                                    id="discount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.discount}
                                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Additional notes..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Bill Items */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Bill Items</CardTitle>
                            <Button type="button" onClick={() => setShowNewProductForm(true)} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Product
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product *</TableHead>
                                        <TableHead>Quantity *</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Unit Price *</TableHead>
                                        <TableHead>GST %</TableHead>
                                        <TableHead>GST Amount</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <SearchableSelect
                                                    options={convertProductsToOptions(products)}
                                                    value={item.product_id || ""}
                                                    onValueChange={(value) => updateItem(index, 'product_id', value)}
                                                    placeholder="Select a product"
                                                    emptyMessage="No products available"
                                                    searchPlaceholder="Search products..."
                                                    allowClear={false}
                                                    onSearch={handleProductSearch}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => {
                                                            const newQuantity = Math.max(1, item.quantity - 1);
                                                            updateItem(index, 'quantity', newQuantity);
                                                        }}
                                                    >
                                                        -
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="w-20 text-center"
                                                        required
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => {
                                                            updateItem(index, 'quantity', item.quantity + 1);
                                                        }}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={item.unit_id?.toString() || "none"}
                                                    onValueChange={(value) => {
                                                        if (value === "none") {
                                                            updateItem(index, 'unit_id', undefined);
                                                        } else {
                                                            updateItem(index, 'unit_id', parseInt(value));
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder={item.unit ? item.unit.code : "N/A"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">N/A</SelectItem>
                                                        {units.map((unit) => (
                                                            <SelectItem key={unit.id} value={unit.id.toString()}>
                                                                {unit.code} ({unit.name})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.purchase_price}
                                                    onChange={(e) => updateItem(index, 'purchase_price', parseFloat(e.target.value) || 0)}
                                                    required
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={item.gst_percent.toString()}
                                                    onValueChange={(value) => updateItem(index, 'gst_percent', parseFloat(value))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select GST%" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">0%</SelectItem>
                                                        <SelectItem value="5">5%</SelectItem>
                                                        <SelectItem value="12">12%</SelectItem>
                                                        <SelectItem value="18">18%</SelectItem>
                                                        <SelectItem value="28">28%</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">
                                                    ₹{item.gst_amount.toFixed(2)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">
                                                    ₹{item.total.toFixed(2)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 flex justify-start">
                            <div className="w-full max-w-sm">
                                <Button type="button" onClick={addItem} variant="outline" size="sm" className="w-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Item
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bill Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Bill Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-right">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>GST Total:</span>
                                <span>₹{totals.totalGst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total Before Discount:</span>
                                <span>₹{totals.totalBeforeDiscount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Discount:</span>
                                <span className="text-green-600">-₹{formData.discount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Final Total:</span>
                                <span>₹{totals.finalTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4 justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { }; navigate('/purchase/bills'); }}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Create Bill
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* New Product Form */}
            <AddProductForm
                isOpen={showNewProductForm}
                onClose={() => setShowNewProductForm(false)}
                onProductCreated={handleProductCreated}
            />
        </div>
    );
}
