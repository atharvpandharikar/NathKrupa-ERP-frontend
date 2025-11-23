import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useOptimizedTransactions } from "@/hooks/useOptimizedData";
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
    History,
    ChevronLeft,
    ChevronRight
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
    const [searchTerm, setSearchTerm] = useState("");
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [vendorsLoaded, setVendorsLoaded] = useState(false);
    const [vendorsError, setVendorsError] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>("all");
    const [selectedType, setSelectedType] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_high" | "amount_low">("newest");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const { transactions, totalCount, loading, error: transactionsError, refresh } = useOptimizedTransactions(
        currentPage,
        pageSize,
        {
            search: searchTerm,
            account: selectedAccount,
            type: selectedType,
            dateFrom: dateFrom,
            dateTo: dateTo,
            sort: sortBy
        }
    );
    const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
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
    const transactionType = formData.transaction_type;

    // Export related state
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
    const [exportAccountId, setExportAccountId] = useState<string>('all');
    const [exportStartDate, setExportStartDate] = useState<string>('');
    const [exportEndDate, setExportEndDate] = useState<string>('');
    const [exportTransactionType, setExportTransactionType] = useState<'Credit' | 'Debit' | 'Both'>('Both');
    const [currentExportJob, setCurrentExportJob] = useState<ExportJob | null>(null);

    useEffect(() => {
        setDisplayedTransactions(transactions);
    }, [transactions]);


    // Client-side filtering is removed in favor of server-side filtering via the hook
    useEffect(() => {
        // Reset to page 1 when filters change
        setCurrentPage(1);
    }, [searchTerm, selectedAccount, selectedType, dateFrom, dateTo, sortBy]);

    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize]);

    useEffect(() => {
        // Restore focus to input if it was focused before
        if (searchInputRef.current && document.activeElement === document.body) {
            setTimeout(() => searchInputRef.current?.focus(), 0);
        }
    }, [transactions]);

    // Handle /new route by opening the create dialog
    useEffect(() => {
        if (location.pathname === '/finance/transactions/new') {
            setIsCreateDialogOpen(true);
        }
    }, [location.pathname]);


    const fetchAccounts = useCallback(async () => {
        try {
            // Handle pagination - accounts API returns paginated response
            const response = await financeApi.get<any>('/accounts/?page_size=1000');
            // Extract results from paginated response or use array directly
            const accountsData = Array.isArray(response) ? response : (response.results || []);
            setAccounts(accountsData);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    }, []);

    const fetchVendors = useCallback(async () => {
        if (vendorsLoading) {
            return;
        }
        setVendorsLoading(true);
        setVendorsError(null);
        try {
            // Use the actual purchase API to fetch vendors - handle pagination
            const response = await purchaseApi.vendors.list() as any;
            // Extract results from paginated response or use array directly
            const vendorsData = Array.isArray(response) ? response : (response.results || []);
            setVendors(vendorsData);
            setVendorsLoaded(true);
        } catch (error) {
            console.error('Error fetching vendors:', error);
            setVendors([]);
            setVendorsError('Unable to load vendor list. Please try again.');
            setVendorsLoaded(false);
        } finally {
            setVendorsLoading(false);
        }
    }, [vendorsLoading]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        if (isCreateDialogOpen && transactionType === 'Debit' && !vendorsLoaded) {
            fetchVendors();
        }
    }, [isCreateDialogOpen, transactionType, vendorsLoaded, fetchVendors]);

    const filteredTransactions = displayedTransactions;
    const totalPages = Math.max(1, totalCount ? Math.ceil(totalCount / pageSize) : 1);
    const currentRangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const currentRangeEnd = totalCount === 0
        ? 0
        : Math.max(currentRangeStart, currentRangeStart + filteredTransactions.length - 1);
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    useEffect(() => {
        if (!loading && totalCount > 0 && filteredTransactions.length === 0 && currentPage > 1) {
            setCurrentPage(prev => Math.max(1, prev - 1));
        }
    }, [loading, totalCount, filteredTransactions.length, currentPage]);

    const handlePrevPage = () => {
        if (canGoPrevious) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (canGoNext) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePageSizeChange = (value: string) => {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
            setPageSize(parsed);
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

    const enhanceTransaction = useCallback((transaction: Transaction): Transaction => {
        const accountInfo = accounts.find(account => account.id === transaction.account);
        const vendorInfo = transaction.vendor ? vendors.find(vendor => vendor.id === transaction.vendor) : undefined;

        return {
            ...transaction,
            account_nickname: transaction.account_nickname || accountInfo?.nickname || accountInfo?.account_name || transaction.account_nickname,
            vendor_name: transaction.vendor_name || vendorInfo?.name || transaction.to_party || transaction.vendor_name,
        };
    }, [accounts, vendors]);

    const handleDelete = async (transactionId: number) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            await financeApi.del(`/transactions/${transactionId}/`);
            toast({ title: 'Success', description: 'Transaction deleted successfully' });
            setDisplayedTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));

            if (filteredTransactions.length <= 1 && currentPage > 1) {
                setCurrentPage(prev => Math.max(1, prev - 1));
            } else {
                refresh();
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            toast({ title: 'Error', description: 'Failed to delete transaction', variant: 'destructive' });
        }
    };

    const handleCreateTransaction = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate account
        if (!formData.account || formData.account === "") {
            toast({ title: 'Error', description: 'Please select an account', variant: 'destructive' });
            return;
        }

        // Validate amount
        if (formData.amount <= 0) {
            toast({ title: 'Error', description: 'Transaction amount must be greater than zero.', variant: 'destructive' });
            return;
        }

        setCreateLoading(true);

        try {
            const accountId = parseInt(formData.account);
            if (isNaN(accountId)) {
                toast({ title: 'Error', description: 'Invalid account selected', variant: 'destructive' });
                setCreateLoading(false);
                return;
            }

            const transactionData = {
                ...formData,
                account: accountId,
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
            setIsCreateDialogOpen(false);
            toast({ title: 'Success', description: 'Transaction created successfully' });
            const hydratedTransaction = enhanceTransaction(newTransaction);
            setDisplayedTransactions(prev => {
                const withoutDuplicate = prev.filter(transaction => transaction.id !== hydratedTransaction.id);
                return [hydratedTransaction, ...withoutDuplicate].slice(0, pageSize);
            });
            const shouldRefreshImmediately = currentPage === 1;
            setCurrentPage(1);
            if (shouldRefreshImmediately) {
                refresh();
            }
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
                                            {!useCustomVendor && vendorsLoading && (
                                                <p className="text-xs text-muted-foreground">Loading vendors...</p>
                                            )}
                                            {vendorsError && (
                                                <div className="mt-1 flex items-center gap-2 text-xs text-red-600">
                                                    <span>{vendorsError}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchVendors()}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        Retry
                                                    </button>
                                                </div>
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
                            <div className="flex flex-col">
                                <label className="text-xs text-muted-foreground mb-1">Search</label>
                                <input
                                    ref={searchInputRef}
                                    className="h-9 rounded-md border bg-background px-3 text-sm"
                                    placeholder="Search transactions..."
                                    aria-label="Search transactions"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="text-xs text-muted-foreground mb-1">Account</label>
                                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="All Accounts" />
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
                            </div>

                            <div className="flex flex-col">
                                <label className="text-xs text-muted-foreground mb-1">Type</label>
                                <Select value={selectedType} onValueChange={setSelectedType}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="Credit">Credit</SelectItem>
                                        <SelectItem value="Debit">Debit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col">
                                <label className="text-xs text-muted-foreground mb-1">Sort</label>
                                <Select value={sortBy} onValueChange={(val) => setSortBy(val as "newest" | "oldest" | "amount_high" | "amount_low")}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Newest First" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest First</SelectItem>
                                        <SelectItem value="oldest">Oldest First</SelectItem>
                                        <SelectItem value="amount_high">Highest Amount</SelectItem>
                                        <SelectItem value="amount_low">Lowest Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
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
                    {transactionsError && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <p className="font-medium">Unable to load transactions.</p>
                            <p className="mt-1">{transactionsError}</p>
                        </div>
                    )}
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

                    {loading && (
                        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading transactions...
                        </div>
                    )}

                    {!loading && filteredTransactions.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No transactions found</p>
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-muted-foreground">
                            {totalCount === 0
                                ? 'No transactions to display'
                                : `Showing ${currentRangeStart}-${currentRangeEnd} of ${totalCount} transactions`}
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="transactions-page-size" className="text-sm">
                                Rows per page
                            </Label>
                            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                                <SelectTrigger id="transactions-page-size" className="w-24">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={!canGoPrevious}>
                                <ChevronLeft className="mr-1 h-4 w-4" />
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {totalCount === 0 ? 0 : currentPage} of {totalCount === 0 ? 0 : totalPages}
                            </span>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!canGoNext}>
                                Next
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
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
