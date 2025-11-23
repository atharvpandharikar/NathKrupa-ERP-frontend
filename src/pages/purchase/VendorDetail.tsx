import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Edit,
    Phone,
    Mail,
    MapPin,
    Star,
    FileText,
    CreditCard,
    Building2,
    Eye,
    Trash2,
    DollarSign,
    TrendingUp,
    TrendingDown
} from "lucide-react";
import { purchaseApi, type Vendor, type PurchasePayment, type PurchaseBill } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import TransactionForm from "@/components/TransactionForm";
import { safeNumber } from "@/lib/utils";

interface VendorStats {
    totalBills: number;
    totalAmount: number;
    outstandingAmount: number;
    recentBills: Array<{
        id: number;
        billNumber: string;
        amount: number;
        date: string;
        status: 'paid' | 'partial' | 'outstanding';
    }>;
}

interface PaymentSummary {
    vendor_id: number;
    vendor_name: string;
    total_bill_amount: number;
    total_paid_amount: number;
    total_outstanding: number;
    unallocated_payments: number;
    available_for_allocation: number;
}


export default function VendorDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [stats, setStats] = useState<VendorStats | null>(null);
    const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
    const [payments, setPayments] = useState<PurchasePayment[]>([]);
    const [outstandingBills, setOutstandingBills] = useState<PurchaseBill[]>([]);
    const [loading, setLoading] = useState(true);
    const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);

    useEffect(() => {
        const fetchVendorData = async () => {
            if (!id) return;
            
            // Validate id is a valid number
            const vendorId = parseInt(id);
            if (isNaN(vendorId)) {
                toast({ title: 'Invalid vendor ID', variant: 'destructive' });
                navigate('/purchase/vendors');
                return;
            }

            try {
                setLoading(true);

                // Fetch vendor details
                const vendorData = await purchaseApi.vendors.get(vendorId);
                setVendor(vendorData);

                // Fetch payment summary from backend
                const paymentSummaryData = await purchaseApi.vendors.paymentSummary(vendorId);
                setPaymentSummary(paymentSummaryData);

                // Fetch vendor bills for stats
                const billsData = await purchaseApi.vendors.bills(vendorId);

                // Calculate stats
                const totalBills = billsData.length;
                const recentBills = billsData.slice(0, 5).map(bill => ({
                    id: bill.id,
                    billNumber: bill.bill_number,
                    amount: bill.total_amount,
                    date: bill.bill_date,
                    status: bill.status
                }));

                setStats({
                    totalBills,
                    totalAmount: paymentSummaryData.total_bill_amount,
                    outstandingAmount: paymentSummaryData.total_outstanding,
                    recentBills
                });

                // Fetch payments and outstanding bills
                const paymentsData = await purchaseApi.vendors.payments(vendorId);
                const outstandingBillsData = await purchaseApi.vendors.outstandingBills(vendorId);

                setPayments(paymentsData);
                setOutstandingBills(outstandingBillsData);

            } catch (error) {
                console.error('Failed to fetch vendor data:', error);
                toast({
                    title: "Error",
                    description: "Failed to fetch vendor details. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchVendorData();
    }, [id, toast]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partial': return 'bg-yellow-100 text-yellow-800';
            case 'pending': return 'bg-blue-100 text-blue-800';
            case 'outstanding': return 'bg-blue-100 text-blue-800'; // Keep for backward compatibility
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };


    const handleTransactionSuccess = async () => {
        // Refresh vendor data after successful transaction
        if (!id) return;
        
        // Validate id is a valid number
        const vendorId = parseInt(id);
        if (isNaN(vendorId)) return;

        try {
            const paymentSummaryData = await purchaseApi.vendors.paymentSummary(vendorId);
            const paymentsData = await purchaseApi.vendors.payments(vendorId);
            const outstandingBillsData = await purchaseApi.vendors.outstandingBills(vendorId);

            setPaymentSummary(paymentSummaryData);
            setPayments(paymentsData);
            setOutstandingBills(outstandingBillsData);

            // Update stats
            setStats(prev => prev ? {
                ...prev,
                totalAmount: paymentSummaryData.total_bill_amount,
                outstandingAmount: paymentSummaryData.total_outstanding,
            } : null);

            toast({
                title: "Success",
                description: "Transaction created and payment tracked successfully.",
            });
        } catch (error) {
            console.error('Failed to refresh data after transaction:', error);
        }
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
            />
        ));
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading Vendor Details...</div>
                </div>
            </div>
        );
    }

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
                    onClick={() => navigate('/purchase/vendors')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Vendors
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
                    <p className="text-gray-600 mt-1">Vendor Details</p>
                </div>
                <Button onClick={() => navigate(`/purchase/vendors/${vendor.id}/edit`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Vendor
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalBills || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bill Amount</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(paymentSummary?.total_bill_amount || 0)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(paymentSummary?.total_paid_amount || 0)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(paymentSummary?.total_outstanding || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Actions */}
            <div className="flex gap-4">
                <Button
                    onClick={() => setTransactionDialogOpen(true)}
                    className="flex items-center gap-2"
                >
                    <DollarSign className="h-4 w-4" />
                    Create Finance Transaction
                </Button>

                <Button
                    variant="outline"
                    onClick={() => navigate(`/purchase/vendors/${id}/payments`)}
                    className="flex items-center gap-2"
                >
                    <Eye className="h-4 w-4" />
                    View All Payments
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vendor Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Vendor Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-600">Name</label>
                            <div className="text-lg font-semibold">{vendor.name}</div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">GST Number</label>
                            <div className="font-mono text-sm">{vendor.gst_number}</div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Email</label>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                {vendor.email}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Priority</label>
                            <div>
                                <Badge className={getPriorityColor(vendor.priority)}>
                                    {vendor.priority}
                                </Badge>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Created</label>
                            <div className="text-sm">{new Date(vendor.created_at).toLocaleDateString()}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contacts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Phone className="h-5 w-5" />
                            Contacts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {vendor.contacts.map((contact, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <div className="font-medium">{contact.name}</div>
                                        <div className="text-sm text-gray-600 flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {contact.mobile_number}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Addresses */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Addresses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {vendor.addresses.map((address, index) => (
                                <div key={index} className="p-3 border rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                        <div className="text-sm">{address.address}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Bank Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Bank Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {vendor.bank_details.map((bank, index) => (
                                <div key={index} className="p-3 border rounded-lg">
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-sm font-medium text-gray-600">Bank Name</label>
                                            <div className="text-sm">{bank.bank_name}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600">IFSC Code</label>
                                            <div className="font-mono text-sm">{bank.ifsc_code}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600">Branch</label>
                                            <div className="text-sm">{bank.branch}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600">Account Number</label>
                                            <div className="font-mono text-sm">{bank.account_number}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Outstanding Bills */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Outstanding Bills
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/purchase/bills')}
                        >
                            View All Bills
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {outstandingBills.length > 0 ? outstandingBills.slice(0, 5).map((bill) => (
                            <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                    <div className="font-medium">{bill.bill_number}</div>
                                    <div className="text-sm text-gray-600">{bill.bill_date}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium">{formatCurrency(bill.total_amount)}</div>
                                    <div className="text-sm text-red-600">
                                        Outstanding: {formatCurrency(bill.outstanding_amount)}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/purchase/bills/${bill.id}`)}
                                >
                                    View
                                </Button>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-gray-500">
                                No outstanding bills
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Payment History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Recent Payments
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/purchase/vendors/${id}/payments`)}
                        >
                            View All Payments
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {payments.length > 0 ? payments.slice(0, 5).map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                    <div className="font-medium">{payment.mode.replace('_', ' ').toUpperCase()}</div>
                                    <div className="text-sm text-gray-600">{payment.payment_date}</div>
                                    {payment.note && (
                                        <div className="text-xs text-gray-500 mt-1">{payment.note}</div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-green-600">{formatCurrency(safeNumber(payment.amount))}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {payment.bill ? `Bill: ${payment.bill.bill_number}` : 'Vendor Payment'}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-gray-500">
                                No payments found
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Bills */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Recent Bills
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/purchase/bills')}
                        >
                            View All Bills
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {stats?.recentBills.map((bill) => (
                            <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                    <div className="font-medium">{bill.billNumber}</div>
                                    <div className="text-sm text-gray-600">{bill.date}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium">{formatCurrency(bill.amount)}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {bill.status === 'outstanding' || (bill.status as any) === 'pending' ? 'Pending' : bill.status}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/purchase/bills/${bill.id}`)}
                                >
                                    View
                                </Button>
                            </div>
                        )) || (
                                <div className="text-center py-8 text-gray-500">
                                    No recent bills found
                                </div>
                            )}
                    </div>
                </CardContent>
            </Card>

            {/* Transaction Form Dialog */}
            <TransactionForm
                isOpen={transactionDialogOpen}
                onClose={() => setTransactionDialogOpen(false)}
                onSuccess={handleTransactionSuccess}
                vendorId={vendor?.id}
                vendorName={vendor?.name}
                title="Create Finance Transaction"
                description={`Create a finance transaction for ${vendor?.name} payment`}
                prefillData={{
                    purpose: `Payment to ${vendor?.name}`,
                    transaction_type: "Debit"
                }}
            />
        </div>
    );
}
