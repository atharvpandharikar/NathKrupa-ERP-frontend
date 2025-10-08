import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Banknote,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { financeApi } from "@/lib/api";

interface Account {
    id: number;
    nickname: string;
    account_name: string;
    account_number: string;
    account_type: string;
    opening_balance: number;
    current_balance: number;
    credited_amount: number;
    debited_amount: number;
    is_active: boolean;
    created_at: string;
}

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
}

export default function AccountDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [account, setAccount] = useState<Account | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchAccountDetail();
        }
    }, [id]);

    const fetchAccountDetail = async () => {
        try {
            setLoading(true);

            // Fetch account details
            const accountData = await financeApi.get<Account>(`/accounts/${id}/`);
            setAccount(accountData);

            // Fetch account transactions
            const transactionsData = await financeApi.get<Transaction[]>(`/accounts/${id}/transactions/`);
            setTransactions(transactionsData);
        } catch (error) {
            console.error('Error fetching account detail:', error);
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
                    <div className="text-sm text-muted-foreground mt-2">Please wait while we load the account details</div>
                </div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Account not found</div>
                    <div className="text-sm text-muted-foreground mt-2">The account you're looking for doesn't exist</div>
                    <Button className="mt-4" onClick={() => navigate('/finance/accounts')}>
                        Back to Accounts
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/finance/accounts')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Accounts
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{account.nickname}</h1>
                    <p className="text-gray-600 mt-1">{account.account_name}</p>
                </div>
                <Button onClick={() => navigate(`/finance/accounts/${account.id}/edit`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Account
                </Button>
            </div>

            {/* Account Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Account Type</CardTitle>
                        {account.account_type === 'Bank' ? (
                            <CreditCard className="h-4 w-4 text-blue-600" />
                        ) : (
                            <Banknote className="h-4 w-4 text-green-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{account.account_type}</div>
                        <p className="text-xs text-muted-foreground">
                            {account.account_number || 'No account number'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(account.opening_balance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Initial balance
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Credited Amount</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(account.credited_amount)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total credits
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Debited Amount</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(account.debited_amount)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total debits
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(account.current_balance)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Current balance
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Account Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Account Name</label>
                            <p className="text-lg">{account.account_name}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                            <p className="text-lg">{account.account_number || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <div className="mt-1">
                                <Badge variant={account.is_active ? 'default' : 'secondary'}>
                                    {account.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created</label>
                            <p className="text-lg">{formatDate(account.created_at)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Purpose</TableHead>
                                    <TableHead>Parties</TableHead>
                                    <TableHead>Reference</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{formatDate(transaction.time)}</div>
                                                <div className="text-sm text-muted-foreground">{formatDateTime(transaction.time)}</div>
                                            </div>
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
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No transactions found for this account</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
