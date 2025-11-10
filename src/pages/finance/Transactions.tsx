import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
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
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    Save,
    Download,
    FileSpreadsheet,
    FileText,
    Loader2,
    History
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { financeApi, purchaseApi } from "@/lib/api";
import { exportService, ExportJob } from '@/services/exportService';
import { useToast } from '@/hooks/use-toast';
import { useExportNotifications } from '@/context/ExportNotificationContext';

interface Transaction {
    id: number;
    account: number;
    account_nickname: string;
    transaction_type: string;
    amount: number;
    from_party: string;
    to_party: string;
    vendor?: number;
    vendor_name?: string;
    purpose: string;
    bill_no: string;
    utr_number: string;
    time: string;
    created_at: string;
    image?: string;
}

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

export default function Transactions() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { trackJob } = useExportNotifications();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAccount, setSelectedAccount] = useState<string>("all");
    const [selectedType, setSelectedType] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [loading, setLoading] = useState(true);
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

    // Export related state
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
    const [exportAccountId, setExportAccountId] = useState<string>('all');
    const [exportStartDate, setExportStartDate] = useState<string>('');
    const [exportEndDate, setExportEndDate] = useState<string>('');
    const [exportTransactionType, setExportTransactionType] = useState<'Credit' | 'Debit' | 'Both'>('Both');
    const [currentExportJob, setCurrentExportJob] = useState<ExportJob | null>(null);

    useEffect(() => {
        fetchTransactions();
        fetchAccounts();
        fetchVendors();
    }, []);

    useEffect(() => {
        filterTransactions();
    }, [transactions, searchTerm, selectedAccount, selectedType, sortBy, dateFrom, dateTo]);

    // Handle /new route by opening the create dialog
    useEffect(() => {
        if (location.pathname === '/finance/transactions/new') {
            setIsCreateDialogOpen(true);
        }
    }, [location.pathname]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const data = await financeApi.get<Transaction[]>('/transactions/');
            setTransactions(data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        try {
            const data = await financeApi.get<Account[]>('/accounts/');
            setAccounts(data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    const fetchVendors = async () => {
        try {
            // Use the actual purchase API to fetch vendors
            const data = await purchaseApi.vendors.list();
            setVendors(data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
            // Fallback to empty array if API fails
            setVendors([]);
        }
    };

    const filterTransactions = () => {
        let filtered = transactions;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(transaction =>
                transaction.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.from_party.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.to_party.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.bill_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                transaction.utr_number.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by account
        if (selectedAccount !== "all") {
            filtered = filtered.filter(transaction => transaction.account === parseInt(selectedAccount));
        }

        // Filter by transaction type
        if (selectedType !== "all") {
            filtered = filtered.filter(transaction => transaction.transaction_type === selectedType);
        }

        // Filter by date range
        if (dateFrom) {
            filtered = filtered.filter(transaction =>
                new Date(transaction.time) >= new Date(dateFrom)
            );
        }

        if (dateTo) {
            filtered = filtered.filter(transaction =>
                new Date(transaction.time) <= new Date(dateTo + 'T23:59:59')
            );
        }

        // Sort transactions
        filtered.sort((a, b) => {
            const dateA = new Date(a.time);
            const dateB = new Date(b.time);

            switch (sortBy) {
                case 'newest':
                    return dateB.getTime() - dateA.getTime(); // Newest first
                case 'oldest':
                    return dateA.getTime() - dateB.getTime(); // Oldest first
                case 'amount_high':
                    return b.amount - a.amount; // Highest amount first
                case 'amount_low':
                    return a.amount - b.amount; // Lowest amount first
                default:
                    return dateB.getTime() - dateA.getTime(); // Default: newest first
            }
        });

        setFilteredTransactions(filtered);
    };

    const formatCurrency = (amount: number) => {
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

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDelete = async (transactionId: number) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                await financeApi.del(`/transactions/${transactionId}/`);
                setTransactions(transactions.filter(transaction => transaction.id !== transactionId));
            } catch (error) {
                console.error('Error deleting transaction:', error);
                alert('Error deleting transaction');
            }
        }
    };

    const handleCreateTransaction = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate amount
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

            const newTransaction = await financeApi.createTransactionWithImage(transactionData, selectedImage || undefined);
            setTransactions([newTransaction, ...transactions]);
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
            // Navigate back to transactions list if we came from /new route
            if (location.pathname === '/finance/transactions/new') {
                navigate('/finance/transactions');
            }
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

    const handleExportTransactions = async () => {
        // Close dialog immediately
        setShowExportDialog(false);

        // Show notification immediately after dialog closes
        setTimeout(() => {
            toast({
                title: 'Export Request Submitted',
                description: 'Your export request is being processed in the background. You can continue working and we will notify you when it\'s ready for download.',
                variant: 'default',
                duration: 6000,
            });
        }, 100);

        try {
            const response = await financeApi.exportTransactions({
                format: exportFormat,
                account_id: exportAccountId !== 'all' ? exportAccountId : undefined,
                from_date: exportStartDate || undefined,
                to_date: exportEndDate || undefined,
                transaction_type: exportTransactionType !== 'Both' ? exportTransactionType : undefined,
            });

            if (response.error) {
                throw new Error(response.message || response.error || 'Failed to export transactions');
            }

            // Handle async task (when Redis is available)
            if (response.task_id) {
                const job: ExportJob = {
                    taskId: response.task_id,
                    format: exportFormat,
                    status: 'PENDING',
                    createdAt: Date.now(),
                };
                setCurrentExportJob(job);
                trackJob(response.task_id);
            }
            // Handle synchronous result (when Redis is not available)
            else if (response.file_path) {
                toast({
                    title: 'Export Ready',
                    description: 'Your export is ready for download.',
                    variant: 'default',
                });
            }
        } catch (error: any) {
            console.error('Error exporting transactions:', error);
            const errorMessage = error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to export transactions. Please try again.';
            toast({
                title: 'Export Failed',
                description: errorMessage,
                variant: 'destructive',
                duration: 5000,
            });
        }
    };

    // Update local job state and poll for finance exports
    useEffect(() => {
        if (!currentExportJob) return;

        // Poll for finance export status
        const pollInterval = setInterval(async () => {
            try {
                const status = await financeApi.getExportStatus(currentExportJob.taskId);
                const job = { ...currentExportJob };

                job.status = status.status;
                if (status.info?.current && status.info?.total) {
                    job.progress = {
                        current: status.info.current,
                        total: status.info.total,
                    };
                }

                if (status.status === 'SUCCESS' && status.result?.file_path) {
                    job.status = 'SUCCESS';
                    job.filePath = status.result.file_path;
                    const urlParts = status.result.file_path.split('/');
                    job.fileName = urlParts[urlParts.length - 1] || `transactions_export.${job.format === 'excel' ? 'xlsx' : 'pdf'}`;
                    job.completedAt = Date.now();
                    setCurrentExportJob(null);
                    clearInterval(pollInterval);
                    toast({
                        title: 'Export Complete',
                        description: `Your ${job.format.toUpperCase()} export is ready for download.`,
                    });
                } else if (status.status === 'FAILURE') {
                    job.status = 'FAILURE';
                    job.completedAt = Date.now();
                    setCurrentExportJob(null);
                    clearInterval(pollInterval);
                    toast({
                        title: 'Export Failed',
                        description: 'Your export failed. Please try again.',
                        variant: 'destructive',
                    });
                } else {
                    setCurrentExportJob(job);
                }
            } catch (error) {
                console.error('Error checking export status:', error);
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(pollInterval);
    }, [currentExportJob]);

    // Also subscribe to exportService for products exports (if any)
    useEffect(() => {
        const unsubscribe = exportService.subscribe((job) => {
            // Only handle if it's not a finance export
            if (currentExportJob && job.taskId === currentExportJob.taskId && !job.taskId.startsWith('sync-')) {
                setCurrentExportJob(job);
                if (job.status === 'SUCCESS' || job.status === 'FAILURE') {
                    setCurrentExportJob(null);
                }
            }
        });

        return unsubscribe;
    }, [currentExportJob]);


    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading...</div>
                    <div className="text-sm text-muted-foreground mt-2">Please wait while we load the transactions</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-gray-600 mt-1">View and manage all financial transactions</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => navigate('/user-admin/export-history')}
                        variant="outline"
                    >
                        <History className="h-4 w-4 mr-2" />
                        History
                    </Button>
                    <Button
                        onClick={() => setShowExportDialog(true)}
                        variant="outline"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
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
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4 pt-4">
                                    <Button type="button" variant="outline" onClick={() => {
                                        setIsCreateDialogOpen(false);
                                        if (location.pathname === '/finance/transactions/new') {
                                            navigate('/finance/transactions');
                                        }
                                    }}>
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
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Filter className="h-5 w-5 mr-2" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* First row - Search and basic filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search transactions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Accounts</SelectItem>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id.toString()}>
                                            {account.nickname}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Transaction Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Credit">Credit</SelectItem>
                                    <SelectItem value="Debit">Debit</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                    <SelectItem value="amount_high">Highest Amount</SelectItem>
                                    <SelectItem value="amount_low">Lowest Amount</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Second row - Date filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="dateFrom" className="text-sm font-medium">From Date</Label>
                                <Input
                                    id="dateFrom"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="dateTo" className="text-sm font-medium">To Date</Label>
                                <Input
                                    id="dateTo"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div className="flex items-end">
                                <Button variant="outline" onClick={() => {
                                    setSearchTerm("");
                                    setSelectedAccount("all");
                                    setSelectedType("all");
                                    setSortBy("newest");
                                    setDateFrom("");
                                    setDateTo("");
                                }} className="w-full">
                                    Clear All Filters
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Purpose</TableHead>
                                <TableHead>Parties</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.map((transaction) => (
                                <TableRow
                                    key={transaction.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => navigate(`/finance/transactions/${transaction.id}`)}
                                >
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{formatDate(transaction.time)}</div>
                                            <div className="text-sm text-muted-foreground">{formatDateTime(transaction.time)}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{transaction.account_nickname}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            {transaction.transaction_type === 'Credit' ? (
                                                <ArrowUpRight className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4 text-red-600" />
                                            )}
                                            <Badge variant={transaction.transaction_type === 'Credit' ? 'default' : 'destructive'}>
                                                {transaction.transaction_type}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`font-bold ${transaction.transaction_type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                                            {transaction.transaction_type === 'Credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-xs truncate" title={transaction.purpose}>
                                            {transaction.purpose}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {transaction.transaction_type === 'Credit' && transaction.from_party && (
                                                <div className="text-muted-foreground">From: {transaction.from_party}</div>
                                            )}
                                            {transaction.transaction_type === 'Debit' && transaction.vendor_name && (
                                                <div className="text-muted-foreground">Vendor: {transaction.vendor_name}</div>
                                            )}
                                            {transaction.transaction_type === 'Debit' && !transaction.vendor_name && transaction.to_party && (
                                                <div className="text-muted-foreground">To: {transaction.to_party}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {transaction.bill_no && (
                                                <div>Bill: {transaction.bill_no}</div>
                                            )}
                                            {transaction.utr_number && (
                                                <div>UTR: {transaction.utr_number}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/finance/transactions/${transaction.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/finance/transactions/${transaction.id}/edit`)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(transaction.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {filteredTransactions.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No transactions found</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Export Dialog */}
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Export Transactions</DialogTitle>
                        <DialogDescription>
                            Export transactions to Excel or PDF with optional filters
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Format Selection */}
                        <div className="space-y-2">
                            <Label>Export Format</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={exportFormat === 'excel' ? 'default' : 'outline'}
                                    onClick={() => setExportFormat('excel')}
                                    className="flex-1"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    Excel
                                </Button>
                                <Button
                                    type="button"
                                    variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                                    onClick={() => setExportFormat('pdf')}
                                    className="flex-1"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    PDF
                                </Button>
                            </div>
                        </div>

                        {/* Account Filter */}
                        <div className="space-y-2">
                            <Label>Account</Label>
                            <Select value={exportAccountId} onValueChange={setExportAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Accounts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Accounts</SelectItem>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id.toString()}>
                                            {account.nickname} ({account.account_type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Transaction Type Filter */}
                        <div className="space-y-2">
                            <Label>Transaction Type</Label>
                            <Select value={exportTransactionType} onValueChange={(value: 'Credit' | 'Debit' | 'Both') => setExportTransactionType(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Both">Both</SelectItem>
                                    <SelectItem value="Credit">Credit</SelectItem>
                                    <SelectItem value="Debit">Debit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date (Optional)</Label>
                                <Input
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date (Optional)</Label>
                                <Input
                                    type="date"
                                    value={exportEndDate}
                                    onChange={(e) => setExportEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Info Message */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <div className="flex items-start gap-2">
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium mb-1">Background Processing</p>
                                    <p className="text-xs">
                                        Your export will process in the background. You can continue working and will be notified when it's ready.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={() => {
                                    setShowExportDialog(false);
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleExportTransactions}
                                className="flex-1"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Start Export
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
