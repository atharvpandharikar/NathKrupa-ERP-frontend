import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { shopProductsApi, SHOP_API_ROOT } from '@/lib/shop-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Barcode from 'react-barcode';
import { 
    ArrowLeft, 
    Package, 
    Tag, 
    Barcode as BarcodeIcon, 
    Layers, 
    Calendar,
    DollarSign,
    Box,
    Truck,
    Info,
    CheckCircle2,
    XCircle,
    Image as ImageIcon,
    Printer
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProductView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isPrintDialogOpen, setIsPrintDialogOpen] = React.useState(false);
    const [printQuantity, setPrintQuantity] = React.useState(24);

    const { data: product, isLoading, isError, error } = useQuery({
        queryKey: ['product', id],
        queryFn: () => {
            if (!id) throw new Error("Product ID is required");
            return shopProductsApi.get(id);
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                 <div className="flex items-center gap-4 mb-8">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        );
    }

    if (isError || !product) {
        return (
            <div className="max-w-7xl mx-auto p-6 text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Product</h2>
                <p className="text-gray-600 mb-6">{error instanceof Error ? error.message : "Product not found"}</p>
                <Button onClick={() => navigate('/user-admin/products')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Products
                </Button>
            </div>
        );
    }

    if (!product) {
        return <div className="max-w-7xl mx-auto p-6 text-center">Product not found.</div>;
    }

    const formatPrice = (price: number | undefined) => {
        if (typeof price !== 'number') return '-';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(price);
    };

    const resolveImageUrl = (img?: string | null) => {
        if (!img) return null;
        if (img.startsWith('http')) return img;
        return `${SHOP_API_ROOT}${img.startsWith('/') ? '' : '/'}${img}`;
    };

    const handlePrint = () => {
        setIsPrintDialogOpen(false);
        // Small delay to allow dialog to close before printing
        setTimeout(() => {
             window.print();
        }, 100);
    };

    return (
        <>
            <style type="text/css" media="print">
                {`
                @page { 
                    size: auto;
                    margin: 0mm;
                }
                body {
                    background-color: #FFFFFF;
                    margin: 0px;
                }
                /* Hide everything by default */
                body * {
                    visibility: hidden; 
                }
                /* Only show our print container and its children */
                .print-only-section, .print-only-section * {
                    visibility: visible;
                }
                /* Position it at the top left to cover everything */
                .print-only-section {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                `}
            </style>
            
            {/* Printable Layout - Sticker Sheet (3 cols x 8 rows = 24 labels) */}
            <div className="print-only-section hidden print:grid print:grid-cols-3 print:gap-4 print:w-full print:bg-white print:text-black p-4">
                {Array.from({ length: printQuantity }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center justify-center border border-gray-300 p-2 h-[128px] overflow-hidden relative break-inside-avoid">
                        {/* Cut/Sticker boundary visualization (optional) */}
                        <div className="text-center w-full">
                            <h1 className="text-[10px] font-bold uppercase tracking-tight mb-1 truncate w-full">Nathkrupa Mechanical Services</h1>
                            
                            <div className="flex flex-col items-center gap-0.5 w-full">
                                <div className="text-[12px] font-bold leading-tight line-clamp-2 w-full px-1">{product.title}</div>
                                
                                <div className="flex justify-between w-full px-2 text-[10px] my-0.5">
                                    <span className="font-bold">HSN: {product.hsn_code || '-'}</span>
                                    {/* Optional: Add Price or Brand here if needed */}
                                    <span>{product.brand?.name ? product.brand.name.substring(0, 8) : ''}</span>
                                </div>

                                <div className="mt-1">
                                     {(product.barcode_number || product.barcode) ? (
                                        <Barcode
                                            value={product.barcode_number || product.barcode || ''}
                                            format="CODE128"
                                            width={1.2}
                                            height={25}
                                            fontSize={10}
                                            displayValue={true}
                                            margin={0}
                                        />
                                    ) : (
                                        <span className="text-[10px]">No Barcode</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Standard UI - Hidden when printing */}
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/user-admin/products')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{product.title}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <Badge variant="outline" className="text-xs">
                                    {product.is_active ? <span className="flex items-center text-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Active</span> : <span className="flex items-center text-gray-500"><XCircle className="w-3 h-3 mr-1"/> Inactive</span>}
                                </Badge>
                                <span className="text-gray-300">|</span>
                                <span className="font-mono text-xs text-gray-400">ID: {product.product_id}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Labels
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Print Product Labels</DialogTitle>
                                    <DialogDescription>
                                        Enter the number of labels you want to print.
                                        (Standard sheet has 24 labels)
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="quantity" className="text-right">
                                            Quantity
                                        </Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="1"
                                            value={printQuantity}
                                            onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" onClick={handlePrint}>Print</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button variant="outline" onClick={() => navigate(`/user-admin/products/edit/${id}`)}>
                            Edit Product
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Info Column */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Basic Details Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5 text-indigo-500" />
                                    Basic Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Category</label>
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-900">{product.category?.title || '-'}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Brand</label>
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-900">{product.brand?.name || '-'}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">HSN Code</label>
                                    <div className="font-medium text-gray-900">{product.hsn_code || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Barcode</label>
                                    <div className="flex items-center gap-2">
                                        {(product.barcode_number || product.barcode) ? (
                                            <div className="bg-white p-2 rounded border inline-block">
                                                <Barcode 
                                                    value={product.barcode_number || product.barcode || ''} 
                                                    format="CODE128"
                                                    width={1.5}
                                                    height={50}
                                                    fontSize={14}
                                                    margin={0}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <BarcodeIcon className="w-4 h-4" />
                                                <span>Not Generated</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="sm:col-span-2 space-y-1 pt-2">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                        {product.description || "No description available."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stock & Inventory Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Box className="w-5 h-5 text-indigo-500" />
                                    Inventory & Shipping
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Current Stock</label>
                                    <div className={`text-xl font-bold ${product.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                                        {product.stock} <span className="text-sm font-normal text-gray-500">units</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Lead Time</label>
                                    <div className="font-medium text-gray-900">{product.lead_time || 0} days</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Availability</label>
                                    <div>
                                        {product.is_available ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">In Stock</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100">Out of Stock</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Bulk Order</label>
                                    <div className="text-sm text-gray-900">{product.bulk_order_available ? "Available" : "Not Available"}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Cash on Delivery</label>
                                    <div className="text-sm text-gray-900">{product.is_cod ? "Enabled" : "Disabled"}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Tax Rate</label>
                                    <div className="text-sm text-gray-900">{product.taxes}% GST</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        {/* Image Card */}
                        <Card className="overflow-hidden">
                            <div className="aspect-square bg-gray-100 relative items-center justify-center flex">
                                {resolveImageUrl(product.image) ? (
                                    <img 
                                        src={resolveImageUrl(product.image)!} 
                                        alt={product.title} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <ImageIcon className="w-12 h-12 mb-2" />
                                        <span className="text-sm">No Image</span>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Pricing Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    Pricing
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-end border-b pb-3">
                                    <span className="text-sm text-gray-500">Selling Price</span>
                                    <span className="text-xl font-bold text-gray-900">{formatPrice(product.price)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-gray-500">Purchase Price</span>
                                    <span className="font-medium text-gray-900">{formatPrice(product.purchase_price)}</span>
                                </div>
                                {(product.discount_percentage || 0) > 0 && (
                                    <div className="flex justify-between items-center py-2 text-green-700 bg-green-50 px-2 rounded">
                                        <span className="text-sm font-medium">Discount ({product.discount_percentage}%)</span>
                                        <span className="font-bold">-{formatPrice(product.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-sm text-gray-500">Discounted Price</span>
                                    <span className="font-medium text-gray-900">{formatPrice(product.discounted_price)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
