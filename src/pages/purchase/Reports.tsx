import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    FileText,
    Users,
    Calendar,
    Download
} from "lucide-react";

interface ReportData {
    totalVendors: number;
    totalBills: number;
    totalAmount: number;
    outstandingAmount: number;
    paidAmount: number;
    monthlyData: Array<{
        month: string;
        bills: number;
        amount: number;
    }>;
    topVendors: Array<{
        name: string;
        totalAmount: number;
        billCount: number;
    }>;
    paymentMethods: Array<{
        method: string;
        count: number;
        amount: number;
    }>;
}

export default function Reports() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('month');

    useEffect(() => {
        // Mock data for now - replace with actual API calls
        const mockData: ReportData = {
            totalVendors: 25,
            totalBills: 156,
            totalAmount: 2450000,
            outstandingAmount: 125000,
            paidAmount: 2325000,
            monthlyData: [
                { month: 'Jan', bills: 12, amount: 180000 },
                { month: 'Feb', bills: 15, amount: 220000 },
                { month: 'Mar', bills: 18, amount: 280000 },
                { month: 'Apr', bills: 14, amount: 210000 },
                { month: 'May', bills: 16, amount: 240000 },
                { month: 'Jun', bills: 20, amount: 300000 }
            ],
            topVendors: [
                { name: "ABC Suppliers", totalAmount: 450000, billCount: 18 },
                { name: "XYZ Materials", totalAmount: 320000, billCount: 12 },
                { name: "DEF Components", totalAmount: 280000, billCount: 15 },
                { name: "GHI Parts", totalAmount: 250000, billCount: 10 },
                { name: "JKL Tools", totalAmount: 200000, billCount: 8 }
            ],
            paymentMethods: [
                { method: 'Bank Transfer', count: 45, amount: 1200000 },
                { method: 'UPI', count: 32, amount: 800000 },
                { method: 'Cash', count: 18, amount: 250000 },
                { method: 'Credit', count: 8, amount: 150000 }
            ]
        };

        setTimeout(() => {
            setReportData(mockData);
            setLoading(false);
        }, 1000);
    }, [selectedPeriod]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const getPaymentPercentage = (amount: number) => {
        if (!reportData) return 0;
        return ((amount / reportData.totalAmount) * 100).toFixed(1);
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading Reports...</div>
                </div>
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">No data available</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Purchase Reports</h1>
                    <p className="text-gray-600 mt-1">Analytics and insights for purchase management</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalVendors}</div>
                        <p className="text-xs text-muted-foreground">
                            Active suppliers
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalBills}</div>
                        <p className="text-xs text-muted-foreground">
                            Purchase bills
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(reportData.totalAmount)}</div>
                        <p className="text-xs text-muted-foreground">
                            All purchases
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(reportData.paidAmount)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {getPaymentPercentage(reportData.paidAmount)}% of total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(reportData.outstandingAmount)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {getPaymentPercentage(reportData.outstandingAmount)}% of total
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Monthly Purchase Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {reportData.monthlyData.map((month, index) => (
                                <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                                            {month.month}
                                        </div>
                                        <div>
                                            <div className="font-medium">{month.bills} bills</div>
                                            <div className="text-sm text-gray-600">{formatCurrency(month.amount)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-600">
                                            Avg: {formatCurrency(month.amount / month.bills)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Vendors */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Top Vendors by Amount
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {reportData.topVendors.map((vendor, index) => (
                                <div key={vendor.name} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium">{vendor.name}</div>
                                            <div className="text-sm text-gray-600">{vendor.billCount} bills</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">{formatCurrency(vendor.totalAmount)}</div>
                                        <div className="text-sm text-gray-600">
                                            {getPaymentPercentage(vendor.totalAmount)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Methods Analysis */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Payment Methods Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {reportData.paymentMethods.map((method) => (
                            <div key={method.method} className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium">{method.method}</h3>
                                    <Badge variant="secondary">{method.count}</Badge>
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                    {formatCurrency(method.amount)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {getPaymentPercentage(method.amount)}% of total
                                </div>
                                <div className="mt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-600 h-2 rounded-full"
                                            style={{ width: `${getPaymentPercentage(method.amount)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
