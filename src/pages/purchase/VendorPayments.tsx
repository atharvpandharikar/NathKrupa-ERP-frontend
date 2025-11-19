import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    Search,
    Filter,
    Plus,
    DollarSign,
    Calendar,
    FileText,
    CreditCard
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
    const [filteredPayments, setFilteredPayments] = useState<PurchasePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMode, setFilterMode] = useState("all");

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            try {
                setLoading(true);
                
                // Validate id is a valid number
                const vendorId = parseInt(id);
                if (isNaN(vendorId)) {
                    toast({ title: 'Invalid vendor ID', variant: 'destructive' });
                    navigate('/purchase/vendors');
                    return;
                }

                // Fetch vendor details
                const vendorData = await purchaseApi.vendors.get(vendorId);
                setVendor(vendorData);

                // Fetch payments
                const paymentsData = await purchaseApi.vendors.payments(vendorId);
                setPayments(paymentsData);
                setFilteredPayments(paymentsData);

            } catch (error) {
                console.error('Failed to fetch vendor payments:', error);
                toast({
                    title: "Error",
                    description: "Failed to fetch vendor payments. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, toast]);

    useEffect(() => {
        let filtered = payments;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(payment =>
                payment.mode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.bill?.bill_number?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by mode
        if (filterMode !== "all") {
            filtered = filtered.filter(payment => payment.mode === filterMode);
        }

        setFilteredPayments(filtered);
    }, [payments, searchTerm, filterMode]);

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
        switch (mode) {
            case 'cash': return 'bg-green-100 text-green-800';
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
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading Payments...</div>
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