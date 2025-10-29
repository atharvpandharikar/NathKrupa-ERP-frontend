import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationPrevious,
    PaginationNext,
    PaginationEllipsis,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import { shopApi } from '@/lib/api';
import { formatDate } from '@/utils/formatters';
import {
    Activity,
    Download,
    FileText,
    CalendarDays,
    ExternalLink,
    ChevronsLeft,
    ChevronsRight,
    Building2,
    User,
    Phone,
    Mail,
    IndianRupee,
    Eye,
    Receipt,
    Users,
    ShoppingCart,
    Star,
    MapPin,
} from 'lucide-react';

// Types
interface Customer {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone_number?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    total_orders: number;
    total_spent: number;
    last_order_date?: string;
    organization_name?: string;
    source: 'user_auth' | 'quotation';
    billing_address_1?: string;
    billing_address_2?: string;
    city?: string;
    state?: string;
    pin_code?: string;
    gst_no?: string;
}

interface CustomerStats {
    totalCustomers: number;
    activeCustomers: number;
    newCustomersToday: number;
    totalOrders: number;
    totalRevenue: number;
}

interface ApiResponse {
    error: boolean;
    count: number;
    data: Customer[];
}

// Constants
const PAGE_SIZE = 20;
const MAX_PAGES_TO_SHOW = 5;

const getStats = (
    customerListData: Customer[],
    totalCount: number,
): CustomerStats => {
    const now = new Date();
    let activeCustomers = 0;
    let newCustomersToday = 0;
    let totalOrders = 0;
    let totalRevenue = 0;

    customerListData.forEach((customer) => {
        if (customer.is_active) activeCustomers++;

        const joinDate = new Date(customer.created_at);
        if (
            joinDate.getFullYear() === now.getFullYear() &&
            joinDate.getMonth() === now.getMonth() &&
            joinDate.getDate() === now.getDate()
        ) {
            newCustomersToday++;
        }

        totalOrders += customer.total_orders;
        totalRevenue += customer.total_spent;
    });

    return {
        totalCustomers: totalCount,
        activeCustomers,
        newCustomersToday,
        totalOrders,
        totalRevenue,
    };
};

const CustomerStatsCards: React.FC<{
    stats: CustomerStats;
    icons: {
        Users: React.ComponentType<{ className?: string }>;
        Activity: React.ComponentType<{ className?: string }>;
        CalendarDays: React.ComponentType<{ className?: string }>;
    };
}> = ({ stats, icons: { Users, Activity, CalendarDays } }) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Total Customers
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalCustomers}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                    All registered customers
                </p>
            </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                    Active Customers
                </CardTitle>
                <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.activeCustomers}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                    Currently active accounts
                </p>
            </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    New Today
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.newCustomersToday}
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                    Registered today
                </p>
            </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Total Orders
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {stats.totalOrders}
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                    All customer orders
                </p>
            </CardContent>
        </Card>
    </div>
);

