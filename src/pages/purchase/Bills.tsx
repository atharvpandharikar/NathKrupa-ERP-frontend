import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOptimizedPurchaseBills } from "@/hooks/useOptimizedData";
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
    FileText,
    Calendar,
    DollarSign,
    User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { purchaseApi, type PurchaseBill } from "@/lib/api";

export default function Bills() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const { bills: billsData, loading, error: billsError } = useOptimizedPurchaseBills(searchTerm);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const wasInputFocusedRef = useRef(false);
    const [dashboardStats, setDashboardStats] = useState({
        total_bills: 0,
        total_amount: 0,
        paid_amount: 0,
        outstanding_amount: 0
    });
    const [vendorStats, setVendorStats] = useState<Record<number, {
        vendor_name: string;
        total_outstanding: number;
        unallocated_payments: number;
    }>>({});

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch dashboard stats only
                const statsResponse = await purchaseApi.dashboardStats() as any;
                setDashboardStats({
                    total_bills: statsResponse.total_bills || 0,
                    total_amount: statsResponse.total_amount || 0,
                    paid_amount: statsResponse.paid_amount || 0,
                    outstanding_amount: statsResponse.outstanding_amount || 0
                });
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };
        fetchStats();
    }, []);

    // Fetch vendor stats separately to avoid blocking input (debounced)
    useEffect(() => {
        if (billsData.length === 0) {
            setVendorStats({});
            return;
        }
        
        const fetchVendorStats = async () => {
            const uniqueVendorIds = [...new Set(billsData.map(bill => bill.vendor?.id || bill.vendor))];
            const vendorStatsMap: Record<number, {
                vendor_name: string;
                total_outstanding: number;
                unallocated_payments: number;
            }> = {};
            
            for (const vendorId of uniqueVendorIds) {
                if (vendorId) {
                    try {
                        const vendorResponse = await purchaseApi.vendors.paymentSummary(vendorId);
                        vendorStatsMap[vendorId] = {
                            vendor_name: vendorResponse.vendor_name,
                            total_outstanding: vendorResponse.total_outstanding,
                            unallocated_payments: vendorResponse.unallocated_payments
                        };
                    } catch (error) {
                        console.error(`Failed to fetch stats for vendor ${vendorId}:`, error);
                    }
                }
            }
            setVendorStats(vendorStatsMap);
        };
        
        // Use a delay to avoid blocking the input during rapid typing
        const timer = setTimeout(fetchVendorStats, 300);
        return () => clearTimeout(timer);
    }, [billsData, searchTerm]);

    // Restore focus synchronously after vendorStats state updates
    useLayoutEffect(() => {
        if (wasInputFocusedRef.current && searchInputRef.current) {
            searchInputRef.current.focus();
            const len = searchTerm.length;
            searchInputRef.current.setSelectionRange(len, len);
        }
    }, [vendorStats, searchTerm]);

    // No client-side filtering needed - backend Typesense handles search
    const filteredBills = billsData;


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Use dashboard stats instead of calculating from bills
    const totalBills = dashboardStats.total_bills;
    const totalAmount = dashboardStats.total_amount;
    const outstandingAmount = dashboardStats.outstanding_amount;
    const paidAmount = dashboardStats.paid_amount;

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading Purchase Bills...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Purchase Bills</h1>
                    <p className="text-gray-600 mt-1">Manage purchase bills and payments</p>
                </div>
                <Button onClick={() => navigate('/purchase/bills/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Bill
                </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBills}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(outstandingAmount)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="flex flex-col">
                                <label className="text-xs text-muted-foreground mb-1">Search</label>
                                <input
                                    ref={searchInputRef}
                                    className="h-9 rounded-md border bg-background px-3 text-sm"
                                    placeholder="Search bills by number or vendor..."
                                    aria-label="Search bills"
                                    value={searchTerm}
                                    onFocus={() => { wasInputFocusedRef.current = true; }}
                                    onBlur={() => { wasInputFocusedRef.current = false; }}
                                    onChange={(e) => {
                                        wasInputFocusedRef.current = true;
                                        setSearchTerm(e.target.value);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bills Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Purchase Bills ({filteredBills.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bill Number</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total Amount</TableHead>
                                    <TableHead>Discount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBills.map((bill) => (
                                    <TableRow
                                        key={bill.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => navigate(`/purchase/bills/${bill.id}`)}
                                    >
                                        <TableCell>
                                            <div className="font-medium">{bill.bill_number}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-gray-400" />
                                                {bill.vendor.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                {formatDate(bill.bill_date)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-center">{bill.items_count}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{formatCurrency(bill.total_amount || 0)}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{formatCurrency(bill.discount || 0)}</div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
