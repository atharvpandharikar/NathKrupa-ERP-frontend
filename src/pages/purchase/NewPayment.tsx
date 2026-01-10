import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Upload,
    X,
    Loader2,
    DollarSign,
    Calendar,
    CreditCard,
    FileText,
} from "lucide-react";
import { purchaseApi, type PurchaseBill, type Vendor, type PurchasePayment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { safeNumber } from "@/lib/utils";

export default function NewPayment() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [bills, setBills] = useState<PurchaseBill[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [billsLoading, setBillsLoading] = useState(false);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        bill: "",
        vendor: "",
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        mode: "Bank",
        note: "",
    });

    useEffect(() => {
        fetchBills();
        fetchVendors();
    }, []);

    // Auto-populate vendor when bill is selected
    useEffect(() => {
        if (formData.bill) {
            const selectedBill = bills.find(b => b.id.toString() === formData.bill);
            if (selectedBill && selectedBill.vendor) {
                setFormData(prev => ({
                    ...prev,
                    vendor: selectedBill.vendor.id.toString(),
                }));
            }
        }
    }, [formData.bill, bills]);

    const fetchBills = async () => {
        try {
            setBillsLoading(true);
            const response = await purchaseApi.bills.list({ page_size: 1000 }) as any;
            const billsList = response.results || response || [];
            setBills(Array.isArray(billsList) ? billsList : []);
        } catch (error) {
            console.error('Failed to fetch bills:', error);
            toast({
                title: "Error",
                description: "Failed to load bills. Please try again.",
                variant: "destructive",
            });
        } finally {
            setBillsLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            setVendorsLoading(true);
            const response = await purchaseApi.vendors.list();
            const vendorsList = Array.isArray(response) ? response : (response?.results || []);
            setVendors(vendorsList);
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            toast({
                title: "Error",
                description: "Failed to load vendors. Please try again.",
                variant: "destructive",
            });
        } finally {
            setVendorsLoading(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: "Please select an image smaller than 5MB",
                    variant: "destructive",
                });
                return;
            }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.bill || !formData.vendor || !formData.amount || !formData.payment_date) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);

            const paymentData: any = {
                bill: parseInt(formData.bill),
                vendor: parseInt(formData.vendor),
                amount: parseFloat(formData.amount),
                payment_date: formData.payment_date,
                mode: formData.mode,
                note: formData.note || "",
            };

            let response: PurchasePayment;

            if (selectedImage) {
                // Create FormData for file upload
                const formDataToSend = new FormData();
                formDataToSend.append('bill', paymentData.bill.toString());
                formDataToSend.append('vendor', paymentData.vendor.toString());
                formDataToSend.append('amount', paymentData.amount.toString());
                formDataToSend.append('payment_date', paymentData.payment_date);
                formDataToSend.append('mode', paymentData.mode);
                if (paymentData.note) {
                    formDataToSend.append('note', paymentData.note);
                }
                formDataToSend.append('attachment', selectedImage);

                response = await purchaseApi.payments.create(formDataToSend);
            } else {
                response = await purchaseApi.payments.create(paymentData);
            }

            toast({
                title: "Success",
                description: "Payment added successfully",
            });

            // Navigate to payment detail or payments list
            if (response.id) {
                navigate(`/purchase/vendor-payments`);
            } else {
                navigate('/purchase/vendor-payments');
            }
        } catch (error: any) {
            console.error('Error creating payment:', error);
            toast({
                title: "Error",
                description: error?.response?.data?.error || error?.message || "Failed to create payment. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const selectedBill = bills.find(b => b.id.toString() === formData.bill);
    const outstandingAmount = selectedBill ? safeNumber(selectedBill.outstanding_amount || selectedBill.total_amount) : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/purchase/vendor-payments')}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">Add Payment</h1>
                    <p className="text-gray-600 mt-1">Create a new vendor payment</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="bill">Bill *</Label>
                                        <Select
                                            value={formData.bill}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, bill: value }))}
                                            disabled={billsLoading}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={billsLoading ? "Loading bills..." : "Select bill"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {billsLoading ? (
                                                    <div className="p-2 text-sm text-muted-foreground">Loading bills...</div>
                                                ) : bills.length === 0 ? (
                                                    <div className="p-2 text-sm text-muted-foreground">No bills available</div>
                                                ) : (
                                                    bills.map((bill) => (
                                                        <SelectItem key={bill.id} value={bill.id.toString()}>
                                                            {bill.bill_number} - {bill.vendor?.name || 'N/A'} 
                                                            {bill.outstanding_amount && (
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    (Outstanding: {formatCurrency(safeNumber(bill.outstanding_amount))})
                                                                </span>
                                                            )}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="vendor">Vendor *</Label>
                                        <Select
                                            value={formData.vendor}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, vendor: value }))}
                                            disabled={vendorsLoading || !!formData.bill}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={vendorsLoading ? "Loading vendors..." : "Select vendor"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vendorsLoading ? (
                                                    <div className="p-2 text-sm text-muted-foreground">Loading vendors...</div>
                                                ) : vendors.length === 0 ? (
                                                    <div className="p-2 text-sm text-muted-foreground">No vendors available</div>
                                                ) : (
                                                    vendors.map((vendor) => (
                                                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                                            {vendor.name}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {formData.bill && (
                                            <p className="text-xs text-muted-foreground">
                                                Vendor auto-selected from bill
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="amount">Amount (₹) *</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                            placeholder="0.00"
                                            required
                                        />
                                        {selectedBill && outstandingAmount > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Outstanding: {formatCurrency(outstandingAmount)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="payment_date">Payment Date *</Label>
                                        <Input
                                            id="payment_date"
                                            type="date"
                                            value={formData.payment_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="mode">Payment Mode *</Label>
                                        <Select
                                            value={formData.mode}
                                            onValueChange={(value) => setFormData(prev => ({ ...prev, mode: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Bank">Bank Transfer</SelectItem>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Credit">Credit</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="note">Note</Label>
                                    <Textarea
                                        id="note"
                                        value={formData.note}
                                        onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                                        placeholder="Additional notes about this payment..."
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="attachment">Attachment (Optional)</Label>
                                    <div className="space-y-2">
                                        {!imagePreview ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    id="attachment"
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={handleImageSelect}
                                                    className="flex-1"
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative border rounded-lg p-4">
                                                {imagePreview.startsWith('data:image') ? (
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="max-h-48 mx-auto rounded"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 p-4">
                                                        <FileText className="h-8 w-8 text-gray-400" />
                                                        <span className="text-sm text-gray-600">
                                                            {selectedImage?.name}
                                                        </span>
                                                    </div>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleRemoveImage}
                                                    className="absolute top-2 right-2"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Supported formats: JPG, PNG, PDF (Max 5MB)
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Card */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {selectedBill && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Bill Number:</span>
                                            <span className="font-medium">{selectedBill.bill_number}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Vendor:</span>
                                            <span className="font-medium">{selectedBill.vendor?.name || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Bill Total:</span>
                                            <span className="font-medium">{formatCurrency(safeNumber(selectedBill.total_amount))}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Outstanding:</span>
                                            <span className="font-medium text-orange-600">
                                                {formatCurrency(outstandingAmount)}
                                            </span>
                                        </div>
                                        {formData.amount && (
                                            <div className="pt-2 border-t">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Payment Amount:</span>
                                                    <span className="font-medium text-green-600">
                                                        {formatCurrency(parseFloat(formData.amount) || 0)}
                                                    </span>
                                                </div>
                                                {outstandingAmount > 0 && (
                                                    <div className="flex justify-between text-xs mt-1">
                                                        <span className="text-muted-foreground">Remaining:</span>
                                                        <span className="font-medium">
                                                            {formatCurrency(Math.max(0, outstandingAmount - (parseFloat(formData.amount) || 0)))}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 border-t space-y-2">
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard className="h-4 w-4 mr-2" />
                                                Create Payment
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => navigate('/purchase/vendor-payments')}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
