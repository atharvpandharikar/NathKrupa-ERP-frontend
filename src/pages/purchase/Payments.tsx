import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Plus,
    Search,
    Eye,
    CreditCard,
    Calendar,
    DollarSign,
    FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { safeNumber } from "@/lib/utils";

interface Payment {
    id: number;
    bill: {
        id: number;
        billNumber: string;
        vendor: {
            name: string;
        };
    };
    amount: number;
    paymentDate: string;
    mode: 'Cash' | 'Bank' | 'UPI' | 'Credit';
    note: string;
    createdAt: string;
}

export default function Payments() {
    const navigate = useNavigate();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Mock data for now - replace with actual API calls
        const mockPayments: Payment[] = [
            {
                id: 1,
                bill: {
                    id: 1,
                    billNumber: "PB-2024-001",
                    vendor: { name: "ABC Suppliers" }
                },
                amount: 15000,
                paymentDate: "2024-01-16",
                mode: 'Bank',
                note: "Partial payment for urgent materials",
                createdAt: "2024-01-16T10:30:00Z"
            },
            {
                id: 2,
                bill: {
                    id: 2,
                    billNumber: "PB-2024-002",
                    vendor: { name: "XYZ Materials" }
                },
                amount: 15000,
                paymentDate: "2024-01-15",
                mode: 'UPI',
                note: "Full payment",
                createdAt: "2024-01-15T14:20:00Z"
            },
            {
                id: 3,
                bill: {
                    id: 3,
                    billNumber: "PB-2024-003",
                    vendor: { name: "DEF Components" }
                },
                amount: 20000,
                paymentDate: "2024-01-14",
                mode: 'Cash',
                note: "Advance payment",
                createdAt: "2024-01-14T09:15:00Z"
            }
        ];

        setTimeout(() => {
            setPayments(mockPayments);
            setLoading(false);
        }, 1000);
    }, []);

    const filteredPayments = payments.filter(payment =>
        payment.bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.bill.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.note.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPaymentModeColor = (mode: string) => {
        switch (mode) {
            case 'Cash': return 'bg-green-100 text-green-800';
            case 'Bank': return 'bg-blue-100 text-blue-800';
            case 'UPI': return 'bg-purple-100 text-purple-800';
            case 'Credit': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
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
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate summary stats
    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);
    const todayPayments = payments.filter(payment =>
        new Date(payment.paymentDate).toDateString() === new Date().toDateString()
    ).length;

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading Payments...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-600 mt-1">Track and manage purchase payments</p>
                </div>
                <Button onClick={() => navigate('/purchase/payments/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPayments}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Payments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{todayPayments}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search payments by bill number, vendor, or note..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Payments ({filteredPayments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bill Number</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Payment Date</TableHead>
                                    <TableHead>Mode</TableHead>
                                    <TableHead>Note</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.map((payment) => (
                                    <TableRow
                                        key={payment.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => navigate(`/purchase/bills/${payment.bill.id}`)}
                                    >
                                        <TableCell>
                                            <div className="font-medium">{payment.bill.billNumber}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-gray-400" />
                                                {payment.bill.vendor.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-green-600">
                                                {formatCurrency(safeNumber(payment.amount))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                {formatDate(payment.paymentDate)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getPaymentModeColor(payment.mode)}>
                                                {payment.mode}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-gray-600 max-w-xs truncate">
                                                {payment.note}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/purchase/bills/${payment.bill.id}`)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
