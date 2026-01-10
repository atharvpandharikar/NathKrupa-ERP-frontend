import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

import { financeApi, purchaseApi } from "@/lib/api";
import { useOptimizedTransactions, TransactionSortOption } from "@/hooks/useOptimizedData";
import { useToast } from "@/hooks/use-toast";
import { exportService, ExportJob } from "@/services/exportService";
import { useExportNotifications } from "@/context/ExportNotificationContext";
import TransactionForm from "@/components/TransactionForm";

/* =========================
   Types
========================= */

interface Transaction {
  id: number;
  account: number;
  account_nickname: string;
  transaction_type: "Credit" | "Debit";
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

interface Account {
  id: number;
  nickname: string;
  account_name: string;
  account_type: string;
}

interface Vendor {
  id: number;
  name: string;
  gst_number: string;
}

/* =========================
   Component
========================= */

export default function Transactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { trackJob } = useExportNotifications();

  const searchInputRef = useRef<HTMLInputElement>(null);

  /* =========================
     Filters & Pagination
  ========================= */

  const [filters, setFilters] = useState<{
    search: string;
    account: string;
    type: string;
    sort: TransactionSortOption;
    dateFrom: string;
    dateTo: string;
  }>({
    search: "",
    account: "all",
    type: "all",
    sort: "newest",
    dateFrom: "",
    dateTo: "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.account, filters.type, filters.dateFrom, filters.dateTo, filters.sort]);

  // Handle search input change with debounce
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  /* =========================
     Data
  ========================= */

  const { transactions, totalCount, loading, error, refresh } =
    useOptimizedTransactions(currentPage, pageSize, filters);

  const totalPages = Math.max(
    1,
    Math.ceil((totalCount || 1) / pageSize)
  );

  /* =========================
     Accounts & Vendors
  ========================= */

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsLoaded, setVendorsLoaded] = useState(false);
  const [vendorsError, setVendorsError] = useState<string | null>(null);

  useEffect(() => {
    financeApi
      .get<any>("/accounts/?limit=20&offset=0")
      .then((res) => setAccounts(res.results || res))
      .catch(console.error);
  }, []);

  const fetchVendors = useCallback(async () => {
    if (vendorsLoading) return;
    setVendorsLoading(true);
    try {
      const res: any = await purchaseApi.vendors.list();
      setVendors(res.results || res);
      setVendorsLoaded(true);
    } catch {
      setVendorsError("Failed to load vendors");
    } finally {
      setVendorsLoading(false);
    }
  }, [vendorsLoading]);

  /* =========================
     Create Dialog
  ========================= */

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  /* =========================
     Helpers
  ========================= */

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amt);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN");

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-IN");

  /* =========================
     Delete
  ========================= */

  const handleDelete = async (id: number) => {
    if (!confirm("Delete transaction?")) return;
    await financeApi.del(`/transactions/${id}/`);
    toast({ title: "Deleted successfully" });
    refresh();
  };

  /* =========================
     Export
  ========================= */

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [exportAccountId, setExportAccountId] = useState("all");
  const [exportTransactionType, setExportTransactionType] =
    useState<"Both" | "Credit" | "Debit">("Both");
  const [exportLoading, setExportLoading] = useState(false);

  // Convert data to CSV format
  const convertToCSV = (data: any) => {
    const transactions = data.transactions || [];
    const summary = data.summary || {};
    const filters = data.filters || {};

    // CSV Headers
    const headers = [
      'ID',
      'Account',
      'Account Nickname',
      'Transaction Type',
      'Amount',
      'From Party',
      'To Party',
      'Vendor',
      'Vendor Name',
      'Purpose',
      'Bill No',
      'UTR Number',
      'Time',
      'Created At'
    ];

    // Convert transactions to CSV rows
    const rows = transactions.map((t: any) => [
      t.id || '',
      t.account || '',
      t.account_nickname || '',
      t.transaction_type || '',
      t.amount || '',
      t.from_party || '',
      t.to_party || '',
      t.vendor || '',
      t.vendor_name || '',
      t.purpose || '',
      t.bill_no || '',
      t.utr_number || '',
      t.time || '',
      t.created_at || ''
    ]);

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    let csvContent = headers.map(escapeCSV).join(',') + '\n';
    rows.forEach((row: any[]) => {
      csvContent += row.map(escapeCSV).join(',') + '\n';
    });

    // Add summary section
    csvContent += '\n';
    csvContent += 'Summary\n';
    csvContent += `Total Count,${summary.total_count || 0}\n`;
    csvContent += `Credit Total,${summary.credit_total || 0}\n`;
    csvContent += `Debit Total,${summary.debit_total || 0}\n`;
    csvContent += `Net Amount,${summary.net_amount || 0}\n`;

    // Add filters section
    if (Object.keys(filters).length > 0) {
      csvContent += '\n';
      csvContent += 'Filters\n';
      if (filters.account_id) csvContent += `Account ID,${filters.account_id}\n`;
      if (filters.from_date) csvContent += `From Date,${filters.from_date}\n`;
      if (filters.to_date) csvContent += `To Date,${filters.to_date}\n`;
      if (filters.transaction_type) csvContent += `Transaction Type,${filters.transaction_type}\n`;
    }

    return csvContent;
  };

