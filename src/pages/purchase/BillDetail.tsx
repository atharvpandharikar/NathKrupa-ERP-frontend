import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft,
    Edit,
    FileText,
    Calendar,
    DollarSign,
    User,
    Package,
    CreditCard,
    Plus,
    Download,
    Save
} from "lucide-react";
import { purchaseApi, financeApi, type PurchaseBill, type PurchasePayment } from "@/lib/api";

// Using types from API
interface Account {
    id: number;
    nickname: string;
    account_name: string;
    account_type: string;
    credited_amount: number;
    debited_amount: number;
}

interface Vendor {
    id: number;
    name: string;
    gst_number: string;
    email: string;
    rating: number;
    priority: 'High' | 'Medium' | 'Low';
    created_at: string;
    updated_at: string;
}

export default function BillDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [bill, setBill] = useState<PurchaseBill | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        account: '',
        transaction_type: 'Debit',
        amount: 0,
        from_party: '',
        to_party: '',
        vendor: '',
        custom_vendor: '',
        purpose: '',
        bill_no: '',
        utr_number: '',
        time: new Date().toISOString().slice(0, 16),
        create_finance_transaction: true,
    });
    const [useCustomVendor, setUseCustomVendor] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        const fetchBill = async () => {
            if (!id) return;

            try {
                setLoading(true);
                const response = await purchaseApi.bills.get(parseInt(id));
                setBill(response);

                // Initialize payment form with bill data
                setPaymentForm(prev => ({
                    ...prev,
                    purpose: `Payment for bill ${response.bill_number} - ${response.vendor.name}`,
                    bill_no: response.bill_number,
                    to_party: response.vendor.name,
                    vendor: response.vendor.id.toString(), // Auto-select the bill's vendor
                }));
            } catch (error) {
                console.error('Failed to fetch bill:', error);
                setBill(null);
            } finally {
                setLoading(false);
            }
        };

        const fetchAccounts = async () => {
            try {
                // Handle pagination - accounts API returns paginated response
                const response = await financeApi.get<any>('/accounts/?limit=20&offset=0');
                // Extract results from paginated response or use array directly
                const accountsData = Array.isArray(response) ? response : (response.results || []);
                setAccounts(accountsData);
            } catch (error) {
                console.error('Error fetching accounts:', error);
            }
        };

        const fetchVendors = async () => {
            try {
                // Handle pagination - vendors API returns paginated response
                const response = await purchaseApi.vendors.list();
                // Extract results from paginated response or use array directly
                const vendorsData = Array.isArray(response) ? response : ((response as any).results || []);
                setVendors(vendorsData);
            } catch (error) {
                console.error('Error fetching vendors:', error);
                setVendors([]);
            }
        };

        fetchBill();
        fetchAccounts();
        fetchVendors();
    }, [id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partial': return 'bg-yellow-100 text-yellow-800';
            case 'outstanding': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentModeColor = (mode: string) => {
        switch (mode) {
            case 'Cash': return 'bg-green-100 text-green-800';
            case 'Bank': return 'bg-blue-100 text-blue-800';
            case 'UPI': return 'bg-purple-100 text-purple-800';
            case 'Credit': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

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

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bill) return;

        // Validate amount
        if (paymentForm.amount <= 0) {
            alert('Payment amount must be greater than zero.');
            return;
        }

        setPaymentLoading(true);
        try {
            // Create purchase payment
            const paymentData = {
                bill: bill.id,
                amount: paymentForm.amount,
                payment_date: paymentForm.time.slice(0, 10),
                mode: 'Bank', // Default mode since we're using finance transaction structure
                note: paymentForm.purpose,
            };

            // Add payment - backend now automatically recalculates amounts
            const paymentResponse = await purchaseApi.bills.addPayment(bill.id, paymentData);

            // Log the payment response with updated calculations
            console.log('Payment added with calculations:', paymentResponse);

            // Create finance transaction if enabled
            if (paymentForm.create_finance_transaction && paymentForm.account) {
                const transactionData = {
                    ...paymentForm,
                    account: parseInt(paymentForm.account),
                    amount: parseFloat(paymentForm.amount.toString()),
                    time: new Date(paymentForm.time).toISOString(),
                    // Handle vendor selection for debit transactions
                    ...(paymentForm.transaction_type === 'Debit' && {
                        ...(useCustomVendor && paymentForm.custom_vendor
                            ? { to_party: paymentForm.custom_vendor }
                            : paymentForm.vendor
                                ? {
                                    vendor: parseInt(paymentForm.vendor),
                                    to_party: paymentForm.to_party // Keep the to_party field
                                }
                                : {}
                        )
                    }),
                    // Clear party fields that shouldn't be sent
                    ...(paymentForm.transaction_type === 'Credit' && { to_party: '' }),
                };

                await financeApi.createTransactionWithImage(transactionData, selectedImage || undefined);
            }

            // Refresh bill data once - backend already calculated everything
            try {
                const updatedBill = await purchaseApi.bills.get(bill.id);
                setBill(updatedBill);
            } catch (error) {
                console.error('Error refreshing bill data:', error);
            }

            // Reset form and close dialog
            setPaymentForm({
                account: '',
                transaction_type: 'Debit',
                amount: 0,
                from_party: '',
                to_party: bill.vendor.name,
                vendor: bill.vendor.id.toString(), // Auto-select the bill's vendor
                custom_vendor: '',
                purpose: `Payment for bill ${bill.bill_number} - ${bill.vendor.name}`,
                bill_no: bill.bill_number,
                utr_number: '',
                time: new Date().toISOString().slice(0, 16),
                create_finance_transaction: true,
            });
            setSelectedImage(null);
            setImagePreview(null);
            setUseCustomVendor(false);
            setIsPaymentDialogOpen(false);
        } catch (error) {
            console.error('Error adding payment:', error);
            alert('Error adding payment');
        } finally {
            setPaymentLoading(false);
        }
    };

    const handlePaymentInputChange = (field: string, value: any) => {
        setPaymentForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading Bill Details...</div>
                </div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Bill not found</div>
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
                    onClick={() => navigate('/purchase/bills')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Bills
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{bill.bill_number}</h1>
                    <p className="text-gray-600 mt-1">Purchase Bill Details</p>
                </div>
                <div className="flex gap-2">
                    {bill.attachment && (
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    )}
                    <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Bill
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            try {
                                await purchaseApi.bills.recalculate(bill.id);
                                const updatedBill = await purchaseApi.bills.get(bill.id);
                                setBill(updatedBill);
                            } catch (error) {
                                console.error('Error recalculating amounts:', error);
                            }
                        }}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Recalculate
                    </Button>
                </div>
            </div>

            {/* Bill Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(bill.total_amount)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Discount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            -{formatCurrency(bill.discount)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(bill.paid_amount)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(bill.outstanding_amount)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bill Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Bill Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-600">Bill Number</label>
                            <div className="text-lg font-semibold">{bill.bill_number}</div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Bill Date</label>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {formatDate(bill.bill_date)}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Status</label>
                            <div>
                                <Badge className={getStatusColor(bill.status)}>
                                    {bill.status}
                                </Badge>
                            </div>
                        </div>

                        {bill.notes && (
                            <div>
                                <label className="text-sm font-medium text-gray-600">Notes</label>
                                <div className="text-sm p-3 bg-gray-50 rounded-lg">{bill.notes}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Vendor Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Vendor Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-600">Vendor Name</label>
                            <div className="text-lg font-semibold">{bill.vendor.name}</div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">GST Number</label>
                            <div className="font-mono text-sm">{bill.vendor.gst_number}</div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-600">Email</label>
                            <div className="text-sm">{bill.vendor.email}</div>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/purchase/vendors/${bill.vendor.id}`)}
                        >
                            View Vendor Details
                        </Button>
                    </CardContent>
                </Card>

                {/* Payment Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Payment Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {bill.outstanding_amount > 0 && (
                            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="w-full">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Payment
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Add Payment</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="account">Account *</Label>
                                                <Select value={paymentForm.account} onValueChange={(value) => handlePaymentInputChange('account', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select account" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(Array.isArray(accounts) ? accounts : []).map((account) => (
                                                            <SelectItem key={account.id} value={account.id.toString()}>
                                                                {account.nickname} ({account.account_type})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="transaction_type">Transaction Type *</Label>
                                                <Select value={paymentForm.transaction_type} onValueChange={(value) => handlePaymentInputChange('transaction_type', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Credit">Credit</SelectItem>
                                                        <SelectItem value="Debit">Debit</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="amount">Amount *</Label>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={paymentForm.amount}
                                                    onChange={(e) => handlePaymentInputChange('amount', parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    required
                                                />
                                                {paymentForm.amount <= 0 && (
                                                    <p className="text-sm text-red-600">Amount must be greater than zero</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="time">Date & Time *</Label>
                                                <Input
                                                    id="time"
                                                    type="datetime-local"
                                                    value={paymentForm.time}
                                                    onChange={(e) => handlePaymentInputChange('time', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="purpose">Purpose *</Label>
                                            <Textarea
                                                id="purpose"
                                                value={paymentForm.purpose}
                                                onChange={(e) => handlePaymentInputChange('purpose', e.target.value)}
                                                placeholder="Describe the purpose of this transaction"
                                                required
                                                rows={3}
                                            />
                                        </div>

                                        {/* Party fields based on transaction type */}
                                        {paymentForm.transaction_type === 'Credit' && (
                                            <div className="space-y-2">
                                                <Label htmlFor="from_party">From Party *</Label>
                                                <Input
                                                    id="from_party"
                                                    value={paymentForm.from_party}
                                                    onChange={(e) => handlePaymentInputChange('from_party', e.target.value)}
                                                    placeholder="Who is paying/sending money"
                                                    required
                                                />
                                            </div>
                                        )}

                                        {paymentForm.transaction_type === 'Debit' && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="vendor">Vendor *</Label>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="checkbox"
                                                                id="useCustomVendor"
                                                                checked={useCustomVendor}
                                                                onChange={(e) => {
                                                                    setUseCustomVendor(e.target.checked);
                                                                    if (e.target.checked) {
                                                                        // Clear vendor selection when using custom
                                                                        handlePaymentInputChange('vendor', '');
                                                                        handlePaymentInputChange('to_party', paymentForm.custom_vendor);
                                                                    } else {
                                                                        // Clear custom vendor when using vendor selection
                                                                        handlePaymentInputChange('custom_vendor', '');
                                                                        // Set to_party to selected vendor name
                                                                        const selectedVendor = vendors.find(v => v.id.toString() === paymentForm.vendor);
                                                                        if (selectedVendor) {
                                                                            handlePaymentInputChange('to_party', selectedVendor.name);
                                                                        }
                                                                    }
                                                                }}
                                                                className="rounded"
                                                            />
                                                            <Label htmlFor="useCustomVendor" className="text-sm">
                                                                Use custom vendor name
                                                            </Label>
                                                        </div>

                                                        {useCustomVendor ? (
                                                            <Input
                                                                id="custom_vendor"
                                                                value={paymentForm.custom_vendor}
                                                                onChange={(e) => {
                                                                    handlePaymentInputChange('custom_vendor', e.target.value);
                                                                    handlePaymentInputChange('to_party', e.target.value);
                                                                }}
                                                                placeholder="Enter vendor name"
                                                                required
                                                            />
                                                        ) : (
                                                            <Combobox
                                                                value={paymentForm.vendor}
                                                                onChange={(value) => {
                                                                    handlePaymentInputChange('vendor', value);
                                                                    // Auto-update to_party when vendor is selected
                                                                    const selectedVendor = vendors.find(v => v.id.toString() === value);
                                                                    if (selectedVendor) {
                                                                        handlePaymentInputChange('to_party', selectedVendor.name);
                                                                    }
                                                                }}
                                                                options={vendors.map(vendor => ({
                                                                    label: `${vendor.name} ${vendor.gst_number ? `(${vendor.gst_number})` : ''}`,
                                                                    value: vendor.id.toString()
                                                                }))}
                                                                placeholder="Select vendor"
                                                                searchPlaceholder="Search vendors..."
                                                                emptyText="No vendors found"
                                                            />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="to_party">To *</Label>
                                                    <Input
                                                        id="to_party"
                                                        value={paymentForm.to_party}
                                                        onChange={(e) => handlePaymentInputChange('to_party', e.target.value)}
                                                        placeholder="Who is receiving the payment (can be different from vendor)"
                                                        required
                                                    />
                                                    <p className="text-xs text-gray-500">
                                                        This can be different from the vendor if payment is made to a different person/account
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="bill_no">Bill Number</Label>
                                                <Input
                                                    id="bill_no"
                                                    value={paymentForm.bill_no}
                                                    onChange={(e) => handlePaymentInputChange('bill_no', e.target.value)}
                                                    placeholder="Reference bill number"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="utr_number">UTR/Reference Number</Label>
                                                <Input
                                                    id="utr_number"
                                                    value={paymentForm.utr_number}
                                                    onChange={(e) => handlePaymentInputChange('utr_number', e.target.value)}
                                                    placeholder="Bank UTR, cheque no, etc."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="transaction_image">Transaction Image (Optional)</Label>
                                            <div className="space-y-2">
                                                <input
                                                    id="transaction_image"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageSelect}
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                                {imagePreview && (
                                                    <div className="relative inline-block">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="h-24 w-24 object-cover rounded border"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveImage}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs hover:bg-red-600"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end space-x-4 pt-4">
                                            <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={paymentLoading}>
                                                <Save className="h-4 w-4 mr-2" />
                                                {paymentLoading ? "Adding..." : "Add Payment"}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}

                        <div className="text-sm text-gray-600">
                            <div>Total Payments: {(bill.payments || []).length}</div>
                            <div>Last Payment: {(bill.payments || []).length > 0 ? formatDate(bill.payments[bill.payments.length - 1].payment_date) : 'None'}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bill Items */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Bill Items ({bill.items?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/3">Product</TableHead>
                                    <TableHead className="w-20 text-center">Quantity</TableHead>
                                    <TableHead className="w-24 text-right">Unit Price</TableHead>
                                    <TableHead className="w-20 text-center">GST %</TableHead>
                                    <TableHead className="w-24 text-right">GST Amount</TableHead>
                                    <TableHead className="w-24 text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(bill.items || []).map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="w-1/3">
                                            <div className="font-medium text-gray-900">
                                                {item.product ? item.product.title : (item.item_name || 'Unknown Item')}
                                            </div>
                                            {item.product && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    ID: {item.product.id}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="w-20 text-center font-medium">
                                            {Math.round(item.quantity || 0)}
                                        </TableCell>
                                        <TableCell className="w-24 text-right font-medium">
                                            {formatCurrency(item.purchase_price || 0)}
                                        </TableCell>
                                        <TableCell className="w-20 text-center font-medium">
                                            {item.gst_percent || 0}%
                                        </TableCell>
                                        <TableCell className="w-24 text-right font-medium">
                                            {formatCurrency(item.gst_amount || 0)}
                                        </TableCell>
                                        <TableCell className="w-24 text-right font-bold text-gray-900">
                                            {formatCurrency(item.total || 0)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-end">
                        <div className="space-y-2 text-right">
                            <div className="flex justify-between gap-8">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(
                                    (bill.items || []).reduce((sum, item) => {
                                        const itemTotal = parseFloat(item.total?.toString() || '0') || 0;
                                        return sum + itemTotal;
                                    }, 0)
                                )}</span>
                            </div>
                            <div className="flex justify-between gap-8">
                                <span>Discount:</span>
                                <span className="text-green-600">-{formatCurrency(bill.discount || 0)}</span>
                            </div>
                            <div className="flex justify-between gap-8 font-bold text-lg">
                                <span>Total:</span>
                                <span>{formatCurrency(bill.total_amount || 0)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment History */}
            {(bill.payments || []).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Payment History ({(bill.payments || []).length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(bill.payments || []).map((payment, index) => (
                                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-lg text-gray-900">{formatCurrency(payment.amount)}</div>
                                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    {formatDate(payment.payment_date)}
                                                </div>
                                                {payment.note && (
                                                    <div className="text-sm text-gray-500 mt-1 max-w-md truncate">
                                                        {payment.note}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className={getPaymentModeColor(payment.mode)}>
                                            {payment.mode}
                                        </Badge>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Payment #{payment.id}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
