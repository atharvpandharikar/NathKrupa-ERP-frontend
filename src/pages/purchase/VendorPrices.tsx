import { useState, useEffect, useMemo, useCallback } from "react";
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
    Star,
    X,
    Save,
    Clock,
    Package,
    Download,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { purchaseApi, shopProductsApi, type Vendor, type ShopProduct, API_ROOT, getTokens } from "@/lib/api";
import { toast } from "sonner";

interface VendorProductPrice {
    id: number;
    vendor: number;
    vendor_name: string;
    product: number;
    product_id: string;
    product_title: string;
    purchase_price: string;
    minimum_order_quantity: string;
    lead_time_days: number;
    is_preferred: boolean;
    is_active: boolean;
    effective_from: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    price_history?: PriceHistoryItem[];
}

interface PriceHistoryItem {
    id: number;
    purchase_price: string;
    effective_from: string;
    effective_to: string | null;
    changed_by: number | null;
    changed_by_username?: string;
    notes?: string;
    created_at: string;
}

export default function VendorPrices() {
    const [vendorPrices, setVendorPrices] = useState<VendorProductPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterVendor, setFilterVendor] = useState<string>("all");
    const [filterActive, setFilterActive] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrevious, setHasPrevious] = useState(false);
    const pageSize = 20; // Server-side page size

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [productsLoading, setProductsLoading] = useState(false);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState<string>("");

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedPrice, setSelectedPrice] = useState<VendorProductPrice | null>(null);
    const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
    const [exportTaskId, setExportTaskId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const [editForm, setEditForm] = useState({
        purchase_price: "",
        minimum_order_quantity: "1",
        lead_time_days: 5,
        is_preferred: false,
        is_active: true,
        notes: "",
    });

    // Load vendors and products lazily (only when needed)
    useEffect(() => {
        if (vendors.length === 0 && !vendorsLoading) {
            fetchVendors();
        }
    }, []);

    useEffect(() => {
        if (isAddDialogOpen && products.length === 0 && !productsLoading) {
            fetchProducts();
        }
    }, [isAddDialogOpen]);

    const fetchVendorPrices = useCallback(async () => {
        try {
            setLoading(true);
            
            // Build query parameters for server-side filtering and pagination
            const params: Record<string, any> = {
                page: currentPage,
                page_size: pageSize,
            };

            // Add filters (only if not "all")
            if (filterVendor !== "all") {
                params.vendor = filterVendor;
            }
            if (filterActive !== "all") {
                params.is_active = filterActive === "active" ? "true" : "false";
            }
            // Add search term if provided
            if (searchTerm) {
                params.search = searchTerm;
            }

            const response = await purchaseApi.vendorProductPrices.list(params);
            
            // Handle paginated response structure
            if (response && typeof response === 'object' && 'results' in response) {
                // Paginated response: { count, next, previous, results }
                setVendorPrices(Array.isArray(response.results) ? response.results : []);
                setTotalCount(response.count || 0);
                setHasNext(!!response.next);
                setHasPrevious(!!response.previous);
            } else {
                // Fallback for non-paginated response (backward compatibility)
                setVendorPrices(Array.isArray(response) ? response : []);
                setTotalCount(Array.isArray(response) ? response.length : 0);
                setHasNext(false);
                setHasPrevious(false);
            }
        } catch (error) {
            console.error('Failed to fetch vendor prices:', error);
            toast.error('Failed to load vendor prices');
            setVendorPrices([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, filterVendor, filterActive, pageSize]);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [searchTerm, filterVendor, filterActive]);

    // Fetch vendor prices when filters or page change
    useEffect(() => {
        fetchVendorPrices();
    }, [fetchVendorPrices]);

    const fetchVendors = async () => {
        try {
            setVendorsLoading(true);
            const vendorsResponse = await purchaseApi.vendors.list();
            setVendors(Array.isArray(vendorsResponse) ? vendorsResponse : []);
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
        } finally {
            setVendorsLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            setProductsLoading(true);
            const productsResponse = await shopProductsApi.list();
            setProducts(Array.isArray(productsResponse) ? productsResponse : []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setProductsLoading(false);
        }
    };

    const fetchData = async () => {
        await fetchVendorPrices();
        if (vendors.length === 0) {
            await fetchVendors();
        }
    };

    const openEditDialog = useCallback((price: VendorProductPrice) => {
        setSelectedPrice(price);
        setEditForm({
            purchase_price: price.purchase_price,
            minimum_order_quantity: price.minimum_order_quantity,
            lead_time_days: price.lead_time_days,
            is_preferred: price.is_preferred,
            is_active: price.is_active,
            notes: price.notes || "",
        });
        setIsEditDialogOpen(true);
    }, []);

    const openHistoryDialog = useCallback(async (price: VendorProductPrice) => {
        setSelectedPrice(price);
        try {
            const history = await purchaseApi.vendorProductPrices.getPriceHistory(price.id);
            setPriceHistory(Array.isArray(history) ? history : []);
            setIsHistoryDialogOpen(true);
        } catch (error) {
            console.error('Failed to fetch price history:', error);
            toast.error('Failed to load price history');
        }
    }, []);

    const handleSave = async () => {
        if (!selectedPrice) return;

        try {
            await purchaseApi.vendorProductPrices.update(selectedPrice.id, {
                purchase_price: parseFloat(editForm.purchase_price),
                minimum_order_quantity: parseFloat(editForm.minimum_order_quantity),
                lead_time_days: editForm.lead_time_days,
                is_preferred: editForm.is_preferred,
                is_active: editForm.is_active,
                notes: editForm.notes,
            });

            toast.success('Vendor price updated successfully');
            setIsEditDialogOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to update vendor price:', error);
            toast.error('Failed to update vendor price');
        }
    };

    const handleAdd = async () => {
        if (!editForm.purchase_price || !filterVendor || filterVendor === "all" || !selectedProductForAdd) {
            toast.error('Please select vendor and product, and enter price');
            return;
        }

        try {
            await purchaseApi.vendorProductPrices.create({
                vendor: parseInt(filterVendor),
                product_id: selectedProductForAdd,
                purchase_price: parseFloat(editForm.purchase_price),
                minimum_order_quantity: parseFloat(editForm.minimum_order_quantity),
                lead_time_days: editForm.lead_time_days,
                is_preferred: editForm.is_preferred,
                is_active: editForm.is_active,
                notes: editForm.notes,
            });

            toast.success('Vendor price added successfully');
            setIsAddDialogOpen(false);
            setSelectedProductForAdd("");
            setEditForm({
                purchase_price: "",
                minimum_order_quantity: "1",
                lead_time_days: 5,
                is_preferred: false,
                is_active: true,
                notes: "",
            });
            fetchData();
        } catch (error) {
            console.error('Failed to create vendor price:', error);
            toast.error('Failed to add vendor price');
        }
    };

    // Prices are already filtered server-side, so use them directly
    const filteredPrices = vendorPrices;

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const filters: { vendor_id?: string; is_active?: string } = {};
            if (filterVendor !== "all") {
                filters.vendor_id = filterVendor;
            }
            if (filterActive !== "all") {
                filters.is_active = filterActive;
            }

            const response = await purchaseApi.vendorProductPrices.exportExcelAsync(filters);

            // Check if response has task_id (async) or file_path (synchronous)
            if (response.task_id) {
                // Async export - start polling
                setExportTaskId(response.task_id);
                pollExportStatus(response.task_id);
            } else if (response.file_path) {
                // Synchronous export - download immediately
                await downloadAuthenticatedFile(
                    `${API_ROOT}${response.file_path}`,
                    `vendor_prices_report_${new Date().toISOString().split('T')[0]}.xlsx`
                );
                setIsExporting(false);
            } else {
                throw new Error('Invalid response from export endpoint');
            }
        } catch (error: any) {
            console.error('Failed to start export:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to start Excel export';
            toast.error(errorMessage);
            setIsExporting(false);
        }
    };

    const pollExportStatus = async (taskId: string) => {
        const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
        let attempts = 0;

        const poll = async () => {
            try {
                attempts++;
                const status = await purchaseApi.vendorProductPrices.getReportStatus(taskId);

                if (status.status === 'SUCCESS') {
                    // Download the file with authentication
                    if (status.result?.file_path) {
                        await downloadAuthenticatedFile(
                            `${API_ROOT}${status.result.file_path}`,
                            `vendor_prices_report_${new Date().toISOString().split('T')[0]}.xlsx`
                        );
                        setExportTaskId(null);
                        setIsExporting(false);
                    }
                } else if (status.status === 'FAILURE') {
                    toast.error('Export failed. Please try again.');
                    setExportTaskId(null);
                    setIsExporting(false);
                } else if (status.status === 'PENDING' || status.status === 'PROGRESS') {
                    // Continue polling
                    if (attempts < maxAttempts) {
                        setTimeout(poll, 5000); // Poll every 5 seconds
                    } else {
                        toast.error('Export timed out. Please try again.');
                        setExportTaskId(null);
                        setIsExporting(false);
                    }
                }
            } catch (error) {
                console.error('Failed to check export status:', error);
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000);
                } else {
                    toast.error('Failed to check export status');
                    setExportTaskId(null);
                    setIsExporting(false);
                }
            }
        };

        poll();
    };

    // Helper function to download files with authentication
    const downloadAuthenticatedFile = async (url: string, defaultFilename: string) => {
        try {
            const tokens = getTokens();

            if (!tokens?.access) {
                toast.error("Authentication required. Please log in again.");
                return;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${tokens.access}`,
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Session expired. Please log in again.");
                } else if (response.status === 404) {
                    toast.error("File not found. The report may have been deleted.");
                } else {
                    toast.error(`Failed to download: ${response.statusText}`);
                }
                return;
            }

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = defaultFilename;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Download the file
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            toast.success('Excel report downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download report. Please try again.');
        }
    };

    // Group prices by product (server already returns filtered/paginated data)
    const pricesByProduct = useMemo(() => {
        return filteredPrices.reduce((acc, price) => {
            if (!acc[price.product_id]) {
                acc[price.product_id] = [];
            }
            acc[price.product_id].push(price);
            return acc;
        }, {} as Record<string, VendorProductPrice[]>);
    }, [filteredPrices]);

    // Calculate pagination from server response
    const totalProducts = Object.keys(pricesByProduct).length;
    const totalPages = Math.ceil(totalCount / pageSize);

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-3">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Vendor Product Prices</h1>
                    <p className="text-sm text-gray-600">Manage vendor-specific prices</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleExportExcel}
                        size="sm"
                        variant="outline"
                        disabled={isExporting}
                    >
                        <Download className="h-4 w-4 mr-1" />
                        {isExporting ? "Exporting..." : "Export Excel"}
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Price
                    </Button>
                </div>
            </div>

            {/* Compact Filters */}
            <Card className="shadow-sm">
                <CardContent className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Search products or vendors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-xs"
                            />
                        </div>
                        <Select value={filterVendor} onValueChange={setFilterVendor}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="All Vendors" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Vendors</SelectItem>
                                {vendors.map((vendor) => (
                                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                        {vendor.name}
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

            {/* Compact Grouped Vendor Prices */}
            <Card className="shadow-sm">
                <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">
                            {totalCount > 0 ? `${totalCount} Total` : 'No'} Vendor Prices
                            {totalPages > 1 && (
                                <span className="text-xs font-normal text-gray-500 ml-2">
                                    (Page {currentPage} of {totalPages})
                                </span>
                            )}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    {Object.keys(pricesByProduct).length === 0 ? (
                        <div className="text-center py-6 text-xs text-gray-500">
                            {loading ? 'Loading...' : 'No vendor prices found'}
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {Object.entries(pricesByProduct).map(([productId, prices]) => {
                                // Sort prices once per product
                                const sortedPrices = [...prices].sort((a, b) =>
                                    parseFloat(a.purchase_price) - parseFloat(b.purchase_price)
                                );
                                const cheapestPrice = sortedPrices[0];
                                const mostExpensivePrice = sortedPrices[sortedPrices.length - 1];

                                return (
                                    <div
                                        key={productId}
                                        className="border rounded p-2.5 hover:border-primary/50 transition-colors bg-white"
                                    >
                                        {/* Product Header */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-xs truncate">{prices[0].product_title}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                                        {prices.length} vendor{prices.length > 1 ? 's' : ''}
                                                    </Badge>
                                                    {prices.length > 1 && (
                                                        <span className="text-[10px] text-gray-500">
                                                            ₹{parseFloat(cheapestPrice.purchase_price).toFixed(0)} -
                                                            ₹{parseFloat(mostExpensivePrice.purchase_price).toFixed(0)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vendor Cards Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
                                            {sortedPrices.map((price, index) => (
                                                <div
                                                    key={price.id}
                                                    className={`border rounded p-1.5 text-[10px] ${index === 0 && prices.length > 1
                                                        ? 'border-green-400 bg-green-50/50'
                                                        : index === sortedPrices.length - 1 && prices.length > 1
                                                            ? 'border-red-400 bg-red-50/50'
                                                            : 'border-gray-200 bg-gray-50/30'
                                                        }`}
                                                >
                                                    {/* Vendor Name with Star */}
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="font-medium text-gray-900 truncate text-[10px]">
                                                            {price.vendor_name}
                                                        </span>
                                                        {price.is_preferred && (
                                                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                                        )}
                                                    </div>

                                                    {/* Price */}
                                                    <div className="flex items-center gap-1 mb-0.5">
                                                        <span className="text-sm font-bold text-primary">
                                                            ₹{parseFloat(price.purchase_price).toFixed(2)}
                                                        </span>
                                                        {!price.is_active && (
                                                            <Badge variant="secondary" className="text-[8px] h-3 px-1 leading-none">
                                                                Inactive
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Min Qty & Lead Time */}
                                                    <div className="flex items-center gap-1.5 text-[9px] text-gray-600 mb-1">
                                                        <span className="flex items-center gap-0.5">
                                                            <Package className="h-2.5 w-2.5" />
                                                            {price.minimum_order_quantity}
                                                        </span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="flex items-center gap-0.5">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            {price.lead_time_days}d
                                                        </span>
                                                    </div>

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
                                                            onClick={() => openHistoryDialog(price)}
                                                        >
                                                            <History className="h-2.5 w-2.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                    <div className="text-xs text-gray-500">
                                        Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} vendor prices
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(1)}
                                            disabled={!hasPrevious || currentPage === 1}
                                            className="h-7 px-2"
                                        >
                                            <ChevronsLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={!hasPrevious || currentPage === 1}
                                            className="h-7 px-2"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let page: number;
                                                if (totalPages <= 5) {
                                                    page = i + 1;
                                                } else if (currentPage <= 3) {
                                                    page = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    page = totalPages - 4 + i;
                                                } else {
                                                    page = currentPage - 2 + i;
                                                }
                                                return (
                                                    <Button
                                                        key={page}
                                                        variant={currentPage === page ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(page)}
                                                        className="h-7 w-7 p-0 text-xs"
                                                    >
                                                        {page}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={!hasNext || currentPage === totalPages}
                                            className="h-7 px-2"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={!hasNext || currentPage === totalPages}
                                            className="h-7 px-2"
                                        >
                                            <ChevronsRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Vendor Price</DialogTitle>
                        <DialogDescription>
                            {selectedPrice && `Update price for ${selectedPrice.product_title} from ${selectedPrice.vendor_name}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Purchase Price (₹) *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.purchase_price}
                                    onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Minimum Order Quantity</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.minimum_order_quantity}
                                    onChange={(e) => setEditForm({ ...editForm, minimum_order_quantity: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lead Time (Days)</Label>
                                <Input
                                    type="number"
                                    value={editForm.lead_time_days}
                                    onChange={(e) => setEditForm({ ...editForm, lead_time_days: parseInt(e.target.value) || 5 })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="is_preferred"
                                    checked={editForm.is_preferred}
                                    onChange={(e) => setEditForm({ ...editForm, is_preferred: e.target.checked })}
                                    className="rounded"
                                />
                                <Label htmlFor="is_preferred">Preferred Vendor</Label>
                            </div>
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
                        <DialogTitle>Add Vendor Price</DialogTitle>
                        <DialogDescription>
                            Add a new vendor price for a product
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vendor *</Label>
                                <Select value={filterVendor} onValueChange={setFilterVendor}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vendor" />
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
                                <Label>Product *</Label>
                                <Select value={selectedProductForAdd} onValueChange={setSelectedProductForAdd}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((product) => (
                                            <SelectItem key={product.product_id} value={product.product_id}>
                                                {product.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Purchase Price (₹) *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.purchase_price}
                                    onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Minimum Order Quantity</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.minimum_order_quantity}
                                    onChange={(e) => setEditForm({ ...editForm, minimum_order_quantity: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lead Time (Days)</Label>
                                <Input
                                    type="number"
                                    value={editForm.lead_time_days}
                                    onChange={(e) => setEditForm({ ...editForm, lead_time_days: parseInt(e.target.value) || 5 })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="add_is_preferred"
                                    checked={editForm.is_preferred}
                                    onChange={(e) => setEditForm({ ...editForm, is_preferred: e.target.checked })}
                                    className="rounded"
                                />
                                <Label htmlFor="add_is_preferred">Preferred Vendor</Label>
                            </div>
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
                            {selectedPrice && `Price history for ${selectedPrice.product_title} from ${selectedPrice.vendor_name}`}
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
                                        <TableHead>Effective From</TableHead>
                                        <TableHead>Effective To</TableHead>
                                        <TableHead>Changed By</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {priceHistory.map((history) => (
                                        <TableRow key={history.id}>
                                            <TableCell className="font-semibold">
                                                ₹{parseFloat(history.purchase_price).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{new Date(history.effective_from).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                {history.effective_to
                                                    ? new Date(history.effective_to).toLocaleDateString()
                                                    : <Badge>Current</Badge>
                                                }
                                            </TableCell>
                                            <TableCell>
                                                {history.changed_by_username || "System"}
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
        </div>
    );
}

