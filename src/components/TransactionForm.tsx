import { useState, useEffect } from "react";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import {
    Save,
    X
} from "lucide-react";
import { financeApi, purchaseApi } from "@/lib/api";

interface Account {
    id: number;
    nickname: string;
    account_name: string;
    account_type: string;
    current_balance: number;
}

interface Vendor {
    id: number;
    name: string;
    gst_number: string;
    email: string;
}

interface TransactionFormData {
    account: string;
    transaction_type: string;
    amount: number;
    from_party: string;
    to_party: string;
    vendor: string;
    custom_vendor: string;
    purpose: string;
    bill_no: string;
    utr_number: string;
    time: string;
    notes: string;
}

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    vendorId?: number;
    vendorName?: string;
    prefillData?: Partial<TransactionFormData>;
    title?: string;
    description?: string;
}

export default function TransactionForm({
    isOpen,
    onClose,
    onSuccess,
    vendorId,
    vendorName,
    prefillData = {},
    title = "Create New Transaction",
    description = "Create a new financial transaction"
}: TransactionFormProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [useCustomVendor, setUseCustomVendor] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [formData, setFormData] = useState<TransactionFormData>({
        account: "",
        transaction_type: "Debit", // Default to Debit for vendor payments
        amount: 0,
        from_party: "",
        to_party: "",
        vendor: vendorId ? vendorId.toString() : "",
        custom_vendor: vendorName || "",
        purpose: "",
        bill_no: "",
        utr_number: "",
        time: new Date().toISOString().slice(0, 16),
        notes: "",
        ...prefillData
    });

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
            fetchVendors();
        }
    }, [isOpen]);

    useEffect(() => {
        if (vendorId && vendorName) {
            setFormData(prev => ({
                ...prev,
                vendor: vendorId.toString(),
                custom_vendor: vendorName,
                purpose: `Payment to ${vendorName}`,
                transaction_type: "Debit"
            }));
        }
    }, [vendorId, vendorName]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const data = await financeApi.get<Account[]>('/accounts/');
            setAccounts(data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        try {
            const data = await purchaseApi.vendors.list();
            setVendors(data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
            setVendors([]);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.amount <= 0) {
            alert('Transaction amount must be greater than zero.');
            return;
        }

        if (!formData.account) {
            alert('Please select an account.');
            return;
        }

        if (!formData.purpose) {
            alert('Please enter a purpose for this transaction.');
            return;
        }

        setCreateLoading(true);

        try {
            const transactionData = {
                ...formData,
                account: parseInt(formData.account),
                amount: parseFloat(formData.amount.toString()),
                time: new Date(formData.time).toISOString(),
                // Handle vendor selection for debit transactions
                ...(formData.transaction_type === 'Debit' && {
                    ...(useCustomVendor && formData.custom_vendor
                        ? { to_party: formData.custom_vendor }
                        : formData.vendor
                            ? { vendor: parseInt(formData.vendor) }
                            : {}
                    )
                }),
                // Clear party fields that shouldn't be sent
                ...(formData.transaction_type === 'Credit' && { to_party: '' }),
                ...(formData.transaction_type === 'Debit' && !useCustomVendor && { to_party: '' }),
            };

            await financeApi.createTransactionWithImage(transactionData, selectedImage || undefined);

            // Reset form
            setFormData({
                account: "",
                transaction_type: "Debit",
                amount: 0,
                from_party: "",
                to_party: "",
                vendor: vendorId ? vendorId.toString() : "",
                custom_vendor: vendorName || "",
                purpose: "",
                bill_no: "",
                utr_number: "",
                time: new Date().toISOString().slice(0, 16),
                notes: "",
                ...prefillData
            });
            setSelectedImage(null);
            setImagePreview(null);
            setUseCustomVendor(false);

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error creating transaction:', error);
            alert('Error creating transaction. Please try again.');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            account: "",
            transaction_type: "Debit",
            amount: 0,
            from_party: "",
            to_party: "",
            vendor: vendorId ? vendorId.toString() : "",
            custom_vendor: vendorName || "",
            purpose: "",
            bill_no: "",
            utr_number: "",
            time: new Date().toISOString().slice(0, 16),
            notes: "",
            ...prefillData
        });
        setSelectedImage(null);
        setImagePreview(null);
        setUseCustomVendor(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="account">Account *</Label>
                            <Select value={formData.account} onValueChange={(value) => handleInputChange('account', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id.toString()}>
                                            {account.nickname} ({account.account_type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="transaction_type">Transaction Type *</Label>
                            <Select value={formData.transaction_type} onValueChange={(value) => handleInputChange('transaction_type', value)}>
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
                                value={formData.amount}
                                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                required
                            />
                            {formData.amount <= 0 && (
                                <p className="text-sm text-red-600">Amount must be greater than zero</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="time">Date & Time *</Label>
                            <Input
                                id="time"
                                type="datetime-local"
                                value={formData.time}
                                onChange={(e) => handleInputChange('time', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="purpose">Purpose *</Label>
                        <Textarea
                            id="purpose"
                            value={formData.purpose}
                            onChange={(e) => handleInputChange('purpose', e.target.value)}
                            placeholder="Describe the purpose of this transaction"
                            required
                            rows={3}
                        />
                    </div>

                    {/* Party fields based on transaction type */}
                    {formData.transaction_type === 'Credit' && (
                        <div className="space-y-2">
                            <Label htmlFor="from_party">From Party *</Label>
                            <Input
                                id="from_party"
                                value={formData.from_party}
                                onChange={(e) => handleInputChange('from_party', e.target.value)}
                                placeholder="Who is paying/sending money"
                                required
                            />
                        </div>
                    )}

                    {formData.transaction_type === 'Debit' && (
                        <div className="space-y-2">
                            <Label htmlFor="vendor">Vendor *</Label>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="useCustomVendor"
                                        checked={useCustomVendor}
                                        onChange={(e) => setUseCustomVendor(e.target.checked)}
                                        className="rounded"
                                    />
                                    <Label htmlFor="useCustomVendor" className="text-sm">
                                        Use custom vendor name
                                    </Label>
                                </div>

                                {useCustomVendor ? (
                                    <Input
                                        id="custom_vendor"
                                        value={formData.custom_vendor}
                                        onChange={(e) => handleInputChange('custom_vendor', e.target.value)}
                                        placeholder="Enter vendor name"
                                        required
                                    />
                                ) : (
                                    <Combobox
                                        value={formData.vendor}
                                        onChange={(value) => handleInputChange('vendor', value)}
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
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bill_no">Bill Number</Label>
                            <Input
                                id="bill_no"
                                value={formData.bill_no}
                                onChange={(e) => handleInputChange('bill_no', e.target.value)}
                                placeholder="Reference bill number"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="utr_number">UTR/Reference Number</Label>
                            <Input
                                id="utr_number"
                                value={formData.utr_number}
                                onChange={(e) => handleInputChange('utr_number', e.target.value)}
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
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createLoading}>
                            <Save className="h-4 w-4 mr-2" />
                            {createLoading ? "Creating..." : "Create Transaction"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
