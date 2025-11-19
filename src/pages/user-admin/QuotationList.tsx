import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { shopQuotationsApi } from '@/lib/shop-api';
import { formatDate } from '@/utils/formatters';
import QuotationStatsCards from '@/components/QuotationStatsCards';
import {
    Activity,
    Download,
    FileText,
    CalendarDays,
    ChevronsLeft,
    ChevronsRight,
    Building2,
    IndianRupee,
    Eye,
    Receipt,
    User,
    Phone,
    Mail,
    ExternalLink,
    MessageCircle,
} from 'lucide-react';
import {
    ApiResponse,
    Quotation,
    QuotationStats,
} from '@/types/quotation-list';

// Constants
const PAGE_SIZE = 20;
const MAX_PAGES_TO_SHOW = 5;

const getStats = (
    quotationListData: Quotation[],
    totalCount: number,
): QuotationStats => {
    const now = new Date();
    let todayCount = 0,
        recentCount = 0;
    quotationListData.forEach(({ created_at }) => {
        const d = new Date(created_at);
        if (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
        )
            todayCount++;
        if (now.getTime() - d.getTime() < 24 * 60 * 60 * 1000) recentCount++;
    });
    return { todayCount, recentCount, totalCount };
};

// Memoized table row component for better performance
const QuotationRow = React.memo(({ quote, index, offset, onSendWhatsapp, sendingWhatsapp }: { 
    quote: Quotation; 
    index: number; 
    offset: number;
    onSendWhatsapp: (quotationNo: string) => void;
    sendingWhatsapp: string | null;
}) => {
    const displayIndex = offset + index + 1;
    const downloadHref = quote.quotation_pdf;
    const quotationLabel = quote.summary?.org_name || `#${quote.quotation_no ?? '—'}`;
    const createdOn = formatDate(quote.created_at);
    const customerName = quote.summary?.name || '—';
    const contactNo = quote.summary?.contact_no || '—';
    const emailAddress = quote.summary?.email || '—';
    const totalDisplay = quote.summary?.total_after_discount != null
        ? `₹ ${quote.summary.total_after_discount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
        : '—';
    const hasContact = contactNo && contactNo !== '—' && contactNo.trim().length > 0;

    return (
        <TableRow
            key={quote.id || index}
            className={`hover:bg-muted/20 transition-colors`}
        >
            <TableCell className="text-center">
                <Badge
                    variant="outline"
                    className="h-6 w-8 justify-center font-mono text-xs"
                >
                    {displayIndex}
                </Badge>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="bg-muted/50 rounded p-1">
                        <CalendarDays className="text-muted-foreground h-3 w-3" />
                    </div>
                    <span className="text-sm font-medium">
                        {createdOn}
                    </span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 rounded p-1">
                        <Building2 className="text-primary h-3 w-3" />
                    </div>
                    <span className="max-w-[220px] truncate text-sm font-medium text-muted-foreground">
                        {quotationLabel}
                    </span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="rounded bg-blue-100 p-1 dark:bg-blue-900/30">
                        <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                        {customerName}
                    </span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="rounded bg-green-100 p-1 dark:bg-green-900/30">
                        <Phone className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                        {contactNo}
                    </span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="rounded bg-purple-100 p-1 dark:bg-purple-900/30">
                        <Mail className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="max-w-[180px] truncate text-sm text-muted-foreground">
                        {emailAddress}
                    </span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center justify-end gap-1">
                    <IndianRupee className="h-3 w-3 text-green-600" />
                    <span className="font-semibold text-green-600 dark:text-green-400">
                        {totalDisplay}
                    </span>
                </div>
            </TableCell>

            <TableCell>
                <Badge
                    variant="outline"
                    className="hover:bg-muted/50 cursor-pointer gap-1 transition-colors"
                >
                    <Download className="h-3 w-3" />
                    <a
                        href={downloadHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium hover:underline"
                    >
                        PDF
                    </a>
                </Badge>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className={`hover:bg-primary hover:text-primary-foreground' gap-2 transition-all duration-200`}
                        title={'View quotation details'}
                    >
                        <Link
                            to={`/user-admin/create-quote?quotation_no=${quote.quotation_no}&quotation_json=${quote.quotation_json}&quotation_pdf=${quote.quotation_pdf}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Eye className="h-3 w-3" />
                            View
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    </Button>
                    {quote.quotation_no && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSendWhatsapp(quote.quotation_no!)}
                            disabled={sendingWhatsapp === quote.quotation_no || !hasContact}
                            className="gap-1.5 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 font-medium"
                            title={hasContact ? "Send via WhatsApp" : "Contact number required"}
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="text-xs">{sendingWhatsapp === quote.quotation_no ? 'Sending...' : 'WhatsApp'}</span>
                        </Button>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
});

export default function QuotationList() {
    const [quotationListData, setQuotationListData] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [sendingWhatsapp, setSendingWhatsapp] = useState<string | null>(null);
    const [stats, setStats] = useState<QuotationStats>({
        todayCount: 0,
        recentCount: 0,
        totalCount: 0,
    });

    const offset = useMemo(() => (currentPage - 1) * PAGE_SIZE, [currentPage]);
    const totalPages = useMemo(() => Math.ceil(totalItems / PAGE_SIZE), [totalItems]);

    useEffect(() => {
        const fetchQuotationListData = async () => {
            setLoading(true);
            try {
                const response = await shopApi.get<ApiResponse>(
                    `/shop/generate-quotation-shop/?limit=${PAGE_SIZE}&offset=${offset}`
                );

                if (response.error === true) {
                    throw new Error('Failed to fetch quotations');
                }

                setQuotationListData(response.data || []);
                setTotalItems(response.count || 0);
                setStats(getStats(response.data || [], response.count || 0));
                // Remove success toast for better UX - only show errors
            } catch (error) {
                console.error('Error fetching quotations:', error);
                setQuotationListData([]);
                setTotalItems(0);
                setStats({ todayCount: 0, recentCount: 0, totalCount: 0 });
                toast.error('Failed to fetch quotations');
            }
            setLoading(false);
        };
        fetchQuotationListData();
    }, [currentPage]);

    const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);

    const handleSendWhatsapp = async (quotationNo: string) => {
        setSendingWhatsapp(quotationNo);
        try {
            const result = await shopQuotationsApi.sendWhatsapp(quotationNo);
            if (result.error) {
                toast.error(result.data?.message || 'Failed to send WhatsApp');
            } else {
                toast.success(result.data?.message || 'Quotation PDF sent via WhatsApp');
            }
        } catch (e: any) {
            const msg = e?.response?.data?.data || e?.message || 'Unknown error';
            toast.error(`Failed to send WhatsApp: ${msg}`);
        } finally {
            setSendingWhatsapp(null);
        }
    };

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
                <QuotationStatsCards
                    stats={stats}
                    icons={{
                        FileText,
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
                                <FileText className="text-primary h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-foreground text-xl font-semibold">
                                    Quotation Records
                                </CardTitle>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    Manage and view all quotation records
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-medium">
                                {totalItems} Total
                            </Badge>
                            <Link to="/user-admin/create-quote?load_draft=true">
                                <Button variant="outline">
                                    Load Draft
                                    <FileText className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link to="/user-admin/create-quote">
                                <Button>
                                    Generate New Quote
                                    <Receipt className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
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
                                                Created
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
                                            <div className="flex items-center justify-end gap-2">
                                                <IndianRupee className="h-4 w-4" />
                                                Total
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-fit font-semibold">PDF</TableHead>
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
                                                <TableCell className="text-right">
                                                    <Skeleton className="ml-auto h-4 w-20 rounded" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-8 w-16 rounded" />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Skeleton className="ml-auto h-8 w-24 rounded" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : quotationListData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-32 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="bg-muted rounded-full p-3">
                                                        <FileText className="text-muted-foreground h-8 w-8" />
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground text-lg font-medium">
                                                            No quotations found
                                                        </p>
                                                        <p className="text-muted-foreground/80 text-sm">
                                                            Create your first quotation to get started
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        quotationListData.map((quote, index) => (
                                            <QuotationRow
                                                key={quote.id || index}
                                                quote={quote}
                                                index={index}
                                                offset={offset}
                                                onSendWhatsapp={handleSendWhatsapp}
                                                sendingWhatsapp={sendingWhatsapp}
                                            />
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
                            quotations
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


