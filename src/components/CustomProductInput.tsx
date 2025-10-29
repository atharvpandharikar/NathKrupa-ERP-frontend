import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { QuoteItem } from '@/types/quote';

interface CustomProductInputProps {
    onAddProduct: (product: Partial<QuoteItem>) => void;
}

const TAX_OPTIONS = [12, 18, 28] as const;

export const CustomProductInput: React.FC<CustomProductInputProps> = ({
    onAddProduct,
}) => {
    const [open, setOpen] = useState(false);
    const [productName, setProductName] = useState('');
    const [hsnCode, setHsnCode] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [price, setPrice] = useState('0');
    const [tax, setTax] = useState('12');

    const handleAddProduct = () => {
        if (!productName.trim()) {
            toast.error('Product name is required');
            return;
        }

        if (!quantity || Number(quantity) <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        if (!price || Number(price) < 0) {
            toast.error('Price cannot be negative');
            return;
        }

        const qty = Number(quantity);
        const listPrice = Number(price);
        const taxPercentage = Number(tax);

        // Calculate values
        const amount = qty * listPrice;
        const taxAmount = Math.round(amount * (taxPercentage / 100) * 100) / 100;
        const total = amount + taxAmount;

        onAddProduct({
            productName: productName.trim(),
            hsnCode: hsnCode.trim() || undefined,
            quantity: qty,
            listPrice: listPrice,
            taxPercentage: taxPercentage,
            amount,
            taxAmount,
            total,
            // Mark as custom product (no product_id)
            product_id: undefined,
        });

        // Reset form
        setProductName('');
        setHsnCode('');
        setQuantity('1');
        setPrice('0');
        setTax('12');
        setOpen(false);

        toast.success('Custom product added successfully!');
    };

    const calculatePreview = () => {
        const qty = Number(quantity) || 0;
        const listPrice = Number(price) || 0;
        const taxPercentage = Number(tax) || 12;
        const amount = qty * listPrice;
        const taxAmount = Math.round(amount * (taxPercentage / 100) * 100) / 100;
        const total = amount + taxAmount;

        return { amount, taxAmount, total };
    };

    const preview = calculatePreview();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 ml-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Custom Product
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Add Custom Product
                    </DialogTitle>
                    <DialogDescription>
                        Enter custom product details that are not in the catalog
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Product Name */}
                    <div className="space-y-2">
                        <Label htmlFor="product_name" className="text-sm font-medium">
                            Product Name *
                        </Label>
                        <Input
                            id="product_name"
                            placeholder="e.g., Custom Part, Service Item"
                            value={productName}
                            onChange={e => setProductName(e.target.value)}
                        />
                    </div>

                    {/* HSN Code */}
                    <div className="space-y-2">
                        <Label htmlFor="hsn_code" className="text-sm font-medium">
                            HSN Code (Optional)
                        </Label>
                        <Input
                            id="hsn_code"
                            placeholder="e.g., 87089000"
                            value={hsnCode}
                            onChange={e => setHsnCode(e.target.value)}
                        />
                    </div>

                    {/* Quantity and Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity" className="text-sm font-medium">
                                Quantity *
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                placeholder="1"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                min="1"
                                step="1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price" className="text-sm font-medium">
                                Price (₹) *
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                placeholder="0.00"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Tax Percentage */}
                    <div className="space-y-2">
                        <Label htmlFor="tax" className="text-sm font-medium">
                            Tax % *
                        </Label>
                        <Select value={tax} onValueChange={setTax}>
                            <SelectTrigger id="tax" className="w-full">
                                <SelectValue>{tax}%</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {TAX_OPTIONS.map(option => (
                                    <SelectItem
                                        key={option}
                                        value={String(option)}
                                    >
                                        {option}%
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Preview */}
                    <Card className="bg-secondary/20">
                        <CardContent className="space-y-2 pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-medium">
                                    ₹{preview.amount.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax ({tax}%):</span>
                                <span className="font-medium">
                                    ₹{preview.taxAmount.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                            <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                                <span>Total:</span>
                                <span>
                                    ₹{preview.total.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Buttons */}
                    <div className="flex gap-2 justify-end pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAddProduct} className="min-w-[120px]">
                            Add Product
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
