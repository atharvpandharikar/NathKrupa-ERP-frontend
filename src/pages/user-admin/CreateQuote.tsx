import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
// Shadcn UI Components
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
// Config
import { shopApi } from '@/lib/api';
// Constants
import { INDIAN_STATES } from '@/constants/states';
// Types
import { InvoiceData } from '@/types/quote';
import { formatCurrency } from '@/utils/formatters';
import {
    ProductVariant,
    Product,
    QuoteItem,
    BillTo,
    Other,
} from '@/types/quote';
// Icons
import {
    PlusCircle,
    Trash2,
    ChevronsUpDown,
    User,
    Package,
    Calculator,
    Calendar,
} from 'lucide-react';
// Custom Components
import { CustomerSelector } from '@/components/CustomerSelector';
import { CustomProductInput } from '@/components/CustomProductInput';

// Constants
const TAX_OPTIONS = [12, 18, 28] as const;
type TaxOption = (typeof TAX_OPTIONS)[number];
const DEFAULT_TAX: TaxOption = 12;

// Utility functions
const calculateItemValues = (item: Partial<QuoteItem>): Partial<QuoteItem> => {
    const quantity = Number(item.quantity) || 0;
    const listPrice = Number(item.listPrice) || 0;
    const taxPercentage = Number(item.taxPercentage) || DEFAULT_TAX;

    const amount = quantity * listPrice;
    const taxAmount = Math.round(amount * (taxPercentage / 100) * 100) / 100;
    const total = amount + taxAmount;

    return {
        ...item,
        amount,
        taxAmount,
        total,
    };
};

const createEmptyItem = (id: number): QuoteItem => ({
    id,
    productName: '',
    quantity: 1,
    listPrice: 0,
    amount: 0,
    taxPercentage: DEFAULT_TAX,
    taxAmount: 0,
    total: 0,
});

const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// Custom hooks
const useProductSearch = () => {
    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const searchProducts = async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await shopApi.get<{ error: boolean; data: Product[] }>(
                `/shop-product-list/?search=${encodeURIComponent(query)}`
            );

            if (response.error === true) {
                throw new Error('Failed to fetch products');
            }

            setResults(response.data || []);
        } catch {
            setError('Failed to fetch products');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return { results, loading, error, searchProducts };
};

