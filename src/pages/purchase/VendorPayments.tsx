import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    ArrowLeft,
    Search,
    Filter,
    Plus,
    DollarSign,
    Calendar,
    FileText,
    CreditCard,
    ChevronsLeft,
    ChevronsRight,
    Loader2,
    Eye
} from "lucide-react";
import { purchaseApi, type PurchasePayment, type Vendor } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { safeNumber } from "@/lib/utils";

export default function VendorPayments() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [payments, setPayments] = useState<PurchasePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMode, setFilterMode] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [pagination, setPagination] = useState<{
        current_page: number;
        total_pages: number;
        page_size: number;
        count: number;
        next: string | null;
        previous: string | null;
    } | null>(null);

    // Fetch payments with pagination
    const fetchPayments = useCallback(async () => {
        try {
            setLoading(true);
            
            if (id) {
                // Vendor-specific payments
                const vendorId = parseInt(id);
                if (isNaN(vendorId)) {
                    toast({ title: 'Invalid vendor ID', variant: 'destructive' });
                    navigate('/purchase/vendors');
                    return;
                }

                // Fetch vendor details
                const vendorData = await purchaseApi.vendors.get(vendorId);
                setVendor(vendorData);

                // Fetch payments for this vendor
                const paymentsData = await purchaseApi.vendors.payments(vendorId);
                setPayments(Array.isArray(paymentsData) ? paymentsData : []);
                setPagination(null);
            } else {
                // All payments with pagination
                const params: Record<string, any> = {
                    page: currentPage,
                    page_size: pageSize,
                };

                const response = await purchaseApi.payments.list(params) as any;
                
                // Handle new pagination format
                if (response.pagination) {
                    setPayments(response.results || []);
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
                    setPayments(response.results || []);
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
                    const paymentsArray = Array.isArray(response) ? response : [];
                    setPayments(paymentsArray);
                    setPagination({
                        current_page: 1,
                        total_pages: 1,
                        page_size: pageSize,
                        count: paymentsArray.length,
                        next: null,
                        previous: null,
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch payments:', error);
            toast({
                title: "Error",
                description: "Failed to fetch payments. Please try again.",
                variant: "destructive",
            });
            setPayments([]);
            setPagination(null);
        } finally {
            setLoading(false);
        }
    }, [id, currentPage, pageSize, toast, navigate]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    // Reset to page 1 when search term or filter changes
    useEffect(() => {
        if (currentPage !== 1 && !id) {
            setCurrentPage(1);
        }
    }, [searchTerm, filterMode, id]);

    // Client-side filtering only for vendor-specific payments (when id exists)
    const filteredPayments = id ? payments.filter(payment => {
        if (searchTerm) {
            const matchesSearch = 
                payment.mode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.bill?.bill_number?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
        }
        if (filterMode !== "all") {
            if (payment.mode !== filterMode) return false;
        }
        return true;
    }) : payments;

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

    const getModeColor = (mode: string) => {
        const modeLower = mode.toLowerCase();
        switch (modeLower) {
            case 'cash': return 'bg-green-100 text-green-800';
            case 'bank':
            case 'bank_transfer': return 'bg-blue-100 text-blue-800';
            case 'cheque': return 'bg-purple-100 text-purple-800';
            case 'upi': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const totalAmount = filteredPayments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    // Render all payments page (no vendor ID)
    if (!id) {
        return (
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Vendor Payments</h1>
                        <p className="text-gray-600 mt-1">Track and manage all vendor payments</p>
                    </div>
                    <Button onClick={() => navigate('/purchase/payments/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payment
                    </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{pagination?.count || payments.length}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(payments.reduce((sum, p) => sum + safeNumber(p.amount), 0))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Unallocated</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {formatCurrency(payments.reduce((sum, p) => sum + safeNumber(p.unallocated_amount || 0), 0))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search payments by bill number, vendor, or note..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <select
                                value={filterMode}
                                onChange={(e) => setFilterMode(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="all">All Modes</option>
                                <option value="Cash">Cash</option>
                                <option value="Bank">Bank</option>
                                <option value="UPI">UPI</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* Payments Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            All Payments ({pagination?.count || payments.length})
                            {pagination && pagination.total_pages > 1 && (
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                    (Page {pagination.current_page} of {pagination.total_pages})
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bill Number</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payment Date</TableHead>
                                        <TableHead>Mode</TableHead>
                                        <TableHead>Allocated</TableHead>
                                        <TableHead>Unallocated</TableHead>
                                        <TableHead>Note</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                No payments found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map((payment) => (
                                            <TableRow key={payment.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {payment.bill?.bill_number || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-gray-400" />
                                                        {payment.vendor?.name || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-green-600">
                                                        {formatCurrency(safeNumber(payment.amount))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-gray-400" />
                                                        {formatDate(payment.payment_date)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getModeColor(payment.mode)}>
                                                        {payment.mode}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-green-600">
                                                        {formatCurrency(safeNumber(payment.allocated_amount || 0))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-orange-600">
                                                        {formatCurrency(safeNumber(payment.unallocated_amount || 0))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-gray-600 max-w-xs truncate">
                                                        {payment.note || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => navigate(`/purchase/payments/${payment.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
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
                                        payments
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
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render vendor-specific payments page
    if (!vendor) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Vendor not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/purchase/vendors/${id}`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Vendor
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
                    <p className="text-gray-600 mt-1">Payment History</p>
                </div>
                <Button onClick={() => navigate(`/purchase/vendors/${id}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                </Button>
            </div>

            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Payment Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalAmount)}
                            </div>
                            <div className="text-sm text-gray-600">Total Payments</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {filteredPayments.length}
                            </div>
                            <div className="text-sm text-gray-600">Payment Count</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {formatCurrency(filteredPayments.length > 0 ? totalAmount / filteredPayments.length : 0)}
                            </div>
                            <div className="text-sm text-gray-600">Average Payment</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search payments..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={filterMode}
                                onChange={(e) => setFilterMode(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="all">All Modes</option>
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                                <option value="upi">UPI</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payments List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        All Payments ({filteredPayments.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredPayments.length > 0 ? filteredPayments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-green-100 rounded-full">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            <Badge className={getModeColor(payment.mode)}>
                                                {payment.mode.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            {payment.bill && (
                                                <span className="text-sm text-gray-600">
                                                    Bill: {payment.bill.bill_number}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(payment.payment_date)}
                                        </div>
                                        {payment.note && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                {payment.note}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-semibold text-green-600">
                                        {formatCurrency(safeNumber(payment.amount))}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {safeNumber(payment.unallocated_amount) > 0 ?
                                            `Unallocated: ${formatCurrency(safeNumber(payment.unallocated_amount))}` :
                                            'Fully Allocated'
                                        }
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 text-gray-500">
                                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <div className="text-lg font-medium">No payments found</div>
                                <div className="text-sm">No payments match your current filters</div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}