  // Download CSV file
  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate and download PDF
  const generatePDF = async (data: any) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const transactions = data.transactions || [];
    const summary = data.summary || {};
    const filters = data.filters || {};

    // Colors
    const primaryColor = [41, 128, 185]; // Blue
    const debitColor = [231, 76, 60]; // Red
    const creditColor = [39, 174, 96]; // Green
    const headerColor = [52, 73, 94]; // Dark gray
    const lightGray = [236, 240, 241];
    const borderColor = [189, 195, 199];

    // Helper function to format currency for PDF (without special symbols)
    const formatCurrencyPDF = (amount: number | string) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num || 0);
    };

    // Helper function to format date
    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    let startY = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header Section
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Statement', margin, 18);

    // Account and Date Range Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let infoY = 25;
    
    if (filters.account_id && accounts.find(a => a.id.toString() === filters.account_id)) {
      const account = accounts.find(a => a.id.toString() === filters.account_id);
      if (account) {
        doc.text(`Account: ${account.nickname || account.account_name}`, margin, infoY);
        infoY += 5;
        if ((account as any).account_number) {
          doc.text(`Account No: ${(account as any).account_number}`, margin, infoY);
          infoY += 5;
        }
      }
    }
    
    const dateRange = [];
    if (filters.from_date) dateRange.push(formatDate(filters.from_date));
    if (filters.to_date) dateRange.push(formatDate(filters.to_date));
    if (dateRange.length > 0) {
      doc.text(`Period: ${dateRange.join(' to ')}`, margin, infoY);
      infoY += 5;
    } else {
      doc.text(`Period: All Transactions`, margin, infoY);
      infoY += 5;
    }
    
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, margin, infoY);

    startY = 40;

    // Calculate initial balance (sum of all credits minus all debits, then work backwards)
    // For display purposes, we'll start from 0 and calculate forward
    // In a real scenario, you'd need the opening balance from the account
    let runningBalance = 0;
    
    // Sort transactions by date (oldest first) for proper balance calculation
    const sortedTransactions = [...transactions].sort((a: any, b: any) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });

    // Prepare table data
    const tableData = sortedTransactions.map((t: any, index: number) => {
      const amount = parseFloat(String(t.amount || 0));
      if (t.transaction_type === 'Credit') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }

      // Build particulars string
      const particularsParts = [];
      if (t.purpose) particularsParts.push(t.purpose);
      if (t.from_party) particularsParts.push(`From: ${t.from_party}`);
      if (t.to_party) particularsParts.push(`To: ${t.to_party}`);
      if (t.vendor_name) particularsParts.push(`Vendor: ${t.vendor_name}`);
      
      const particulars = particularsParts.length > 0 
        ? particularsParts.join(' | ') 
        : 'Transaction';

      return [
        index + 1,
        formatDate(t.time),
        particulars.substring(0, 65), // Limit length for better display
        t.bill_no || t.utr_number || '-',
        t.transaction_type === 'Debit' ? formatCurrencyPDF(amount) : '-',
        t.transaction_type === 'Credit' ? formatCurrencyPDF(amount) : '-',
        formatCurrencyPDF(runningBalance)
      ];
    });

    // Table headers
    const headers = [
      ['Sr No', 'Date', 'Particulars', 'Reference', 'Debit', 'Credit', 'Balance']
    ];

    // Generate table
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: startY,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: headerColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' }, // Sr No
        1: { cellWidth: 28, halign: 'center' }, // Date
        2: { cellWidth: 75, halign: 'left' }, // Particulars
        3: { cellWidth: 35, halign: 'left' }, // Reference
        4: { cellWidth: 32, halign: 'right' }, // Debit
        5: { cellWidth: 32, halign: 'right' }, // Credit
        6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' } // Balance
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      didParseCell: (data: any) => {
        // Color debit amounts red
        if (data.column.index === 4 && data.cell.text[0] !== '-') {
          data.cell.styles.textColor = debitColor;
        }
        // Color credit amounts green
        if (data.column.index === 5 && data.cell.text[0] !== '-') {
          data.cell.styles.textColor = creditColor;
        }
      },
      theme: 'striped',
      showHead: 'everyPage'
    });

    // Summary Section with improved design
    const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
    let summaryY = finalY + 15;

    // Summary box background
    doc.setFillColor(...lightGray);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.5);
    doc.rect(margin, summaryY - 8, pageWidth - (margin * 2), 40, 'FD');
    
    // Summary header
    doc.setFillColor(...primaryColor);
    doc.rect(margin, summaryY - 8, pageWidth - (margin * 2), 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', margin + 8, summaryY - 2);

    summaryY += 5;

    // Calculate totals
    const creditTotal = parseFloat(String(summary.credit_total || 0));
    const debitTotal = parseFloat(String(summary.debit_total || 0));
    const netAmount = parseFloat(String(summary.net_amount || 0));
    const totalCount = summary.total_count || transactions.length;

    // Helper to format numbers with commas
    const formatNumber = (num: number) => {
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    };

    // Summary items in a two-column layout
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...headerColor);
    
    const leftCol = margin + 10;
    const rightCol = margin + 100;
    const lineHeight = 7;

    // Left column
    doc.text('Total Transactions:', leftCol, summaryY);
    doc.setFont('helvetica', 'bold');
    doc.text(String(totalCount), leftCol + 50, summaryY);
    
    summaryY += lineHeight;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Total Credit:', leftCol, summaryY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...creditColor);
    doc.text(`Rs. ${formatNumber(creditTotal)}`, leftCol + 50, summaryY);
    
    summaryY += lineHeight;
    
    // Right column
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...headerColor);
    doc.text('Total Debit:', rightCol, summaryY - (lineHeight * 2));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...debitColor);
    doc.text(`Rs. ${formatNumber(debitTotal)}`, rightCol + 50, summaryY - (lineHeight * 2));
    
    // Net Amount - highlighted
    summaryY += lineHeight;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + 5, summaryY - 2, pageWidth - (margin * 2) - 10, 8, 'F');
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.rect(margin + 5, summaryY - 2, pageWidth - (margin * 2) - 10, 8, 'D');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...headerColor);
    doc.text('Net Amount:', leftCol, summaryY + 3);
    
    doc.setFontSize(11);
    if (netAmount >= 0) {
      doc.setTextColor(...creditColor);
    } else {
      doc.setTextColor(...debitColor);
    }
    doc.text(`Rs. ${formatNumber(Math.abs(netAmount))}`, leftCol + 50, summaryY + 3);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Download PDF
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `transactions-statement-${timestamp}.pdf`;
    doc.save(filename);
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      setShowExportDialog(false);

      // Build query parameters for export API
      const params: any = {};
      if (exportAccountId !== "all") {
        params.account_id = exportAccountId;
      }
      if (exportTransactionType !== "Both") {
        params.transaction_type = exportTransactionType;
      }
      if (filters.dateFrom) {
        params.from_date = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.to_date = filters.dateTo;
      }

      // Call the export API to get all transactions
      let exportData;
      try {
        const response = await financeApi.post<any>('/export-transactions/', {
          ...params,
          format: 'csv'
        });

        // Check if API returns data directly in the expected format
        if (response.transactions && Array.isArray(response.transactions)) {
          exportData = response;
        } else {
          // If API returns task_id or different format, fetch all transactions directly
          throw new Error('API returned unexpected format, fetching directly');
        }
      } catch (apiError) {
        // Fallback: fetch all transactions directly using GET endpoint
        let queryParams = '?page_size=10000&ordering=-time'; // Get all transactions
        if (params.account_id) queryParams += `&account_id=${params.account_id}`;
        if (params.transaction_type) queryParams += `&transaction_type=${params.transaction_type}`;
        if (params.from_date) queryParams += `&from_date=${params.from_date}`;
        if (params.to_date) queryParams += `&to_date=${params.to_date}`;

        const allTransactionsResponse = await financeApi.get<any>(`/transactions/${queryParams}`);
        const allTransactions = Array.isArray(allTransactionsResponse) 
          ? allTransactionsResponse 
          : (allTransactionsResponse.results || []);

        // Calculate summary
        const creditTotal = allTransactions
          .filter((t: any) => t.transaction_type === 'Credit')
          .reduce((sum: number, t: any) => sum + parseFloat(String(t.amount || 0)), 0);
        const debitTotal = allTransactions
          .filter((t: any) => t.transaction_type === 'Debit')
          .reduce((sum: number, t: any) => sum + parseFloat(String(t.amount || 0)), 0);

        exportData = {
          transactions: allTransactions,
          summary: {
            total_count: allTransactions.length,
            credit_total: creditTotal.toFixed(2),
            debit_total: debitTotal.toFixed(2),
            net_amount: (creditTotal - debitTotal).toFixed(2)
          },
          filters: params
        };
      }

      // Export based on selected format
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      
      if (exportFormat === 'csv') {
        const csvContent = convertToCSV(exportData);
        const filename = `transactions-export-${timestamp}.csv`;
        downloadCSV(csvContent, filename);
        toast({
          title: "Export Successful",
          description: `CSV file downloaded: ${filename}`,
        });
      } else if (exportFormat === 'pdf') {
        await generatePDF(exportData);
        toast({
          title: "Export Successful",
          description: `PDF file downloaded successfully`,
        });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error?.message || "Failed to export transactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  /* =========================
     Render
  ========================= */

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Manage all financial transactions
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/user-admin/export-history")}
          >
            <History className="h-4 w-4 mr-2" /> History
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={exportLoading}
          >
            <Download className="h-4 w-4 mr-2" /> 
            {exportLoading ? "Exporting..." : "Export"}
          </Button>

          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Transaction
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search transactions by account, purpose, bill number, UTR, vendor, amount, or any field..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {filters.search && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {filters.search && (
            <div className="mt-2 text-sm text-muted-foreground">
              Searching all transactions for: <span className="font-medium">{filters.search}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    {formatDateTime(t.time)}
                  </TableCell>
                  <TableCell>{t.account_nickname}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.transaction_type === "Credit"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {t.transaction_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell>{t.purpose}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate(`/finance/transactions/${t.id}`)
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" />
            </div>
          )}

          {!loading && transactions.length === 0 && (
            <div className="flex justify-center py-8 text-muted-foreground">
              No transactions found
            </div>
          )}
        </CardContent>

        {/* Pagination - Always show when there are transactions */}
        {totalCount > 0 && (
          <div className="border-t p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-medium">
                  {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalCount)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{totalCount}</span>{' '}
                transactions
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(1);
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      aria-label="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {/* Page Numbers - Always show at least page 1 */}
                  {(() => {
                    const MAX_PAGES_TO_SHOW = 5;
                    let start = Math.max(currentPage - Math.floor(MAX_PAGES_TO_SHOW / 2), 1);
                    const end = Math.min(start + MAX_PAGES_TO_SHOW - 1, totalPages);
                    if (end - start < MAX_PAGES_TO_SHOW - 1) {
                      start = Math.max(end - MAX_PAGES_TO_SHOW + 1, 1);
                    }
                    return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
                      (pageNum) => (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    );
                  })()}

                  {totalPages > 5 && currentPage + 2 < totalPages && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(totalPages);
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      aria-label="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </Card>

      {/* Transaction Form Dialog */}
      <TransactionForm
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={() => {
          refresh();
          setIsCreateDialogOpen(false);
          toast({
            title: "Success",
            description: "Transaction created successfully.",
          });
        }}
        title="Create New Transaction"
        description="Create a new financial transaction"
        prefillData={{
          transaction_type: "Credit"
        }}
      />

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Transactions</DialogTitle>
            <DialogDescription>
              Export all transactions to CSV or PDF file. Current filters will be applied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: "csv" | "pdf") => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV (Excel)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF (Statement)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Filter</Label>
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

            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={exportTransactionType} onValueChange={(value: "Both" | "Credit" | "Debit") => setExportTransactionType(value)}>
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

            <div className="text-sm text-muted-foreground">
              <p>Date filters from the main filters will also be applied.</p>
              {exportFormat === 'pdf' && (
                <p className="mt-1 text-blue-600">PDF will include a formatted statement with summary.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
              disabled={exportLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exportLoading}>
              {exportLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" /> 
                  Export to {exportFormat === 'pdf' ? 'PDF' : 'CSV'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