// Components
const ProductSelector: React.FC<{
    item: QuoteItem;
    onProductSelect: (product: Product, variant?: ProductVariant) => void;
}> = ({ item, onProductSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { results, loading, error, searchProducts } = useProductSearch();

    useEffect(() => {
        if (isOpen) {
            searchProducts(searchQuery);
        }
    }, [searchQuery, isOpen]);

    const handleProductSelect = (product: Product, variant?: ProductVariant) => {
        onProductSelect(product, variant);
        setIsOpen(false);
        setSearchQuery('');
    };

    const renderProductItem = (product: Product) => {
        if (product.product_variant && product.product_variant.length > 0) {
            return product.product_variant.map(variant => (
                <CommandItem
                    key={variant.variant_id}
                    value={variant.title}
                    onSelect={() => handleProductSelect(product, variant)}
                    className="flex flex-col items-start gap-1 p-3"
                >
                    <span className="text-sm font-medium">{product.title}</span>
                    <span className="text-muted-foreground text-xs">
                        {variant.variant_label} - ₹{variant.price.toLocaleString()}
                    </span>
                </CommandItem>
            ));
        }

        return (
            <CommandItem
                key={product.product_id}
                value={product.title}
                onSelect={() => handleProductSelect(product)}
                className="flex flex-col items-start gap-1 p-3"
            >
                <span className="text-sm font-medium">{product.title}</span>
                <span className="text-muted-foreground text-xs">
                    ₹{product.price.toLocaleString()}
                </span>
            </CommandItem>
        );
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="w-full max-w-[250px] justify-between text-left font-normal"
                >
                    <span className="truncate">
                        {item.productName || 'Search & select product...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Search products..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        {loading && (
                            <div className="text-muted-foreground p-4 text-center text-sm">
                                <div className="flex items-center justify-center gap-2">
                                    Loading products...
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="text-destructive p-4 text-center text-sm">
                                {error}
                            </div>
                        )}
                        {!loading && !error && searchQuery && (
                            <CommandItem
                                onSelect={() => {
                                    // Set custom product name
                                    const customProduct = { productName: searchQuery } as Partial<QuoteItem>;
                                    onProductSelect(customProduct as any, undefined);
                                    setIsOpen(false);
                                    setSearchQuery('');
                                }}
                                className="flex items-center gap-2 p-3 text-primary"
                            >
                                <Package className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                    Use "{searchQuery}" as custom product
                                </span>
                            </CommandItem>
                        )}
                        {!loading && !error && results.length === 0 && searchQuery && (
                            <CommandEmpty>No products found.</CommandEmpty>
                        )}
                        {!loading && !error && results.length > 0 && (
                            <CommandGroup>{results.map(renderProductItem)}</CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const TaxSelector: React.FC<{
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
    // Use TaxOption type for validation
    const validTax: TaxOption = TAX_OPTIONS.includes(value as TaxOption)
        ? (value as TaxOption)
        : DEFAULT_TAX;

    return (
        <Select
            value={String(validTax)}
            onValueChange={val => onChange(Number(val))}
            disabled={disabled}
        >
            <SelectTrigger className="w-20">
                <SelectValue>{validTax}%</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {TAX_OPTIONS.map(tax => (
                    <SelectItem key={tax} value={String(tax)}>
                        {tax}%
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

// Main component
export function CreateQuote() {
    const [items, setItems] = useState<QuoteItem[]>([createEmptyItem(1)]);
    const [billTo, setBillTo] = useState<BillTo>({
        org_name: '',
        name: '',
        contact_no: '',
        email: '',
        billing_address_1: '',
        billing_address_2: '',
        pin_code: '',
        city: '',
        state: '',
        date: formatDate(new Date()),
        gst_no: '',
    });
    const [other, setOther] = useState<Other>({
        discount: '0',
        shipping_charges: '0',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchParams] = useSearchParams();
    const quotation_no = searchParams.get('quotation_no') || undefined;

    // Prefill form if quotationData is present or load draft
    useEffect(() => {
        const quotation_json = searchParams.get('quotation_json');
        const load_draft = searchParams.get('load_draft');

        if (quotation_json) {
            try {
                fetch(quotation_json)
                    .then(response => response.json())
                    .then((quotationData: InvoiceData) => {
                        // Bill To
                        const bill = quotationData.bill_to?.[0] || {};
                        setBillTo({
                            org_name: bill.org_name || '',
                            name: bill.name || '',
                            contact_no: bill.contact_no || '',
                            email: bill.email || '',
                            billing_address_1: bill.billing_address_1 || '',
                            billing_address_2: bill.billing_address_2 || '',
                            pin_code: bill.pin_code || '',
                            city: bill.city || '',
                            state: bill.state || '',
                            date: bill.date || formatDate(new Date()),
                            gst_no: bill.gst_no || '',
                        });

                        // Products
                        if (
                            Array.isArray(quotationData.products) &&
                            quotationData.products.length > 0
                        ) {
                            setItems(
                                quotationData.products.map((prod, idx) => {
                                    const quantity = Number(prod.quantity) || 1;
                                    const listPrice = Number(prod.price) || 0;
                                    const taxPercentage = Number(prod.tax) || DEFAULT_TAX;
                                    const base: Partial<QuoteItem> = {
                                        id: idx + 1,
                                        productName: prod.title || '',
                                        quantity,
                                        listPrice,
                                        taxPercentage,
                                        product_id: prod.product_id,
                                        // variant_id and selectedVariant cannot be inferred from this data
                                    };
                                    return {
                                        ...createEmptyItem(idx + 1),
                                        ...calculateItemValues(base),
                                        ...base,
                                    } as QuoteItem;
                                }),
                            );
                        }

                        // Other
                        const otherData = quotationData.other?.[0] || {};
                        setOther({
                            discount: otherData.discount || '0',
                            shipping_charges: otherData.shipping_charges || '0',
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching JSON data:', error);
                    });
            } catch (error) {
                console.error('Error parsing quotation data:', error);
            }
        } else if (load_draft === 'true') {
            // Only load draft when explicitly requested
            const savedDraft = localStorage.getItem('quotation_draft');
            if (savedDraft) {
                try {
                    const draftData = JSON.parse(savedDraft);
                    if (draftData.is_draft) {
                        // Load draft data
                        const bill = draftData.bill_to?.[0] || {};
                        setBillTo({
                            org_name: bill.org_name || '',
                            name: bill.name || '',
                            contact_no: bill.contact_no || '',
                            email: bill.email || '',
                            billing_address_1: bill.billing_address_1 || '',
                            billing_address_2: bill.billing_address_2 || '',
                            pin_code: bill.pin_code || '',
                            city: bill.city || '',
                            state: bill.state || '',
                            date: bill.date || formatDate(new Date()),
                            gst_no: bill.gst_no || '',
                        });

                        // Load products from draft
                        if (Array.isArray(draftData.products) && draftData.products.length > 0) {
                            setItems(
                                draftData.products.map((prod: any, idx: number) => {
                                    const quantity = Number(prod.quantity) || 1;
                                    const listPrice = Number(prod.price) || 0;
                                    const taxPercentage = Number(prod.tax) || DEFAULT_TAX;
                                    const base: Partial<QuoteItem> = {
                                        id: idx + 1,
                                        productName: prod.title || '',
                                        quantity,
                                        listPrice,
                                        taxPercentage,
                                        product_id: prod.product_id,
                                    };
                                    return {
                                        ...createEmptyItem(idx + 1),
                                        ...calculateItemValues(base),
                                        ...base,
                                    } as QuoteItem;
                                }),
                            );
                        }

                        // Load other data from draft
                        const otherData = draftData.other?.[0] || {};
                        setOther({
                            discount: otherData.discount || '0',
                            shipping_charges: otherData.shipping_charges || '0',
                        });

                        toast.success('Draft loaded successfully!');
                    }
                } catch (error) {
                    console.error('Error loading draft:', error);
                }
            } else {
                toast.info('No draft found to load');
            }
        }
        // If neither quotation_json nor load_draft=true, start with fresh form (default behavior)
    }, [searchParams]);

    const updateItem = (id: number, updates: Partial<QuoteItem>) => {
        setItems(prevItems =>
            prevItems.map(item => {
                if (item.id === id) {
                    const updatedItem = { ...item, ...updates };
                    if (
                        'quantity' in updates ||
                        'listPrice' in updates ||
                        'taxPercentage' in updates
                    ) {
                        return {
                            ...updatedItem,
                            ...calculateItemValues(updatedItem),
                        } as QuoteItem;
                    }
                    return updatedItem;
                }
                return item;
            }),
        );
    };

    const handleProductSelect = (
        itemId: number,
        product: Product,
        variant?: ProductVariant,
    ) => {
        const selectedVariant =
            variant || (product.product_variant?.[0] ?? undefined);
        const price = selectedVariant?.price ?? product.price;
        const taxPercentage: TaxOption = TAX_OPTIONS.includes(
            product.taxes as TaxOption,
        )
            ? (product.taxes as TaxOption)
            : DEFAULT_TAX;

        const updates: Partial<QuoteItem> = {
            productName: selectedVariant ? selectedVariant.title : product.title,
            product_id: product.product_id,
            variant_id: selectedVariant?.variant_id,
            selectedVariant,
            listPrice: price,
            quantity: 1,
            taxPercentage,
        };

        updateItem(itemId, updates);
    };

    const addRow = () => {
        const newId = Math.max(...items.map(item => item.id), 0) + 1;
        setItems(prev => [...prev, createEmptyItem(newId)]);
    };

    const removeRow = (id: number) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const updateBillTo = (field: keyof BillTo, value: string) => {
        setBillTo(prev => ({ ...prev, [field]: value }));
    };

    const updateOther = (field: keyof Other, value: string) => {
        setOther(prev => ({ ...prev, [field]: value }));
    };

    const getPayload = () => {
        // Include both catalog products and custom products
        const validItems = items.filter(
            item => item.quantity > 0 && item.listPrice > 0 && item.productName.trim(),
        );

        return {
            bill_to: [
                {
                    org_name: billTo.org_name || '',
                    name: billTo.name,
                    contact_no: billTo.contact_no,
                    email: billTo.email,
                    billing_address_1: billTo.billing_address_1,
                    billing_address_2: billTo.billing_address_2,
                    pin_code: billTo.pin_code,
                    city: billTo.city || '',
                    state: billTo.state,
                    date: billTo.date,
                    gst_no: billTo.gst_no || '',
                },
            ],
            products: validItems.map(item => ({
                title: item.productName,
                product_id: item.product_id ? String(item.product_id) : '', // Can be empty for custom products
                tax: String(item.taxPercentage),
                quantity: String(item.quantity),
                price: String(item.listPrice),
                hsn_code: item.hsnCode || '', // Include HSN code if provided
            })),
            other: [
                {
                    discount: String(other.discount),
                    shipping_charges: String(other.shipping_charges || '0'),
                },
            ],
        };
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;

        const payloadBase = getPayload();
        if (payloadBase.products.length === 0) {
            toast.error('Add at least one product to generate a quotation');
            return;
        }
        if (!billTo.contact_no.trim()) {
            toast.error('Contact number is required');
            return;
        }

        const payload = {
            ...payloadBase,
            return_type: 'json',
        };
        try {
            setIsSubmitting(true);
            console.log('Payload to backend:', payload);
            // Build the URL for generating or updating a quotation
            const baseUrl = '/shop/generate-quotation-shop/';
            console.log('Quote Number', quotation_no);
            const url =
                quotation_no && quotation_no.trim()
                    ? `${baseUrl}?quotation_no=${encodeURIComponent(quotation_no)}`
                    : baseUrl;
            console.log('Request URL:', url);
            const response = await shopApi.post<{ error?: boolean; data?: { quotation_pdf?: string } }>(url, payload);
            if (response.error === true) {
                throw new Error(
                    typeof response.data === 'string'
                        ? response.data
                        : 'Failed to create quotation'
                );
            }

            const data = response?.data;
            if (data?.quotation_pdf) {
                window.open(data.quotation_pdf, '_blank');
            }

            toast.success('Quote created successfully!');
            localStorage.removeItem('quotation_draft');
            window.location.href = '/user-admin/quotations';
        } catch (error) {
            console.error('Error creating quote:', error);
            let message = 'Unknown error';
            if (error instanceof Error && error.message) {
                try {
                    const parsed = JSON.parse(error.message);
                    message =
                        parsed?.data || parsed?.detail || parsed?.message || error.message;
                } catch {
                    message = error.message;
                }
            }
            toast.error(`Failed to create quote: ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveDraft = async () => {
        const payload = getPayload();
        try {
            console.log('Saving draft:', payload);
            // For now, we'll save the draft data to localStorage
            // In a real implementation, you might want to send this to a draft endpoint
            const draftData = {
                ...payload,
                saved_at: new Date().toISOString(),
                is_draft: true,
            };

            localStorage.setItem('quotation_draft', JSON.stringify(draftData));
            toast.success('Draft saved successfully!');
        } catch (error) {
            console.error('Error saving draft:', error);
            toast.error('Failed to save draft');
        }
    };

    const totals = items.reduce(
        (acc, item) => ({
            amount: acc.amount + item.amount,
            taxAmount: acc.taxAmount + item.taxAmount,
            total: acc.total + item.total,
        }),
        { amount: 0, taxAmount: 0, total: 0 },
    );

    return (
        <div className="mx-auto mt-24 max-w-[95%] space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
                {/* Bill To Section */}
                <div className="lg:col-span-2">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="text-primary h-5 w-5" />
                                Bill To Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Customer Selector Component */}
                            <CustomerSelector
                                billTo={billTo}
                                onCustomerSelect={(customerData) => {
                                    setBillTo(prev => ({ ...prev, ...customerData }));
                                }}
                            />

                            {/* Date Field */}
                            <Separator />
                            <div className="space-y-2">
                                <Label
                                    htmlFor="date"
                                    className="flex items-center gap-2 text-sm font-medium"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Quote Date *
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={billTo.date}
                                    onChange={event_ =>
                                        updateBillTo('date', event_.target.value)
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Other Section */}
                    <Card className="mt-4 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calculator className="text-primary h-5 w-5" />
                                Additional Options
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="discount" className="text-sm font-medium">
                                        Discount (₹)
                                    </Label>
                                    <Input
                                        id="discount"
                                        type="number"
                                        placeholder="Enter discount amount"
                                        value={other.discount}
                                        onChange={event_ =>
                                            updateOther('discount', event_.target.value)
                                        }
                                        min="0"
                                    />
                                </div>
                                {/* Shipping Charges */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="shipping_charges"
                                        className="text-sm font-medium"
                                    >
                                        Shipping Charges (₹)
                                    </Label>
                                    <Input
                                        id="shipping_charges"
                                        type="number"
                                        placeholder="Enter shipping charges"
                                        value={other.shipping_charges}
                                        onChange={event_ =>
                                            updateOther('shipping_charges', event_.target.value)
                                        }
                                        min="0"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Products Section */}
                <div className="lg:col-span-4">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Package className="text-primary h-5 w-5" />
                                Create Quote
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-12 text-center">#</TableHead>
                                            <TableHead className="min-w-[250px]">
                                                Product Name
                                            </TableHead>
                                            <TableHead className="w-28 text-center">HSN Code</TableHead>
                                            <TableHead className="w-[100px] text-center">
                                                Qty
                                            </TableHead>
                                            <TableHead className="w-28 text-right">
                                                Price (₹)
                                            </TableHead>
                                            <TableHead className="w-28 text-right">
                                                Amount (₹)
                                            </TableHead>
                                            <TableHead className="w-20 text-center">Tax %</TableHead>
                                            <TableHead className="w-28 text-right">Tax (₹)</TableHead>
                                            <TableHead className="w-28 text-right">
                                                Total (₹)
                                            </TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-muted/20">
                                                <TableCell className="text-muted-foreground text-center font-medium">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <ProductSelector
                                                        item={item}
                                                        onProductSelect={(product, variant) =>
                                                            handleProductSelect(item.id, product, variant)
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Input
                                                        placeholder="HSN Code"
                                                        value={item.hsnCode || ''}
                                                        onChange={e =>
                                                            updateItem(item.id, {
                                                                hsnCode: e.target.value,
                                                            })
                                                        }
                                                        className="w-[80px] text-center"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Input
                                                        value={item.quantity}
                                                        onChange={e =>
                                                            updateItem(item.id, {
                                                                quantity: Math.max(
                                                                    1,
                                                                    parseInt(e.target.value) || 1,
                                                                ),
                                                            })
                                                        }
                                                        className="w-[50px] text-center"
                                                        min="1"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Input
                                                        value={item.listPrice}
                                                        onChange={e =>
                                                            updateItem(item.id, {
                                                                listPrice: Math.max(
                                                                    0,
                                                                    parseFloat(e.target.value) || 0,
                                                                ),
                                                            })
                                                        }
                                                        className="w-[70px]"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4 text-right font-medium">
                                                    {formatCurrency(item.amount)}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <TaxSelector
                                                        value={item.taxPercentage}
                                                        onChange={value =>
                                                            updateItem(item.id, { taxPercentage: value })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="py-4 text-right font-medium">
                                                    ₹
                                                    {item.taxAmount.toLocaleString('en-IN', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </TableCell>
                                                <TableCell className="py-4 text-right font-semibold">
                                                    ₹
                                                    {item.total.toLocaleString('en-IN', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeRow(item.id)}
                                                        disabled={items.length === 1}
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-destructive/10 cursor-pointer"
                                                    >
                                                        <Trash2 size={16} className="text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addRow}
                                        className="flex items-center gap-2"
                                    >
                                        <PlusCircle size={16} />
                                        Add Product
                                    </Button>
                                    <CustomProductInput
                                        onAddProduct={(product) => {
                                            const newId = Math.max(...items.map(item => item.id), 0) + 1;
                                            const newItem = {
                                                ...createEmptyItem(newId),
                                                ...product,
                                            } as QuoteItem;
                                            setItems(prev => [...prev, newItem]);
                                        }}
                                    />
                                </div>
                            </div>

                            <Separator className="my-6" />

                            {/* Summary */}
                            <div className="bg-secondary/40 rounded-lg p-4">
                                <h3 className="mb-4 w-full text-lg font-semibold">
                                    Quote Summary
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span className="font-medium">
                                            {formatCurrency(totals.amount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Tax:</span>
                                        <span className="font-medium">
                                            {formatCurrency(totals.taxAmount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Before Discount:</span>
                                        <span className="font-medium">
                                            {formatCurrency(totals.total)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping Charges:</span>
                                        <span className="font-medium">
                                            {formatCurrency(Number(other.shipping_charges) || 0)}
                                        </span>
                                    </div>
                                    {Number(other.discount) > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Discount:</span>
                                            <span className="font-medium">
                                                - {formatCurrency(Number(other.discount))}
                                            </span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="text-primary flex justify-between text-lg font-bold">
                                        <span>Final Total:</span>
                                        <span>
                                            ₹
                                            {(
                                                totals.total +
                                                (Number(other.shipping_charges) || 0) -
                                                (Number(other.discount) || 0)
                                            ).toLocaleString('en-IN', {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handleSaveDraft}
                                >
                                    Save as Draft
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    size="lg"
                                    disabled={
                                        isSubmitting ||
                                        items.every(item => !item.productName) ||
                                        !billTo.name ||
                                        !billTo.contact_no
                                    }
                                    className="min-w-[140px]"
                                >
                                    Generate Quote
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default CreateQuote;
