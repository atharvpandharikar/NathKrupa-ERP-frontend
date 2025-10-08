import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Edit,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    Calendar,
    DollarSign,
    FileText,
    User,
    Hash
} from "lucide-react";
import { financeApi } from "@/lib/api";

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

export default function TransactionDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchTransactionDetail();
        }
    }, [id]);

    const fetchTransactionDetail = async () => {
        try {
            setLoading(true);
            const transactionData = await financeApi.get<Transaction>(`/transactions/${id}/`);
            setTransaction(transactionData);
        } catch (error) {
            console.error('Error fetching transaction detail:', error);
        } finally {
            setLoading(false);
        }
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

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading...</div>
                    <div className="text-sm text-muted-foreground mt-2">Please wait while we load the transaction details</div>
                </div>
            </div>
        );
    }

    if (!transaction) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Transaction not found</div>
                    <div className="text-sm text-muted-foreground mt-2">The transaction you're looking for doesn't exist</div>
                    <Button className="mt-4" onClick={() => navigate('/finance/transactions')}>
                        Back to Transactions
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/finance/transactions')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Transactions
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">Transaction Details</h1>
                    <p className="text-gray-600 mt-1">Transaction #{transaction.id}</p>
                </div>
                <Button onClick={() => navigate(`/finance/transactions/${transaction.id}/edit`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Transaction
                </Button>
            </div>

            {/* Transaction Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transaction Type</CardTitle>
                        {transaction.transaction_type === 'Credit' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            <Badge variant={transaction.transaction_type === 'Credit' ? 'default' : 'destructive'}>
                                {transaction.transaction_type}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {transaction.transaction_type === 'Credit' ? 'Money received' : 'Money paid'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Amount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${transaction.transaction_type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.transaction_type === 'Credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Transaction amount
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Account</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{transaction.account_nickname}</div>
                        <p className="text-xs text-muted-foreground">
                            Account used
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Date & Time</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDate(transaction.time)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatDateTime(transaction.time)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Purpose
                            </label>
                            <p className="text-lg mt-1">{transaction.purpose}</p>
                        </div>

                        {transaction.transaction_type === 'Credit' && transaction.from_party && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    From Party
                                </label>
                                <p className="text-lg mt-1">{transaction.from_party}</p>
                            </div>
                        )}

                        {transaction.transaction_type === 'Debit' && transaction.vendor_name && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Vendor
                                </label>
                                <p className="text-lg mt-1">{transaction.vendor_name}</p>
                            </div>
                        )}

                        {transaction.transaction_type === 'Debit' && !transaction.vendor_name && transaction.to_party && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    To Party
                                </label>
                                <p className="text-lg mt-1">{transaction.to_party}</p>
                            </div>
                        )}

                        {(transaction.bill_no || transaction.utr_number) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {transaction.bill_no && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Hash className="h-4 w-4" />
                                            Bill Number
                                        </label>
                                        <p className="text-lg mt-1">{transaction.bill_no}</p>
                                    </div>
                                )}

                                {transaction.utr_number && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Hash className="h-4 w-4" />
                                            UTR/Reference Number
                                        </label>
                                        <p className="text-lg mt-1">{transaction.utr_number}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                                <p className="text-lg mt-1">#{transaction.id}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Created</label>
                                <p className="text-lg mt-1">{formatDateTime(transaction.created_at)}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Proof Image */}
            {transaction.image && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Proof</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="relative inline-block">
                                <img
                                    src={transaction.image}
                                    alt="Payment Proof"
                                    className="max-w-full h-auto rounded-lg border shadow-sm"
                                    style={{ maxHeight: '400px' }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Transaction receipt or payment proof image
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
