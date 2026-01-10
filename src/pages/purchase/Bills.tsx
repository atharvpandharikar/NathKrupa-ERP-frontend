import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import {
    Plus,
    Search,
    FileText,
    Calendar,
    DollarSign,
    User,
    ChevronsLeft,
    ChevronsRight,
    Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { purchaseApi, type PurchaseBill } from "@/lib/api";

export default function Bills() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [billsData, setBillsData] = useState<PurchaseBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<{
        current_page: number;
        total_pages: number;
        page_size: number;
        count: number;
        next: string | null;
        previous: string | null;
    } | null>(null);
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

    // Fetch bills with pagination
    const fetchBills = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = {
                page: currentPage,
                page_size: pageSize,
            };
            
            if (searchTerm && searchTerm.trim()) {
                // Use search API for search terms
                const searchResponse = await purchaseApi.bills.search(searchTerm) as any;
                setBillsData(searchResponse.results || []);
                setPagination(null); // Search doesn't return pagination
            } else {
                // Use list API with pagination
                const response = await purchaseApi.bills.list(params) as any;
                
                // Handle new pagination format
                if (response.pagination) {
                    setBillsData(response.results || []);
                    setPagination({
                        current_page: response.pagination.current_page || currentPage,
                        total_pages: response.pagination.total_pages || 1,
                        page_size: response.pagination.page_size || pageSize,
                        count: response.pagination.count || 0,
                        next: response.pagination.next || null,
                        previous: response.pagination.previous || null,
                    });
                } else if (response.results) {
                    // Fallback for old format
                    setBillsData(response.results || []);
                    setPagination({
                        current_page: currentPage,
                        total_pages: Math.ceil((response.count || response.results.length) / pageSize),
                        page_size: pageSize,
                        count: response.count || response.results.length,
                        next: response.next || null,
                        previous: response.previous || null,
                    });
                } else {
                    // Direct array response
                    const billsArray = Array.isArray(response) ? response : [];
                    setBillsData(billsArray);
                    setPagination({
                        current_page: 1,
                        total_pages: 1,
                        page_size: pageSize,
                        count: billsArray.length,
                        next: null,
                        previous: null,
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch bills:', error);
            setBillsData([]);
            setPagination(null);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm]);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);

    // Reset to page 1 when search term changes
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [searchTerm]);

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
                    <CardTitle>
                        All Purchase Bills ({pagination?.count || billsData.length})
                        {pagination && pagination.total_pages > 1 && (
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                (Page {pagination.current_page} of {pagination.total_pages})
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
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
                                        {billsData.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No bills found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            billsData.map((bill) => (
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
                                                            {bill.vendor?.name || 'N/A'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-gray-400" />
                                                            {formatDate(bill.bill_date)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-center">{bill.items_count || 0}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{formatCurrency(bill.total_amount || 0)}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">{formatCurrency(bill.discount || 0)}</div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {pagination && pagination.count > 0 && (
                                <div className="border-t pt-4 mt-4">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-sm text-muted-foreground">
                                            Showing{' '}
                                            <span className="font-medium">
                                                {pagination.count > 0 ? ((pagination.current_page - 1) * pagination.page_size) + 1 : 0}
                                            </span>{' '}
                                            to{' '}
                                            <span className="font-medium">
                                                {Math.min(pagination.current_page * pagination.page_size, pagination.count)}
                                            </span>{' '}
                                            of{' '}
                                            <span className="font-medium">{pagination.count}</span>{' '}
                                            bills
                                        </div>

                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationLink
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCurrentPage(1);
                                                        }}
                                                        className={pagination.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                                        aria-label="First page"
                                                    >
                                                        <ChevronsLeft className="h-4 w-4" />
                                                    </PaginationLink>
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (pagination.current_page > 1) setCurrentPage(pagination.current_page - 1);
                                                        }}
                                                        className={!pagination.previous || pagination.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>
                                                
                                                {/* Page Numbers */}
                                                {(() => {
                                                    const MAX_PAGES_TO_SHOW = 5;
                                                    let start = Math.max(pagination.current_page - Math.floor(MAX_PAGES_TO_SHOW / 2), 1);
                                                    const end = Math.min(start + MAX_PAGES_TO_SHOW - 1, pagination.total_pages);
                                                    if (end - start < MAX_PAGES_TO_SHOW - 1) {
                                                        start = Math.max(end - MAX_PAGES_TO_SHOW + 1, 1);
                                                    }
                                                    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
                                                        (pageNum) => (
                                                            <PaginationItem key={pageNum}>
                                                                <PaginationLink
                                                                    href="#"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setCurrentPage(pageNum);
                                                                    }}
                                                                    isActive={pagination.current_page === pageNum}
                                                                >
                                                                    {pageNum}
                                                                </PaginationLink>
                                                            </PaginationItem>
                                                        )
                                                    );
                                                })()}

                                                {pagination.total_pages > 5 && pagination.current_page + 2 < pagination.total_pages && (
                                                    <PaginationItem>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                )}

                                                <PaginationItem>
                                                    <PaginationNext
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (pagination.current_page < pagination.total_pages) setCurrentPage(pagination.current_page + 1);
                                                        }}
                                                        className={!pagination.next || pagination.current_page === pagination.total_pages ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <PaginationLink
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCurrentPage(pagination.total_pages);
                                                        }}
                                                        className={pagination.current_page === pagination.total_pages ? 'pointer-events-none opacity-50' : ''}
                                                        aria-label="Last page"
                                                    >
                                                        <ChevronsRight className="h-4 w-4" />
                                                    </PaginationLink>
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
