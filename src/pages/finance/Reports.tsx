import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    FileText,
    Download,
    Calendar,
    Filter,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { financeApi } from '@/lib/api';

// Types for API data
interface Account {
    id: number;
    nickname: string;
    account_name: string;
    type: string;
    balance: number;
    credited_amount: number;
    debited_amount: number;
}

interface Transaction {
    id: number;
    account: number;
    account_nickname: string;
    transaction_type: string;
    amount: number;
    from_party: string;
    to_party: string;
    purpose: string;
    bill_no: string;
    utr_number: string;
    time: string;
    created_at: string;
}

interface TransactionSummary {
    total_credit: number;
    total_debit: number;
    net_amount: number;
    transaction_count: number;
}

interface OverallBalance {
    total_balance: number;
    accounts: Account[];
}

interface FinancialData {
    accounts: Account[];
    transactions: Transaction[];
    summary: TransactionSummary;
    overallBalance: OverallBalance;
    loading: boolean;
    error: string | null;
}

const Reports = () => {
    const [dateRange, setDateRange] = useState({
        from: subDays(new Date(), 30),
        to: new Date()
    });
    const [selectedReport, setSelectedReport] = useState('overview');
    const [isLoading, setIsLoading] = useState(false);
    const [financialData, setFinancialData] = useState<FinancialData>({
        accounts: [],
        transactions: [],
        summary: { total_credit: 0, total_debit: 0, net_amount: 0, transaction_count: 0 },
        overallBalance: { total_balance: 0, accounts: [] },
        loading: true,
        error: null
    });

    // Fetch financial data from API
    const fetchFinancialData = async () => {
        try {
            setFinancialData(prev => ({ ...prev, loading: true, error: null }));

            const fromDate = format(dateRange.from, 'yyyy-MM-dd');
            const toDate = format(dateRange.to, 'yyyy-MM-dd');

            // Fetch all data in parallel
            const [accountsResponse, transactionsResponse, summaryResponse, overallBalanceResponse] = await Promise.all([
                financeApi.get<Account[]>('/accounts/'),
                financeApi.get<Transaction[]>(`/transactions/?from_date=${fromDate}&to_date=${toDate}`),
                financeApi.get<TransactionSummary>(`/transactions/summary/?from_date=${fromDate}&to_date=${toDate}`),
                financeApi.get<OverallBalance>('/reports/overall-balance/')
            ]);

            setFinancialData({
                accounts: accountsResponse,
                transactions: transactionsResponse,
                summary: summaryResponse,
                overallBalance: overallBalanceResponse,
                loading: false,
                error: null
            });
        } catch (error) {
            console.error('Error fetching financial data:', error);
            setFinancialData(prev => ({
                ...prev,
                loading: false,
                error: 'Failed to fetch financial data'
            }));
        }
    };

    // Load data on component mount and when date range changes
    useEffect(() => {
        fetchFinancialData();
    }, [dateRange]);

    const handleGenerateReport = async () => {
        setIsLoading(true);
        await fetchFinancialData();
        setIsLoading(false);
    };

    // Format currency in rupees
    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };


    // Export to Excel
    const handleExportExcel = async () => {
        try {
            const XLSX = await import('xlsx');

            const workbook = (XLSX as any).utils.book_new();

            // Summary sheet
            const summaryData = [
                ['Metric', 'Value'],
                ['Total Credit', financialData.summary.total_credit],
                ['Total Debit', financialData.summary.total_debit],
                ['Net Amount', financialData.summary.net_amount],
                ['Transaction Count', financialData.summary.transaction_count],
                ['Total Balance', financialData.overallBalance.total_balance]
            ];
            const summarySheet = (XLSX as any).utils.aoa_to_sheet(summaryData);
            (XLSX as any).utils.book_append_sheet(workbook, summarySheet, 'Summary');

            // Accounts sheet
            const accountData = [
                ['Nickname', 'Account Name', 'Type', 'Balance'],
                ...financialData.overallBalance.accounts.map(account => [
                    account.nickname,
                    account.account_name,
                    account.type,
                    account.balance
                ])
            ];
            const accountSheet = (XLSX as any).utils.aoa_to_sheet(accountData);
            (XLSX as any).utils.book_append_sheet(workbook, accountSheet, 'Accounts');

            // Transactions sheet
            const transactionData = [
                ['Date', 'Account', 'Type', 'Amount', 'From Party', 'To Party', 'Purpose', 'Bill No', 'UTR'],
                ...financialData.transactions.map(transaction => [
                    format(new Date(transaction.time), 'yyyy-MM-dd'),
                    transaction.account_nickname,
                    transaction.transaction_type,
                    transaction.amount,
                    transaction.from_party,
                    transaction.to_party,
                    transaction.purpose,
                    transaction.bill_no,
                    transaction.utr_number
                ])
            ];
            const transactionSheet = (XLSX as any).utils.aoa_to_sheet(transactionData);
            (XLSX as any).utils.book_append_sheet(workbook, transactionSheet, 'Transactions');

            (XLSX as any).writeFile(workbook, `finance-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        } catch (error) {
            console.error('Error generating Excel:', error);
            alert('Failed to generate Excel file. Please try again.');
        }
    };

    const handleExportReport = (format: string) => {
        if (format === 'excel') {
            handleExportExcel();
        }
    };

    // Show loading state
    if (financialData.loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading financial data...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (financialData.error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{financialData.error}</p>
                    <Button onClick={fetchFinancialData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Finance Reports</h1>
                    <p className="text-muted-foreground">
                        Comprehensive financial analysis and reporting
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchFinancialData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={handleGenerateReport} disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <FileText className="h-4 w-4 mr-2" />
                        )}
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Report Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date-range">Date Range</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    value={format(dateRange.from, 'yyyy-MM-dd')}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                                    className="flex-1"
                                />
                                <Input
                                    type="date"
                                    value={format(dateRange.to, 'yyyy-MM-dd')}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="report-type">Report Type</Label>
                            <Select value={selectedReport} onValueChange={setSelectedReport}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select report type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="overview">Financial Overview</SelectItem>
                                    <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                                    <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                                    <SelectItem value="cash-flow">Cash Flow</SelectItem>
                                    <SelectItem value="aging">Aging Report</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="export-format">Quick Export</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExportReport('excel')}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Quick Excel
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reports Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="profit-loss">P&L</TabsTrigger>
                    <TabsTrigger value="balance-sheet">Accounts</TabsTrigger>
                    <TabsTrigger value="cash-flow">Summary</TabsTrigger>
                    <TabsTrigger value="aging">Transactions</TabsTrigger>
                </TabsList>

                {/* Financial Overview */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(financialData.summary.total_credit)}</div>
                                <p className="text-xs text-muted-foreground">
                                    <TrendingUp className="inline h-3 w-3 mr-1" />
                                    Total income for period
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
                                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(financialData.summary.total_debit)}</div>
                                <p className="text-xs text-muted-foreground">
                                    <TrendingDown className="inline h-3 w-3 mr-1" />
                                    Total expenses for period
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${financialData.summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(financialData.summary.net_amount)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {financialData.summary.net_amount >= 0 ? (
                                        <TrendingUp className="inline h-3 w-3 mr-1" />
                                    ) : (
                                        <TrendingDown className="inline h-3 w-3 mr-1" />
                                    )}
                                    Net position for period
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                                <PieChart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(financialData.overallBalance.total_balance)}</div>
                                <p className="text-xs text-muted-foreground">
                                    <TrendingUp className="inline h-3 w-3 mr-1" />
                                    Across all accounts
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Transaction Count</CardTitle>
                                <CardDescription>Total transactions in period</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600">
                                    {financialData.summary.transaction_count}
                                </div>
                                <div className="mt-2">
                                    <Badge variant="secondary">Active Period</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Account Count</CardTitle>
                                <CardDescription>Total active accounts</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-600">
                                    {financialData.overallBalance.accounts.length}
                                </div>
                                <div className="mt-2">
                                    <Badge variant="secondary">Active Accounts</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Profit & Loss */}
                <TabsContent value="profit-loss" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profit & Loss Statement</CardTitle>
                            <CardDescription>
                                Period: {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="font-medium">Total Credit (Income)</span>
                                    <span className="font-bold text-green-600">{formatCurrency(financialData.summary.total_credit)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="font-medium">Total Debit (Expenses)</span>
                                    <span className="font-bold text-red-600">{formatCurrency(financialData.summary.total_debit)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b-2 border-primary">
                                    <span className="font-bold text-lg">Net Amount</span>
                                    <span className={`font-bold text-lg ${financialData.summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(financialData.summary.net_amount)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Balance Sheet */}
                <TabsContent value="balance-sheet" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Balances</CardTitle>
                            <CardDescription>
                                As of {format(dateRange.to, 'MMM dd, yyyy')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {financialData.overallBalance.accounts.map((account) => (
                                    <div key={account.id} className="flex justify-between items-center p-4 border rounded-lg">
                                        <div>
                                            <div className="font-medium">{account.nickname}</div>
                                            <div className="text-sm text-muted-foreground">{account.account_name}</div>
                                            <div className="text-xs text-muted-foreground">{account.type}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold text-lg ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(account.balance)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center p-4 border-t-2 border-primary font-bold">
                                    <span>Total Balance</span>
                                    <span className={`text-xl ${financialData.overallBalance.total_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(financialData.overallBalance.total_balance)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cash Flow */}
                <TabsContent value="cash-flow" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction Summary</CardTitle>
                            <CardDescription>
                                Period: {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="font-medium">Total Credit Transactions</span>
                                    <span className="font-bold text-green-600">{formatCurrency(financialData.summary.total_credit)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="font-medium">Total Debit Transactions</span>
                                    <span className="font-bold text-red-600">{formatCurrency(financialData.summary.total_debit)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="font-medium">Transaction Count</span>
                                    <span className="font-bold">{financialData.summary.transaction_count}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b-2 border-primary">
                                    <span className="font-bold text-lg">Net Cash Flow</span>
                                    <span className={`font-bold text-lg ${financialData.summary.net_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(financialData.summary.net_amount)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recent Transactions */}
                <TabsContent value="aging" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>
                                Latest transactions for the selected period
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {financialData.transactions.slice(0, 10).map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="font-medium">{transaction.purpose}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {transaction.account_nickname} • {format(new Date(transaction.time), 'MMM dd, yyyy')}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {transaction.from_party} → {transaction.to_party}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold ${transaction.transaction_type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {transaction.transaction_type === 'Credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {transaction.transaction_type}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {financialData.transactions.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No transactions found for the selected period
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Reports;