export default function CustomerList() {
    const [customerListData, setCustomerListData] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [stats, setStats] = useState<CustomerStats>({
        totalCustomers: 0,
        activeCustomers: 0,
        newCustomersToday: 0,
        totalOrders: 0,
        totalRevenue: 0,
    });

    const offset = (currentPage - 1) * PAGE_SIZE;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    useEffect(() => {
        const fetchCustomerListData = async () => {
            setLoading(true);
            try {
                console.log('Fetching customers from API...');
                const response = await shopApi.get<ApiResponse>(
                    `/shop/customers/?limit=${PAGE_SIZE}&offset=${offset}`
                );
                console.log('API Response:', response);

                if (response.error === true) {
                    throw new Error('Failed to fetch customers');
                }

                setCustomerListData(response.data || []);
                setTotalItems(response.count || 0);
                setStats(getStats(response.data || [], response.count || 0));
                toast.success(`Fetched ${response.count} customers successfully!`);
            } catch (error) {
                console.error('Error fetching customers:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                console.error('Error details:', errorMessage);
                setCustomerListData([]);
                setTotalItems(0);
                setStats({ totalCustomers: 0, activeCustomers: 0, newCustomersToday: 0, totalOrders: 0, totalRevenue: 0 });
                toast.error(`Failed to fetch customers: ${errorMessage}`);
            }
            setLoading(false);
        };
        fetchCustomerListData();
    }, [currentPage]);

    const handlePageChange = (page: number) => setCurrentPage(page);

    const renderPageNumbers = () => {
        if (totalPages <= 1) return null;
        let start = Math.max(currentPage - Math.floor(MAX_PAGES_TO_SHOW / 2), 1);
        const end = Math.min(start + MAX_PAGES_TO_SHOW - 1, totalPages);
        if (end - start < MAX_PAGES_TO_SHOW - 1)
            start = Math.max(end - MAX_PAGES_TO_SHOW + 1, 1);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
            i => (
                <PaginationItem key={i}>
                    <PaginationLink
                        href="#"
                        isActive={currentPage === i}
                        onClick={e => {
                            e.preventDefault();
                            handlePageChange(i);
                        }}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>
            ),
        );
    };

    return (
        <div className="mx-auto max-w-[95%]">
            <div className="mb-6">
                <CustomerStatsCards
                    stats={stats}
                    icons={{
                        Users,
                        Activity,
                        CalendarDays,
                    }}
                />
            </div>

            {/* Main Content Card */}
            <Card className="bg-card/50 border-0 shadow-sm backdrop-blur-sm">
                <CardHeader className="bg-secondary/10 rounded-t-3xl border-b backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 rounded-lg p-2">
                                <Users className="text-primary h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-foreground text-xl font-semibold">
                                    Customer Records
                                </CardTitle>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    Manage and view all customer records
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-medium">
                                {totalItems} Total
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Table Container with proper scrolling */}
                    <div className="relative w-full">
                        <div className="overflow-x-auto">
                            <Table className="w-full min-w-[1200px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/40 border-b">
                                        <TableHead className="w-fit text-center font-semibold">
                                            #
                                        </TableHead>
                                        <TableHead className="w-fit font-semibold">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4" />
                                                Joined
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-fit font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                Organization
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-40 font-semibold">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                Customer
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-32 font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                Contact
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-48 font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Email
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-32 font-semibold">
                                            <div className="flex items-center justify-center gap-2">
                                                <ShoppingCart className="h-4 w-4" />
                                                Orders
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-32 font-semibold">
                                            <div className="flex items-center justify-end gap-2">
                                                <IndianRupee className="h-4 w-4" />
                                                Total Spent
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-fit font-semibold">Status</TableHead>
                                        <TableHead className="w-32 text-right font-semibold">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: PAGE_SIZE }).map((_, index) => (
                                            <TableRow key={index} className="hover:bg-muted/20">
                                                <TableCell className="text-center">
                                                    <Skeleton className="mx-auto h-6 w-8 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-32 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-36 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-28 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-24 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-4 w-40 rounded" />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Skeleton className="mx-auto h-4 w-12 rounded" />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Skeleton className="ml-auto h-4 w-20 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-6 w-16 rounded" />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Skeleton className="ml-auto h-8 w-24 rounded" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : customerListData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="h-32 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="bg-muted rounded-full p-3">
                                                        <Users className="text-muted-foreground h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground text-lg font-medium">
                                                            No customers found
                                                        </p>
                                                        <p className="text-muted-foreground/80 text-sm">
                                                            Customer data will appear here when available
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        customerListData.map((customer, index) => (
                                            <TableRow
                                                key={customer.id}
                                                className="hover:bg-muted/20 transition-colors"
                                            >
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className="h-6 w-8 justify-center font-mono text-xs"
                                                    >
                                                        {offset + index + 1}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-muted/50 rounded p-1">
                                                            <CalendarDays className="text-muted-foreground h-3 w-3" />
                                                        </div>
                                                        <span className="text-sm font-medium">
                                                            {formatDate(customer.created_at)}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-primary/10 rounded p-1">
                                                            <Building2 className="text-primary h-3 w-3" />
                                                        </div>
                                                        <span className="max-w-[200px] truncate text-sm font-medium">
                                                            {customer.organization_name || (
                                                                <span className="text-muted-foreground italic">
                                                                    No organization
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded bg-blue-100 p-1 dark:bg-blue-900/30">
                                                            <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">
                                                                {customer.full_name}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs w-fit ${customer.source === 'user_auth'
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                                    }`}
                                                            >
                                                                {customer.source === 'user_auth' ? 'Registered' : 'Quotation'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded bg-green-100 p-1 dark:bg-green-900/30">
                                                            <Phone className="h-3 w-3 text-green-600 dark:text-green-400" />
                                                        </div>
                                                        <span className="font-mono text-sm">
                                                            {customer.phone_number || (
                                                                <span className="text-muted-foreground italic">
                                                                    No phone
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded bg-purple-100 p-1 dark:bg-purple-900/30">
                                                            <Mail className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                                        </div>
                                                        <span className="max-w-[180px] truncate text-sm">
                                                            {customer.email}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <ShoppingCart className="h-3 w-3 text-blue-600" />
                                                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                            {customer.total_orders}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <IndianRupee className="h-3 w-3 text-green-600" />
                                                        <span className="font-semibold text-green-600 dark:text-green-400">
                                                            {customer.total_spent.toLocaleString('en-IN', {
                                                                maximumFractionDigits: 2,
                                                            })}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge
                                                        variant={customer.is_active ? "default" : "secondary"}
                                                        className={`${customer.is_active
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                                            }`}
                                                    >
                                                        {customer.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="hover:bg-primary hover:text-primary-foreground gap-2 transition-all duration-200"
                                                        title="View customer details"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="bg-muted/20 flex flex-col items-center justify-between gap-4 border-t p-4 sm:flex-row">
                        <div className="text-muted-foreground text-sm">
                            Showing{' '}
                            <span className="text-foreground font-medium">
                                {totalItems > 0 ? offset + 1 : 0}
                            </span>{' '}
                            to{' '}
                            <span className="text-foreground font-medium">
                                {Math.min(currentPage * PAGE_SIZE, totalItems)}
                            </span>{' '}
                            of{' '}
                            <span className="text-foreground font-medium">{totalItems}</span>{' '}
                            customers
                        </div>

                        {totalPages > 1 && (
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                handlePageChange(1);
                                            }}
                                            className={`${currentPage === 1
                                                ? 'pointer-events-none opacity-50'
                                                : ''
                                                }`}
                                            aria-label="First page"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </PaginationLink>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                if (currentPage > 1) handlePageChange(currentPage - 1);
                                            }}
                                            className={
                                                currentPage === 1
                                                    ? 'pointer-events-none opacity-50'
                                                    : ''
                                            }
                                        />
                                    </PaginationItem>
                                    {renderPageNumbers()}
                                    {totalPages > MAX_PAGES_TO_SHOW &&
                                        currentPage + 2 < totalPages && (
                                            <PaginationItem>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        )}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                if (currentPage < totalPages)
                                                    handlePageChange(currentPage + 1);
                                            }}
                                            className={
                                                currentPage === totalPages
                                                    ? 'pointer-events-none opacity-50'
                                                    : ''
                                            }
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            onClick={e => {
                                                e.preventDefault();
                                                handlePageChange(totalPages);
                                            }}
                                            className={`${currentPage === totalPages
                                                ? 'pointer-events-none opacity-50'
                                                : ''
                                                }`}
                                            aria-label="Last page"
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </PaginationLink>
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
