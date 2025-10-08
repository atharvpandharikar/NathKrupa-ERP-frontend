import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Banknote,
    ArrowUpRight,
    ArrowDownRight,
    Plus,
    Eye,
    Save
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { financeApi, purchaseApi } from "@/lib/api";

interface Account {
    id: number;
    nickname: string;
    account_name: string;
    account_type: string;
    current_balance: number;
    credited_amount: number;
    debited_amount: number;
    is_active: boolean;
}

interface Transaction {
    id: number;
    account_nickname: string;
    transaction_type: string;
    amount: number;
    purpose: string;
    time: string;
    from_party: string;
    to_party: string;
    vendor?: number;
    vendor_name?: string;
}

interface Summary {
    total_balance: number;
    total_credit: number;
    total_debit: number;
    net_amount: number;
    transaction_count: number;
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

export default function FinanceDashboard() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [formData, setFormData] = useState({
        account: "",
        transaction_type: "Credit",
        amount: 0,
        from_party: "",
        to_party: "",
        vendor: "",
        custom_vendor: "",
        purpose: "",
        bill_no: "",
        utr_number: "",
        time: new Date().toISOString().slice(0, 16),
    });
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [useCustomVendor, setUseCustomVendor] = useState(false);

    useEffect(() => {
        fetchDashboardData();
        fetchVendors();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            // Fetch accounts
            const accountsData = await financeApi.get<Account[]>('/accounts/');
            setAccounts(accountsData);

            // Fetch recent transactions
            const transactionsData = await financeApi.get<Transaction[]>('/transactions/');
            setRecentTransactions(transactionsData.slice(0, 10)); // Get first 10

            // Calculate total balance from accounts
            const totalBalance = accountsData.reduce((sum, account) => sum + (account.current_balance || 0), 0);

            // Fetch summary
            try {
                const summaryData = await financeApi.get<Summary>('/transactions/summary/');
                setSummary({
                    ...summaryData,
                    total_balance: totalBalance // Override with calculated total
                });
            } catch (summaryError) {
                // If summary API fails, create a basic summary
                console.warn('Summary API failed, using calculated values:', summaryError);
                setSummary({
                    total_balance: totalBalance,
                    total_credit: 0,
                    total_debit: 0,
                    net_amount: 0,
                    transaction_count: transactionsData.length
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
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

    const handleCreateTransaction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.amount <= 0) {
            alert('Transaction amount must be greater than zero.');
            return;
        }

        setCreateLoading(true);

        try {
            const transactionData = {
                ...formData,
                account: parseInt(formData.account),
                amount: parseFloat(formData.amount.toString()),
                time: new Date(formData.time).toISOString(),
                ...(formData.transaction_type === 'Debit' && {
                    ...(useCustomVendor && formData.custom_vendor
                        ? { to_party: formData.custom_vendor }
                        : formData.vendor
                            ? { vendor: parseInt(formData.vendor) }
                            : {}
                    )
                }),
                ...(formData.transaction_type === 'Credit' && { to_party: '' }),
                ...(formData.transaction_type === 'Debit' && !useCustomVendor && { to_party: '' }),
            };

            await financeApi.createTransactionWithImage(transactionData, selectedImage || undefined);
            setIsCreateDialogOpen(false);
            setFormData({
                account: "",
                transaction_type: "Credit",
                amount: 0,
                from_party: "",
                to_party: "",
                vendor: "",
                custom_vendor: "",
                purpose: "",
                bill_no: "",
                utr_number: "",
                time: new Date().toISOString().slice(0, 16),
            });
            setSelectedImage(null);
            setImagePreview(null);
            setUseCustomVendor(false);
            // Refresh dashboard data
            fetchDashboardData();
        } catch (error) {
            console.error('Error creating transaction:', error);
            alert('Error creating transaction');
        } finally {
            setCreateLoading(false);
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

    const formatCurrency = (amount: number) => {
        if (isNaN(amount) || amount === null || amount === undefined) {
            return '₹0.00';
        }
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading...</div>
                    <div className="text-sm text-muted-foreground mt-2">Please wait while we load the finance dashboard</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
                    <p className="text-gray-600 mt-1">Manage your accounts and transactions</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Transaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New Transaction</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateTransaction} className="space-y-6">
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
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={createLoading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {createLoading ? "Creating..." : "Create Transaction"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={() => navigate('/finance/accounts/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Account
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summary ? formatCurrency(summary.total_balance) : formatCurrency(0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across all accounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {summary ? formatCurrency(summary.total_credit) : formatCurrency(0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This period
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {summary ? formatCurrency(summary.total_debit) : formatCurrency(0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This period
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary && summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {summary ? formatCurrency(summary.net_amount) : formatCurrency(0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Credit - Debit
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="accounts" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="accounts">Accounts</TabsTrigger>
                    <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
                </TabsList>

                <TabsContent value="accounts" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {accounts.map((account) => (
                            <Card key={account.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/finance/accounts/${account.id}`)}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{account.nickname}</CardTitle>
                                        <Badge variant={account.account_type === 'Bank' ? 'default' : 'secondary'}>
                                            {account.account_type}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{account.account_name}</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold">
                                            {formatCurrency(account.current_balance)}
                                        </span>
                                        <Button variant="ghost" size="sm">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className={`p-2 rounded-full ${transaction.transaction_type === 'Credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                                                {transaction.transaction_type === 'Credit' ? (
                                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">{transaction.purpose}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {transaction.account_nickname} • {formatDate(transaction.time)}
                                                </p>
                                                {(transaction.from_party || transaction.to_party || transaction.vendor_name) && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {transaction.transaction_type === 'Credit' && transaction.from_party && `From: ${transaction.from_party}`}
                                                        {transaction.transaction_type === 'Debit' && transaction.vendor_name && `Vendor: ${transaction.vendor_name}`}
                                                        {transaction.transaction_type === 'Debit' && !transaction.vendor_name && transaction.to_party && `To: ${transaction.to_party}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${transaction.transaction_type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {transaction.transaction_type === 'Credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-center">
                                <Button variant="outline" onClick={() => navigate('/finance/transactions')}>
                                    View All Transactions
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
