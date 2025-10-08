import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    FileText,
    CreditCard,
    TrendingUp,
    Plus,
    Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { purchaseApi, type Vendor, type PurchaseBill } from "@/lib/api";

interface DashboardStatsResponse {
    total_vendors: number;
    total_bills: number;
    total_amount: number;
    outstanding_amount: number;
    paid_amount: number;
    recent_activity: Array<{
        type: string;
        message: string;
        time: string;
        time_display: string;
        icon: string;
        amount?: number;
    }>;
}

interface DashboardStats {
    totalVendors: number;
    totalBills: number;
    totalAmount: number;
    outstandingAmount: number;
    paidAmount: number;
    recentBills: Array<{
        id: number;
        vendor: string;
        billNumber: string;
        amount: number;
        date: string;
        status: 'paid' | 'partial' | 'pending' | 'outstanding';
    }>;
    topVendors: Array<{
        id: number;
        name: string;
        totalAmount: number;
        billCount: number;
    }>;
    recentActivity: Array<{
        type: string;
        message: string;
        time: string;
        time_display: string;
        icon: string;
        amount?: number;
    }>;
}

export default function PurchaseDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        totalVendors: 0,
        totalBills: 0,
        totalAmount: 0,
        outstandingAmount: 0,
        paidAmount: 0,
        recentBills: [],
        topVendors: [],
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch dashboard stats
                const statsResponse = await purchaseApi.dashboardStats();
                const statsData = statsResponse as DashboardStatsResponse; // API returns data directly, not wrapped in .data

                // Fetch recent bills
                const recentBillsResponse = await purchaseApi.bills.recent(5);
                const recentBills = recentBillsResponse.map((bill: PurchaseBill) => ({
                    id: bill.id,
                    vendor: bill.vendor.name,
                    billNumber: bill.bill_number,
                    amount: bill.total_amount,
                    date: bill.bill_date,
                    status: (bill.outstanding_amount === 0 ? 'paid' : bill.paid_amount > 0 ? 'partial' : 'pending') as 'paid' | 'partial' | 'pending' | 'outstanding'
                }));

                // Fetch vendors and calculate top vendors
                const vendorsResponse = await purchaseApi.vendors.list();
                const vendors = Array.isArray(vendorsResponse) ? vendorsResponse : [];

                // Calculate top vendors by getting their payment summaries
                const topVendorsPromises = vendors.slice(0, 5).map(async (vendor: Vendor) => {
                    try {
                        const paymentSummary = await purchaseApi.vendors.paymentSummary(vendor.id);
                        return {
                            id: vendor.id,
                            name: vendor.name,
                            totalAmount: paymentSummary.total_outstanding || 0,
                            billCount: paymentSummary.total_bills || 0
                        };
                    } catch (error) {
                        console.error(`Failed to fetch summary for vendor ${vendor.id}:`, error);
                        return {
                            id: vendor.id,
                            name: vendor.name,
                            totalAmount: 0,
                            billCount: 0
                        };
                    }
                });

                const topVendors = await Promise.all(topVendorsPromises);
                topVendors.sort((a, b) => b.totalAmount - a.totalAmount);

                const dashboardStats: DashboardStats = {
                    totalVendors: statsData.total_vendors || 0,
                    totalBills: statsData.total_bills || 0,
                    totalAmount: statsData.total_amount || 0,
                    outstandingAmount: statsData.outstanding_amount || 0,
                    paidAmount: statsData.paid_amount || 0,
                    recentBills,
                    topVendors: topVendors.slice(0, 3),
                    recentActivity: statsData.recent_activity || []
                };

                setStats(dashboardStats);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                // Fallback to empty stats
                setStats({
                    totalVendors: 0,
                    totalBills: 0,
                    totalAmount: 0,
                    outstandingAmount: 0,
                    paidAmount: 0,
                    recentBills: [],
                    topVendors: [],
                    recentActivity: []
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partial': return 'bg-yellow-100 text-yellow-800';
            case 'pending': return 'bg-blue-100 text-blue-800';
            case 'outstanding': return 'bg-blue-100 text-blue-800'; // Keep for backward compatibility
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading Purchase Dashboard...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Purchase Dashboard</h1>
                    <p className="text-gray-600 mt-1">Manage vendors, purchase bills, and payments</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => navigate('/purchase/vendors/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Vendor
                    </Button>
                    <Button onClick={() => navigate('/purchase/bills/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Bill
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalVendors}</div>
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
                        <div className="text-2xl font-bold">{stats.totalBills}</div>
                        <p className="text-xs text-muted-foreground">
                            Purchase bills
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
                        <p className="text-xs text-muted-foreground">
                            All purchases
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</div>
                        <p className="text-xs text-muted-foreground">
                            Total payments made
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Bills and Top Vendors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Bills */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Recent Purchase Bills
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentBills.map((bill) => (
                                <div
                                    key={bill.id}
                                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => navigate(`/purchase/bills/${bill.id}`)}
                                >
                                    <div className="flex-1">
                                        <div className="font-medium">{bill.vendor}</div>
                                        <div className="text-sm text-gray-600">{bill.billNumber}</div>
                                        <div className="text-sm text-gray-500">{bill.date}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">{formatCurrency(bill.amount)}</div>
                                        <Badge className={getStatusColor(bill.status)}>
                                            {bill.status}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/purchase/bills/${bill.id}`);
                                        }}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => navigate('/purchase/bills')}
                            >
                                View All Bills
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Vendors */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Top Vendors
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.topVendors.map((vendor, index) => (
                                <div key={vendor.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium">{vendor.name}</div>
                                            <div className="text-sm text-gray-600">{vendor.billCount} bills</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">{formatCurrency(vendor.totalAmount)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => navigate('/purchase/vendors')}
                            >
                                View All Vendors
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            {stats.recentActivity.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentActivity.map((activity, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        {activity.icon === 'bill' && <FileText className="h-4 w-4 text-blue-600" />}
                                        {activity.icon === 'payment' && <CreditCard className="h-4 w-4 text-green-600" />}
                                        {activity.icon === 'vendor' && <Users className="h-4 w-4 text-purple-600" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{activity.message}</div>
                                        <div className="text-sm text-gray-500">{activity.time_display}</div>
                                    </div>
                                    {activity.amount && (
                                        <div className="text-right">
                                            <div className="font-medium">{formatCurrency(activity.amount)}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
