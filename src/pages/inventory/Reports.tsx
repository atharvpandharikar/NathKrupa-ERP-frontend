import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
    BarChart3,
    Download,
    TrendingUp,
    AlertTriangle,
    Package,
    FileSpreadsheet,
    Filter,
    Warehouse,
    Truck,
    CheckCircle2
} from "lucide-react";
import { inventoryApiFunctions, getTokens, API_ROOT } from "@/lib/api";
import { toast } from "sonner";

interface ReportTask {
    id: string | null;
    status: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE' | null;
    progress: {
        current: number;
        total: number;
    } | null;
    result: {
        file_path: string;
    } | null;
}

export default function Reports() {
    const [threshold, setThreshold] = useState(10);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
    const [reportType, setReportType] = useState<string>("inventory");
    const [isDownloading, setIsDownloading] = useState(false);
    const [reportTask, setReportTask] = useState<ReportTask>({
        id: null,
        status: null,
        progress: null,
        result: null
    });

    // Effect for polling task status
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (reportTask.id && (reportTask.status === 'PENDING' || reportTask.status === 'PROGRESS')) {
            interval = setInterval(async () => {
                try {
                    const tokens = getTokens();
                    if (!tokens?.access) {
                        toast.error("Authentication required.");
                        setReportTask({ id: null, status: null, progress: null, result: null });
                        return;
                    }
                    const response = await fetch(`${API_ROOT}/api/shop/inventory/report-status/${reportTask.id}/`, {
                        headers: { 'Authorization': `Bearer ${tokens.access}` }
                    });
                    if (!response.ok) throw new Error("Failed to fetch status");

                    const data = await response.json();

                    setReportTask(prev => ({
                        ...prev,
                        status: data.status,
                        progress: data.info?.current ? { current: data.info.current, total: data.info.total } : prev.progress,
                        result: data.result || null
                    }));

                    if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
                        if (interval) clearInterval(interval);
                    }
                } catch (error) {
                    console.error("Polling error:", error);
                    toast.error("Failed to get report status.");
                    if (interval) clearInterval(interval);
                    setReportTask({ id: null, status: null, progress: null, result: null });
                }
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [reportTask.id, reportTask.status]);

    // Effect to handle final download
    useEffect(() => {
        if (reportTask.status === 'SUCCESS' && reportTask.result?.file_path) {
            toast.success("Report is ready! Downloading...");
            const downloadUrl = `${API_ROOT}${reportTask.result.file_path}`;
            // Use a simple anchor download since the file is now publicly accessible via MEDIA_URL
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', ''); // Browser will infer filename
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Reset task state
            setTimeout(() => {
                setReportTask({ id: null, status: null, progress: null, result: null });
            }, 1000);
        } else if (reportTask.status === 'FAILURE') {
            toast.error("Report generation failed. Please try again.");
            // Reset task state
            setTimeout(() => {
                setReportTask({ id: null, status: null, progress: null, result: null });
            }, 1000);
        }
    }, [reportTask.status, reportTask.result]);


    // Helper function to download files with authentication
    const downloadAuthenticatedFile = async (url: string, defaultFilename: string) => {
        try {
            setIsDownloading(true);
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
                } else {
                    toast.error(`Failed to generate report: ${response.statusText}`);
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

            toast.success("Report downloaded successfully!");
        } catch (error) {
            console.error('Download error:', error);
            toast.error("Failed to download report. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    // Fetch warehouses for filtering
    const { data: warehouses = [] } = useQuery({
        queryKey: ['inventory', 'warehouses'],
        queryFn: inventoryApiFunctions.warehouses.list,
    });

    // Fetch inventory entries for stats
    const { data: entries = [], isLoading: isLoadingEntries } = useQuery({
        queryKey: ['inventory', 'entries', selectedWarehouse],
        queryFn: () => inventoryApiFunctions.inventory.list({
            warehouse: selectedWarehouse === "all" ? undefined : selectedWarehouse
        }),
    });

    // Calculate stats
    const totalEntries = entries.length;
    const totalQuantity = entries.reduce((sum, entry) => {
        const quantity = Number(entry.quantity) || 0;
        return sum + quantity;
    }, 0);
    const lowStockCount = entries.filter(entry => {
        const quantity = Number(entry.quantity) || 0;
        return quantity <= threshold;
    }).length;

    // This function is now replaced by the async version
    // const handleExportInventory = async () => {
    //     const params = new URLSearchParams();
    //     if (selectedWarehouse !== "all") {
    //         params.append('warehouse', selectedWarehouse);
    //     }
    //
    //     const url = `${inventoryApiFunctions.inventory.baseUrl}/inventory/export_excel/?${params.toString()}`;
    //     toast.info("Generating Inventory Report...");
    //     await downloadAuthenticatedFile(url, 'inventory_report.xlsx');
    // };

    const handleExportInventoryAsync = async () => {
        try {
            toast.info("Initializing inventory report...");
            const tokens = getTokens();
            if (!tokens?.access) {
                toast.error("Authentication required.");
                return;
            }

            const response = await fetch(`${API_ROOT}/api/shop/inventory/export_excel_async/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokens.access}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    warehouse: selectedWarehouse === "all" ? null : selectedWarehouse,
                })
            });

            if (response.status !== 202) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server responded with ${response.status}`);
            }

            const data = await response.json();
            setReportTask({ id: data.task_id, status: 'PENDING', progress: null, result: null });
            toast.success("Report generation started! You will be notified when it's ready.");

        } catch (error) {
            console.error("Failed to start report generation:", error);
            toast.error(`Error: ${error instanceof Error ? error.message : "An unknown error occurred"}`);
        }
    };

    const handleExportLowStock = async () => {
        const params = new URLSearchParams();
        params.append('threshold', threshold.toString());
        if (selectedWarehouse !== "all") {
            params.append('warehouse', selectedWarehouse);
        }

        const url = `${inventoryApiFunctions.inventory.baseUrl}/inventory/low_stock_report/?${params.toString()}`;
        toast.info("Generating Low Stock Report...");
        await downloadAuthenticatedFile(url, 'low_stock_report.xlsx');
    };

    const handleExportShipping = async () => {
        const params = new URLSearchParams();
        if (selectedWarehouse !== "all") {
            params.append('warehouse', selectedWarehouse);
        }

        const url = `${inventoryApiFunctions.inventory.baseUrl}/inventory/shipping_report/?${params.toString()}`;
        toast.info("Generating Shipping Report...");
        await downloadAuthenticatedFile(url, 'shipping_report.xlsx');
    };

    const handleExportWarehouseSummary = async () => {
        const url = `${inventoryApiFunctions.inventory.baseUrl}/inventory/warehouse_summary_report/`;
        toast.info("Generating Warehouse Summary Report...");
        await downloadAuthenticatedFile(url, 'warehouse_summary.xlsx');
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Reports</h1>
                    <p className="text-muted-foreground">View inventory statistics and export reports</p>
                </div>
                <div className="flex gap-2">
                    {/* The main export button is now in the "Export Options" card */}
                    <Button onClick={handleExportLowStock} variant="destructive">
                        <Download className="h-4 w-4 mr-2" />
                        Export Low Stock
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Report Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="warehouse">Warehouse</Label>
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Warehouses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Warehouses</SelectItem>
                                    {warehouses.map((warehouse) => (
                                        <SelectItem key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="threshold">Low Stock Threshold</Label>
                            <Input
                                id="threshold"
                                type="number"
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value))}
                                min="0"
                                step="0.1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reportType">Report Type</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select report type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inventory">Inventory Entries</SelectItem>
                                    <SelectItem value="lowstock">Low Stock Items</SelectItem>
                                    <SelectItem value="shipping">Shipping Report</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEntries}</div>
                        <p className="text-xs text-muted-foreground">
                            Inventory entries
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalQuantity.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Total units in stock
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Below {threshold} units
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{warehouses.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Active warehouses
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Low Stock Items List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Low Stock Items ({lowStockCount})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingEntries ? (
                        <div className="text-center py-8">Loading inventory data...</div>
                    ) : lowStockCount === 0 ? (
                        <div className="text-center py-8">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No low stock items</h3>
                            <p className="text-muted-foreground">
                                All inventory entries are above the threshold of {threshold} units
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {entries
                                .filter(entry => {
                                    const quantity = Number(entry.quantity) || 0;
                                    return quantity <= threshold;
                                })
                                .map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <h4 className="font-medium">{entry.product_details?.title || 'Unknown Product'}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {entry.warehouse_details?.name || 'N/A'} • Rack {entry.rack_details?.rack_number || 'N/A'} •
                                                Current stock: {entry.quantity} {entry.unit_details?.code || 'units'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Low Stock
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Threshold: {threshold}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Export Options
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Generate professional Excel reports with proper formatting, summaries, and color-coding
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-2 hover:border-primary transition-colors">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 mx-auto">
                                        <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                                    </div>
                                    <h4 className="font-semibold text-center">Inventory Report</h4>
                                    <p className="text-sm text-muted-foreground text-center min-h-[60px]">
                                        Complete inventory with locations, quantities, and timestamps. Includes totals and statistics.
                                    </p>
                                    <Button
                                        onClick={handleExportInventoryAsync}
                                        className="w-full"
                                        variant="outline"
                                        disabled={reportTask.id !== null}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        {reportTask.id ? "Generating..." : "Download"}
                                    </Button>
                                    {reportTask.id && (
                                        <div className="pt-2">
                                            <Progress value={reportTask.progress ? (reportTask.progress.current / reportTask.progress.total) * 100 : 5} />
                                            <p className="text-xs text-center text-muted-foreground mt-1">
                                                {reportTask.status === 'PROGRESS' && reportTask.progress
                                                    ? `${reportTask.progress.current} of ${reportTask.progress.total} records processed`
                                                    : `Status: ${reportTask.status || 'Initializing...'}`
                                                }
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>Formatted Excel</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:border-destructive transition-colors">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900 mx-auto">
                                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
                                    </div>
                                    <h4 className="font-semibold text-center">Low Stock Report</h4>
                                    <p className="text-sm text-muted-foreground text-center min-h-[60px]">
                                        Items below threshold with shortage calculations. Color-coded by severity (Critical, Low, Out of Stock).
                                    </p>
                                    <Button
                                        onClick={handleExportLowStock}
                                        variant="destructive"
                                        className="w-full"
                                        disabled={isDownloading}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        {isDownloading ? "Downloading..." : "Download"}
                                    </Button>
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>Color Coded</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:border-blue-500 transition-colors">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-sky-100 dark:bg-sky-900 mx-auto">
                                        <Truck className="h-6 w-6 text-sky-600 dark:text-sky-300" />
                                    </div>
                                    <h4 className="font-semibold text-center">Shipping Report</h4>
                                    <p className="text-sm text-muted-foreground text-center min-h-[60px]">
                                        Logistics information with warehouse locations, weights, and dimensions for delivery partners.
                                    </p>
                                    <Button
                                        onClick={handleExportShipping}
                                        variant="outline"
                                        className="w-full"
                                        disabled={isDownloading}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        {isDownloading ? "Downloading..." : "Download"}
                                    </Button>
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>Logistics Ready</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 hover:border-green-500 transition-colors">
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 mx-auto">
                                        <Warehouse className="h-6 w-6 text-green-600 dark:text-green-300" />
                                    </div>
                                    <h4 className="font-semibold text-center">Warehouse Summary</h4>
                                    <p className="text-sm text-muted-foreground text-center min-h-[60px]">
                                        Grouped by warehouse with product summaries, location counts, and grand totals.
                                    </p>
                                    <Button
                                        onClick={handleExportWarehouseSummary}
                                        variant="outline"
                                        className="w-full"
                                        disabled={isDownloading}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        {isDownloading ? "Downloading..." : "Download"}
                                    </Button>
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>Grouped Data</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Report Features */}
            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Report Features
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                            <div>
                                <h4 className="font-medium text-sm">Professional Formatting</h4>
                                <p className="text-xs text-muted-foreground">
                                    Styled headers, borders, proper number formats, and date formatting
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                            <div>
                                <h4 className="font-medium text-sm">Automatic Calculations</h4>
                                <p className="text-xs text-muted-foreground">
                                    Totals, subtotals, shortage calculations, and summary statistics
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                            <div>
                                <h4 className="font-medium text-sm">Color-Coded Alerts</h4>
                                <p className="text-xs text-muted-foreground">
                                    Visual indicators for low stock, critical items, and out-of-stock products
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                            <div>
                                <h4 className="font-medium text-sm">Frozen Headers</h4>
                                <p className="text-xs text-muted-foreground">
                                    Easy navigation with freeze panes for better data viewing
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                            <div>
                                <h4 className="font-medium text-sm">Timestamped Files</h4>
                                <p className="text-xs text-muted-foreground">
                                    Each report includes generation timestamp in filename
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                            <div>
                                <h4 className="font-medium text-sm">Filter Support</h4>
                                <p className="text-xs text-muted-foreground">
                                    Apply warehouse and threshold filters before export
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}