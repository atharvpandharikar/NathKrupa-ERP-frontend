import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { billsApi, type Bill, API_ROOT, getTokens } from "@/lib/api";
// Badge import removed as status badges are no longer used
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { RefreshCw, Search, Plus, Eye, Settings, FileText, Printer, Download, TestTube } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Status options and badges removed as requested

export default function BillsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "all");
    const [testModeFilter, setTestModeFilter] = useState(searchParams.get("test_mode") || "all");
    const { toast } = useToast();

    // Fetch bills
    const listQuery = useQuery({
        queryKey: ["bills"],
        queryFn: () => billsApi.list()
    });

    const items: Bill[] = listQuery.data ?
        (Array.isArray(listQuery.data) ? listQuery.data as Bill[] : (listQuery.data.results ?? [])) : [];

    // No status grouping needed

    // Filter and search
    const filteredItems = useMemo(() => {
        let filtered = items;

        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.work_order?.quotation?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.quotation?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.work_order?.quotation?.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.quotation?.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Date filtering
        if (dateFilter !== "all") {
            const today = new Date();
            const filterDate = new Date();

            switch (dateFilter) {
                case "today":
                    filtered = filtered.filter(item => {
                        const itemDate = new Date(item.created_at);
                        return itemDate.toDateString() === today.toDateString();
                    });
                    break;
                case "week":
                    filterDate.setDate(today.getDate() - 7);
                    filtered = filtered.filter(item => new Date(item.created_at) >= filterDate);
                    break;
                case "month":
                    filterDate.setMonth(today.getMonth() - 1);
                    filtered = filtered.filter(item => new Date(item.created_at) >= filterDate);
                    break;
                case "year":
                    filterDate.setFullYear(today.getFullYear() - 1);
                    filtered = filtered.filter(item => new Date(item.created_at) >= filterDate);
                    break;
            }
        }

        // Test mode filtering
        if (testModeFilter !== "all") {
            if (testModeFilter === "test") {
                filtered = filtered.filter(item => item.is_test);
            } else if (testModeFilter === "production") {
                filtered = filtered.filter(item => !item.is_test);
            }
        }

        return filtered;
    }, [items, searchTerm, dateFilter, testModeFilter]);

    const stats = {
        total: items.length,
        totalValue: items.reduce((sum, b) => sum + (Number(b.quoted_price) + Number(b.total_added_features_cost || 0)), 0)
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (value) {
            searchParams.set("search", value);
        } else {
            searchParams.delete("search");
        }
        setSearchParams(searchParams);
    };

    const handleDateFilter = (value: string) => {
        setDateFilter(value);
        if (value !== "all") {
            searchParams.set("date", value);
        } else {
            searchParams.delete("date");
        }
        setSearchParams(searchParams);
    };

    const handleTestModeFilter = (value: string) => {
        setTestModeFilter(value);
        if (value !== "all") {
            searchParams.set("test_mode", value);
        } else {
            searchParams.delete("test_mode");
        }
        setSearchParams(searchParams);
    };

    const handlePrint = async (billId: number) => {
        try {
            const tokens = getTokens();
            const response = await fetch(`${API_ROOT}/api/manufacturing/bills/${billId}/bill_print/`, {
                headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {}
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
        } catch (error: any) {
            toast({
                title: "Print failed",
                description: error?.message || "Failed to print bill",
                variant: "destructive"
            });
        }
    };

    const handleDownload = async (billId: number, billNumber: string) => {
        try {
            const tokens = getTokens();
            const response = await fetch(`${API_ROOT}/api/manufacturing/bills/${billId}/bill_print/`, {
                headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {}
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Bill_${billNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            toast({
                title: "Download failed",
                description: error?.message || "Failed to download bill",
                variant: "destructive"
            });
        }
    };

    const BillItem = ({ item }: { item: Bill }) => {
        const totalVal = Number(item.quoted_price) + Number(item.total_added_features_cost || 0);

        return (
            <div className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent transition-colors">
                <div className="flex items-center gap-3 flex-1">
                    {/* Bill Number */}
                    <div className="min-w-[100px]">
                        <div className="flex items-center gap-2">
                            <Link to={`/bills/${item.id}`} className="font-semibold text-sm hover:underline">
                                {item.bill_number}
                            </Link>
                            {item.is_test && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                                    <TestTube className="h-3 w-3" />
                                    Test
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customer Name */}
                    <div className="min-w-[120px]">
                        <div className="font-medium text-sm">{item.work_order?.quotation?.customer?.name || item.quotation?.customer?.name || 'N/A'}</div>
                    </div>

                    {/* Quote & Work Order Numbers */}
                    <div className="min-w-[180px] text-sm text-muted-foreground">
                        <div>Quote: {item.work_order?.quotation?.quotation_number || item.quotation?.quotation_number || 'N/A'}</div>
                        <div>Work Order: {item.work_order?.work_order_number || 'N/A'}</div>
                        <div>Bill Date: {new Date(item.bill_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        })}</div>
                    </div>

                    {/* Total Amount Only */}
                    <div className="min-w-[100px] text-sm">
                        <div className="font-semibold">₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.preventDefault();
                            handleDownload(item.id, item.bill_number);
                        }}
                        className="gap-1 h-8"
                    >
                        <Download className="h-3 w-3" />
                        Download
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.preventDefault();
                            handlePrint(item.id);
                        }}
                        className="gap-1 h-8"
                    >
                        <Printer className="h-3 w-3" />
                        Print
                    </Button>
                    <Link to={`/bills/${item.id}`}>
                        <Button size="sm" variant="outline" className="gap-1 h-8">
                            <Eye className="h-3 w-3" />
                            View
                        </Button>
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Bills</h1>
                    <p className="text-muted-foreground">Manage your bills and payments</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        Export
                    </Button>
                    <Link to="/bills/test-mode">
                        <Button variant="outline" size="sm" className="gap-1">
                            <TestTube className="h-4 w-4" />
                            Test Mode
                        </Button>
                    </Link>
                    <Link to="/work-orders/convert-to-bills">
                        <Button variant="outline" size="sm" className="gap-1">
                            <FileText className="h-4 w-4" />
                            Convert Work Orders
                        </Button>
                    </Link>
                    <Link to="/bills/create">
                        <Button size="sm" className="gap-1">
                            <Plus className="h-4 w-4" />
                            New Bill
                        </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search bills..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={dateFilter} onValueChange={handleDateFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={testModeFilter} onValueChange={handleTestModeFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Bills</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="test">Test Bills</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => listQuery.refetch()}
                    className="gap-1"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 md:grid-cols-2">
                <Card className="p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Total Bills</div>
                            <div className="text-xl font-semibold">
                                {listQuery.isLoading ? <Skeleton className="h-6 w-10" /> : stats.total}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card className="p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-muted-foreground">Total Value (₹)</div>
                            <div className="text-xl font-semibold">
                                {stats.totalValue.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Status summary cards removed as requested */}

            {/* Bills List - Compact Table View */}
            <div className="space-y-1">
                {listQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-2 border rounded-lg">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-8 w-16 ml-auto" />
                            </div>
                        </div>
                    ))
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8">
                        <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            {searchTerm || dateFilter !== "all"
                                ? "No bills found matching your criteria."
                                : "No bills found."
                            }
                        </p>
                        <Link to="/work-orders/convert-to-bills">
                            <Button className="mt-3 gap-1">
                                <FileText className="h-4 w-4" />
                                Convert Work Orders to Bills
                            </Button>
                        </Link>
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <BillItem key={item.id} item={item} />
                    ))
                )}
            </div>
        </div>
    );
}
