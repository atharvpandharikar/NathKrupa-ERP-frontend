import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    Calendar,
    DollarSign,
    CreditCard,
    FileText,
    User,
    Building,
    Loader2,
    Eye,
    Download,
} from "lucide-react";
import { purchaseApi, type PurchasePayment, type PurchaseBill } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { safeNumber } from "@/lib/utils";

export default function PaymentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [payment, setPayment] = useState<PurchasePayment | null>(null);
    const [bill, setBill] = useState<PurchaseBill | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPayment = async () => {
            if (!id) return;

            try {
                setLoading(true);
                const paymentId = parseInt(id);
                if (isNaN(paymentId)) {
                    toast({ title: 'Invalid payment ID', variant: 'destructive' });
                    navigate('/purchase/vendor-payments');
                    return;
                }

                const paymentData = await purchaseApi.payments.get(paymentId);
                setPayment(paymentData);

                // Try to fetch full bill details if bill ID is available (optional - payment response may already have bill info)
                if (paymentData.bill) {
                    const billId = typeof paymentData.bill === 'number' ? paymentData.bill : (paymentData.bill as any)?.id;
                    if (billId && !isNaN(billId)) {
                        try {
                            const billData = await purchaseApi.bills.get(billId);
                            setBill(billData);
                        } catch (error) {
                            console.error('Failed to fetch bill:', error);
                            // Payment API response already contains bill_number and other info, so we can continue
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch payment:', error);
                toast({
                    title: "Error",
                    description: "Failed to load payment details. Please try again.",
                    variant: "destructive",
                });
                navigate('/purchase/vendor-payments');
            } finally {
                setLoading(false);
            }
        };

        fetchPayment();
    }, [id, navigate, toast]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

    const handleDownloadAttachment = async () => {
        if (!payment?.attachment) return;

        try {
            const tokens = JSON.parse(localStorage.getItem('nk:tokens') || '{}');
            const response = await fetch(payment.attachment, {
                headers: {
                    'Authorization': `Bearer ${tokens.access || ''}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download attachment');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `payment-attachment-${payment.id}.${payment.attachment.split('.').pop()}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading attachment:', error);
            toast({
                title: "Error",
                description: "Failed to download attachment",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!payment) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Payment Not Found</h1>
                    <p className="text-muted-foreground mb-4">The payment you're looking for doesn't exist or has been removed.</p>
                    <Button onClick={() => navigate('/purchase/vendor-payments')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Payments
                    </Button>
                </div>
            </div>
        );
    }

    const billId = typeof payment.bill === 'number' ? payment.bill : (payment.bill as any)?.id;
    const vendorId = typeof payment.vendor === 'number' ? payment.vendor : (payment.vendor as any)?.id;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/purchase/vendor-payments')}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Payment Details</h1>
                        <p className="text-gray-600 mt-1">Payment ID: {payment.id}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Payment Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Payment Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm text-muted-foreground">Payment Amount</Label>
                                    <div className="text-2xl font-bold text-green-600 mt-1">
                                        {formatCurrency(safeNumber(payment.amount))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Payment Mode</Label>
                                    <div className="mt-1">
                                        <Badge className={getModeColor(payment.mode)}>
                                            {payment.mode}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Payment Date</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span className="font-medium">{formatDate(payment.payment_date)}</span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Created At</Label>
                                    <div className="mt-1 text-sm">
                                        {formatDateTime(payment.created_at)}
                                    </div>
                                </div>
                            </div>

                            {payment.note && (
                                <div>
                                    <Label className="text-sm text-muted-foreground">Note</Label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                        {payment.note}
                                    </div>
                                </div>
                            )}

                            {payment.attachment && (
                                <div>
                                    <Label className="text-sm text-muted-foreground">Attachment</Label>
                                    <div className="mt-1">
                                        <Button
                                            variant="outline"
                                            onClick={handleDownloadAttachment}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Attachment
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Allocation Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Allocation Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm text-muted-foreground">Allocated Amount</Label>
                                    <div className="text-xl font-semibold text-green-600 mt-1">
                                        {formatCurrency(safeNumber(payment.allocated_amount || 0))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm text-muted-foreground">Unallocated Amount</Label>
                                    <div className="text-xl font-semibold text-orange-600 mt-1">
                                        {formatCurrency(safeNumber(payment.unallocated_amount || 0))}
                                    </div>
                                </div>
                            </div>

                            {payment.bill_calculation && (
                                <div className="pt-4 border-t">
                                    <h4 className="font-semibold mb-3">Bill Calculation</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Old Paid Amount:</span>
                                            <span className="ml-2 font-medium">
                                                {formatCurrency(payment.bill_calculation.old_paid_amount || 0)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">New Paid Amount:</span>
                                            <span className="ml-2 font-medium text-green-600">
                                                {formatCurrency(payment.bill_calculation.new_paid_amount || 0)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Old Outstanding:</span>
                                            <span className="ml-2 font-medium">
                                                {formatCurrency(payment.bill_calculation.old_outstanding_amount || 0)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">New Outstanding:</span>
                                            <span className="ml-2 font-medium text-orange-600">
                                                {formatCurrency(payment.bill_calculation.new_outstanding_amount || 0)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Total Amount:</span>
                                            <span className="ml-2 font-medium">
                                                {formatCurrency(payment.bill_calculation.total_amount || 0)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Payment Count:</span>
                                            <span className="ml-2 font-medium">
                                                {payment.bill_calculation.payment_count || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Bill Details Card */}
                    {(billId || payment.bill_number) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5" />
                                    Bill Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Bill Number</Label>
                                        <div className="font-medium mt-1 text-lg">
                                            {payment.bill_number || bill?.bill_number || 'N/A'}
                                        </div>
                                    </div>
                                    
                                    {bill && (
                                        <>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Bill Date</Label>
                                                <div className="font-medium mt-1">
                                                    {formatDate(bill.bill_date)}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Bill Total</Label>
                                                <div className="font-medium mt-1">
                                                    {formatCurrency(safeNumber(bill.total_amount))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Discount</Label>
                                                <div className="font-medium mt-1">
                                                    {formatCurrency(safeNumber(bill.discount || 0))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Paid Amount</Label>
                                                <div className="font-medium text-green-600 mt-1">
                                                    {formatCurrency(safeNumber(bill.paid_amount || 0))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Outstanding</Label>
                                                <div className="font-medium text-orange-600 mt-1">
                                                    {formatCurrency(safeNumber(bill.outstanding_amount || 0))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Status</Label>
                                                <div className="mt-1">
                                                    <Badge variant={
                                                        bill.status === 'paid' ? 'default' :
                                                        bill.status === 'partial' ? 'secondary' :
                                                        'destructive'
                                                    }>
                                                        {bill.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {bill.items_count !== undefined && (
                                                <div>
                                                    <Label className="text-sm text-muted-foreground">Items Count</Label>
                                                    <div className="font-medium mt-1">
                                                        {bill.items_count}
                                                    </div>
                                                </div>
                                            )}
                                            {bill.vendor && (
                                                <div>
                                                    <Label className="text-sm text-muted-foreground">Vendor</Label>
                                                    <div className="font-medium mt-1">
                                                        {bill.vendor.name}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    {!bill && payment.bill_calculation && (
                                        <>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Bill Total</Label>
                                                <div className="font-medium mt-1">
                                                    {formatCurrency(payment.bill_calculation.total_amount || 0)}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Discount</Label>
                                                <div className="font-medium mt-1">
                                                    {formatCurrency(payment.bill_calculation.discount || 0)}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">New Paid Amount</Label>
                                                <div className="font-medium text-green-600 mt-1">
                                                    {formatCurrency(payment.bill_calculation.new_paid_amount || 0)}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">New Outstanding</Label>
                                                <div className="font-medium text-orange-600 mt-1">
                                                    {formatCurrency(payment.bill_calculation.new_outstanding_amount || 0)}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {billId && (
                                    <div className="pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => navigate(`/purchase/bills/${billId}`)}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Full Bill Details
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Allocations List */}
                    {payment.allocations && payment.allocations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Payment Allocations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {payment.allocations.map((allocation: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                                            <div>
                                                <div className="font-medium">Bill: {allocation.bill_number || 'N/A'}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Allocated: {formatCurrency(safeNumber(allocation.amount || 0))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Vendor Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Vendor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div>
                                    <Label className="text-sm text-muted-foreground">Vendor Name</Label>
                                    <div className="font-medium mt-1">
                                        {payment.vendor_name || 'N/A'}
                                    </div>
                                </div>
                                {vendorId && (
                                    <Button
                                        variant="outline"
                                        className="w-full mt-4"
                                        onClick={() => navigate(`/purchase/vendors/${vendorId}`)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Vendor
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bill Information */}
                    {(billId || payment.bill_number) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5" />
                                    Bill Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Bill Number</Label>
                                        <div className="font-medium mt-1">
                                            {payment.bill_number || bill?.bill_number || 'N/A'}
                                        </div>
                                    </div>
                                    
                                    {bill ? (
                                        <>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Bill Date</Label>
                                                <div className="font-medium mt-1">
                                                    {formatDate(bill.bill_date)}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Bill Total</Label>
                                                <div className="font-medium mt-1">
                                                    {formatCurrency(safeNumber(bill.total_amount))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Discount</Label>
                                                <div className="font-medium mt-1">
                                                    {formatCurrency(safeNumber(bill.discount || 0))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Paid Amount</Label>
                                                <div className="font-medium text-green-600 mt-1">
                                                    {formatCurrency(safeNumber(bill.paid_amount || 0))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Outstanding</Label>
                                                <div className="font-medium text-orange-600 mt-1">
                                                    {formatCurrency(safeNumber(bill.outstanding_amount || 0))}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Status</Label>
                                                <div className="mt-1">
                                                    <Badge variant={
                                                        bill.status === 'paid' ? 'default' :
                                                        bill.status === 'partial' ? 'secondary' :
                                                        'destructive'
                                                    }>
                                                        {bill.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {bill.items_count !== undefined && (
                                                <div>
                                                    <Label className="text-sm text-muted-foreground">Items Count</Label>
                                                    <div className="font-medium mt-1">
                                                        {bill.items_count}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : payment.bill_calculation ? (
                                        <>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Bill Total</Label>
                                                <div className="font-medium mt-1">
                                                    {formatCurrency(payment.bill_calculation.total_amount || 0)}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">Discount</Label>
                                                <div className="font-medium mt-1">
                                                    {formatCurrency(payment.bill_calculation.discount || 0)}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">New Paid Amount</Label>
                                                <div className="font-medium text-green-600 mt-1">
                                                    {formatCurrency(payment.bill_calculation.new_paid_amount || 0)}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm text-muted-foreground">New Outstanding</Label>
                                                <div className="font-medium text-orange-600 mt-1">
                                                    {formatCurrency(payment.bill_calculation.new_outstanding_amount || 0)}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}

                                    {billId && (
                                        <Button
                                            variant="outline"
                                            className="w-full mt-4"
                                            onClick={() => navigate(`/purchase/bills/${billId}`)}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            View Full Bill Details
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
