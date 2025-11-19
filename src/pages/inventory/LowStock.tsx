import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    AlertTriangle,
    Download,
    Package,
    Search,
    RefreshCcw,
    TrendingDown,
    XCircle,
    AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_ROOT, getTokens } from "@/lib/api";
import { toast } from "sonner";

interface LowStockProduct {
    product_id: string;
    title: string;
    stock: number | string;
    low_stock_threshold: number | string;
    category?: {
        title: string;
    };
    brand?: {
        name: string;
    };
    unit?: {
        name: string;
        code: string;
    };
    price?: number | string;
    purchase_price?: number | string;
}

export default function LowStock() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch low stock products
    const { data: products = [], isLoading, refetch } = useQuery<LowStockProduct[]>({
        queryKey: ['low-stock-products'],
        queryFn: async () => {
            const tokens = getTokens();
            const response = await fetch(`${API_ROOT}/api/shop/inventory/products/low_stock/`, {
                headers: {
                    'Authorization': `Bearer ${tokens?.access}`,
                }
            });
            if (!response.ok) throw new Error('Failed to fetch low stock products');
            const data = await response.json();
            console.log('Low stock API response:', data);
            return data;
        },
        // COST OPTIMIZATION: Reduced polling from 60 seconds to 5 minutes
        // Low stock status doesn't change frequently enough to warrant minute-by-minute polling
        refetchInterval: 300000, // Refetch every 5 minutes (was 60 seconds) - reduces API calls by 80%
        staleTime: 300000, // Consider data fresh for 5 minutes
    });

    // Calculate status for a product
    const getProductStatus = (product: LowStockProduct) => {
        const stock = Number(product.stock) || 0;
        const threshold = Number(product.low_stock_threshold) || 0;

        if (stock === 0) return 'out-of-stock';
        if (stock < threshold * 0.5) return 'critical';
        return 'low';
    };

    // Filter products
    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.product_id.toLowerCase().includes(searchQuery.toLowerCase());

        if (statusFilter === 'all') return matchesSearch;
        return matchesSearch && getProductStatus(product) === statusFilter;
    });

    // Calculate stats
    const outOfStockCount = products.filter(p => Number(p.stock) === 0).length;
    const criticalCount = products.filter(p => {
        const stock = Number(p.stock) || 0;
        const threshold = Number(p.low_stock_threshold) || 0;
        return stock > 0 && stock < threshold * 0.5;
    }).length;
    const lowStockCount = products.filter(p => {
        const stock = Number(p.stock) || 0;
        const threshold = Number(p.low_stock_threshold) || 0;
        return stock >= threshold * 0.5 && stock <= threshold;
    }).length;

    // Handle Excel export
    const handleExport = async () => {
        try {
            setIsDownloading(true);
            const tokens = getTokens();

            if (!tokens?.access) {
                toast.error("Authentication required. Please log in again.");
                return;
            }

            const url = `${API_ROOT}/api/shop/inventory/inventory/low_stock_report/?use_product_threshold=true`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${tokens.access}`,
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Session expired. Please log in again.");
                } else {
                    toast.error(`Failed to generate report: ${response.statusText}`);
                }
                return;
            }

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'low_stock_report.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            toast.success("Report downloaded successfully!");
        } catch (error) {
            console.error('Download error:', error);
            toast.error("Failed to download report. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    // Get badge variant and icon for status
    const getStatusBadge = (product: LowStockProduct) => {
        const status = getProductStatus(product);

        if (status === 'out-of-stock') {
            return (
                <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Out of Stock
                </Badge>
            );
        } else if (status === 'critical') {
            return (
                <Badge variant="destructive" className="bg-orange-600 hover:bg-orange-700 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Critical
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 gap-1">
                <AlertCircle className="h-3 w-3" />
                Low Stock
            </Badge>
        );
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                        Low Stock Alert
                    </h1>
                    <p className="text-muted-foreground">Monitor and manage products running low on stock</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => refetch()} variant="outline" size="sm">
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={handleExport} variant="destructive" disabled={isDownloading}>
                        <Download className="h-4 w-4 mr-2" />
                        {isDownloading ? "Downloading..." : "Export Excel"}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Low Stock</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{products.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Items need attention
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Requires immediate action
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{criticalCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Below 50% of threshold
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                        <TrendingDown className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Below threshold
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Label htmlFor="search">Search Products</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search by product name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-64">
                            <Label htmlFor="status">Status Filter</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                    <SelectItem value="low">Low Stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Low Stock Products ({filteredProducts.length})</span>
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSearchQuery("")}
                            >
                                Clear Search
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Loading low stock products...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                {searchQuery ? "No products found" : "No low stock items"}
                            </h3>
                            <p className="text-muted-foreground">
                                {searchQuery
                                    ? "Try adjusting your search criteria"
                                    : "All products have sufficient stock levels"
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product ID</TableHead>
                                        <TableHead>Product Title</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead className="text-right">Current Stock</TableHead>
                                        <TableHead className="text-right">Threshold</TableHead>
                                        <TableHead className="text-right">Shortage</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProducts.map((product) => {
                                        const stock = Number(product.stock) || 0;
                                        const threshold = Number(product.low_stock_threshold) || 0;
                                        const shortage = Math.max(0, threshold - stock);
                                        const status = getProductStatus(product);

                                        return (
                                            <TableRow key={product.product_id} className={
                                                status === 'out-of-stock' ? 'bg-red-50 dark:bg-red-950/20' :
                                                    status === 'critical' ? 'bg-orange-50 dark:bg-orange-950/20' :
                                                        'bg-yellow-50 dark:bg-yellow-950/20'
                                            }>
                                                <TableCell className="font-mono text-sm">{product.product_id}</TableCell>
                                                <TableCell className="font-medium">{product.title}</TableCell>
                                                <TableCell>{product.category?.title || '-'}</TableCell>
                                                <TableCell>{product.brand?.name || '-'}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    <span className={
                                                        status === 'out-of-stock' ? 'text-red-700 font-bold' :
                                                            status === 'critical' ? 'text-orange-700 font-bold' :
                                                                'text-yellow-700 font-bold'
                                                    }>
                                                        {stock.toFixed(2)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{threshold.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono text-red-600 font-bold">
                                                    {shortage.toFixed(2)}
                                                </TableCell>
                                                <TableCell>{product.unit?.code || '-'}</TableCell>
                                                <TableCell>{getStatusBadge(product)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">Understanding Stock Levels</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Out of Stock</p>
                                <p className="text-muted-foreground">Current stock is 0. Immediate reorder required.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Critical</p>
                                <p className="text-muted-foreground">Stock is below 50% of threshold. Urgent reorder needed.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Low Stock</p>
                                <p className="text-muted-foreground">Stock is below threshold. Plan reorder soon.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

