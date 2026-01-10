import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Users, TrendingUp, DollarSign, Printer, MessageCircle } from "lucide-react";
import { api, API_ROOT, quotationApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useOptimizedQuotations } from "@/hooks/useOptimizedData";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type QuoteRow = {
  id: number;
  quotation_number: string;
  suggested_total: number | string;
  final_total?: number | string | null;
  created_at: string;
  quotation_date: string;
  status: string;
  customer?: { name: string; phone_number?: string } | null;
  customer_name?: string; // Flat format from API
  customer_phone?: string; // Flat format from API
  vehicle_maker?: { name: string } | null;
  vehicle_model?: { name: string } | null;
  vehicle_model_name?: string; // Flat format from API
  // unified total from backend
  display_total?: number | string | null;
};

export default function QuotationsList() {
  const { organizationName } = useOrganization();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    quotations,
    totalCount,
    loading,
    error,
  } = useOptimizedQuotations(page, pageSize, search);

  useEffect(() => {
    document.title = `Quotations | ${organizationName}`;
    if (error) {
      toast({ title: 'Failed to load quotations', description: error, variant: 'destructive' });
    }
  }, [organizationName, error]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const totalQuotes = totalCount;
  const totalValue = quotations.reduce((sum, q) => {
    const raw = (typeof q.display_total !== 'undefined' && q.display_total !== null)
      ? q.display_total
      : q.suggested_total;
    const n = typeof raw === 'string' ? parseFloat(raw) : (raw || 0);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const pendingQuotes = quotations.filter(q => q.status === 'draft').length;
  const avgValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

  const handleAddQuote = () => {
    window.open('/quotations/generate', '_blank');
  };

  async function handlePrint(id: number) {
    try {
      // Using centralized API_ROOT
      const tokensRaw = localStorage.getItem("nk:tokens");
      const access = tokensRaw ? (JSON.parse(tokensRaw).access as string) : "";
      const res = await fetch(`${API_ROOT}/api/manufacturing/quotations/${id}/print/`, {
        headers: access ? { Authorization: `Bearer ${access}` } : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `quotation-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to generate PDF', description: msg, variant: 'destructive' });
    }
  }

  async function handleStatusChange(id: number, newStatus: string) {
    try {
      await api.patch(`/quotations/${id}/`, { status: newStatus });
      // This state update is optimistic and will only affect the current page.
      // A full refetch might be desired for consistency across pages.
      const updatedQuotations = quotations.map(q => q.id === id ? { ...q, status: newStatus } : q);
      // setQuotations(updatedQuotations); // The hook manages the state
      toast({ title: 'Status updated' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to update status', description: msg, variant: 'destructive' });
    }
  }

  const [sendingWhatsapp, setSendingWhatsapp] = useState<number | null>(null);

  async function handleSendWhatsapp(id: number) {
    setSendingWhatsapp(id);
    try {
      const result = await quotationApi.sendWhatsapp(id);
      toast({ 
        title: 'WhatsApp sent successfully', 
        description: result.message || 'Quotation PDF sent via WhatsApp' 
      });
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Unknown error';
      toast({ 
        title: 'Failed to send WhatsApp', 
        description: msg, 
        variant: 'destructive' 
      });
    } finally {
      setSendingWhatsapp(null);
    }
  }

  const filtered = quotations.filter(q => {
    // Text search is now handled by the backend via useOptimizedQuotations hook
    // We only need to handle client-side filters for status and date on the current page data.
    const matchesStatus = !statusFilter || q.status === statusFilter;

    const quotationDate = new Date(q.quotation_date);
    const fromOk = !dateFrom || quotationDate >= new Date(dateFrom);
    const toOk = !dateTo || quotationDate <= new Date(dateTo);

    return matchesStatus && fromOk && toOk;
  });

  const statusOptions: { value: string; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'Send for Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'converted', label: 'Converted to Order' },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Quotations</h1>
          <p className="text-sm text-muted-foreground">Manage and track your vehicle quotations</p>
        </div>
        <Button onClick={handleAddQuote} className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Add Quote
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotes}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQuotes}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-orange-600">+3</span> this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{avgValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5%</span> improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-end justify-between gap-3">
            <CardTitle>All Quotations</CardTitle>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Search</label>
                <input
                  className="h-9 w-52 rounded-md border bg-background px-3 text-sm"
                  placeholder="Quote, customer, vehicle..."
                  aria-label="Search quotations"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  className="h-9 w-48 rounded-md border bg-background px-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  title="Filter by status"
                >
                  <option value="">All</option>
                  {statusOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">From</label>
                <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" title="From date" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">To</label>
                <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" title="To date" />
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }}>Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Quote ID</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Vehicle</th>
                  <th className="text-left p-3 font-medium">Total</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading quotations...
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((quote) => (
                    <tr key={quote.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <a href={`/quotations/${quote.id}`} className="font-mono text-sm text-blue-600 hover:underline">{quote.quotation_number}</a>
                      </td>
                      <td className="p-3">
                        {quote.customer ? (
                          <div>
                            <div className="font-medium">{quote.customer.name}</div>
                            <div className="text-sm text-muted-foreground">{quote.customer.phone_number}</div>
                          </div>
                        ) : quote.customer_name ? (
                          <div>
                            <div className="font-medium">{quote.customer_name}</div>
                            {quote.customer_phone && (
                              <div className="text-sm text-muted-foreground">{quote.customer_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No customer</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {quote.vehicle_model_name || (
                            <>
                              {quote.vehicle_maker?.name} {quote.vehicle_model?.name}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-green-600">₹{(() => {
                          // Priority: final_total > display_total > suggested_total
                          const raw = (typeof quote.final_total !== 'undefined' && quote.final_total !== null)
                            ? quote.final_total
                            : (typeof quote.display_total !== 'undefined' && quote.display_total !== null)
                            ? quote.display_total
                            : quote.suggested_total;
                          const n = typeof raw === 'string' ? parseFloat(raw) : (raw || 0);
                          return isNaN(n) ? '0' : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                        })()}</span>
                        {typeof quote.final_total !== 'undefined' && quote.final_total !== null && quote.suggested_total && (Number(quote.final_total) < Number(quote.suggested_total)) && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 align-middle">Discount Applied</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{new Date(quote.quotation_date).toLocaleDateString()}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={quote.status === 'approved' ? "default" : "secondary"} className="uppercase">
                            {quote.status}
                          </Badge>
                          <select
                            className="h-8 rounded-md border bg-background px-2 text-xs"
                            value={quote.status}
                            onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                            title="Update status"
                          >
                            {statusOptions.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/quotations/${quote.id}`, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(quote.id)}
                            title="Print"
                            className="gap-1"
                          >
                            <Printer className="w-3 h-3" /> Print
                          </Button>
                          {quote.customer && (quote.customer.phone_number || (quote.customer as any).whatsapp_number) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendWhatsapp(quote.id)}
                              disabled={sendingWhatsapp === quote.id}
                              title="Send via WhatsApp"
                              className="gap-1 text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <MessageCircle className="w-3 h-3" />
                              {sendingWhatsapp === quote.id ? 'Sending...' : 'WhatsApp'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No quotations found. Create your first quote to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((old) => Math.max(old - 1, 1));
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(i + 1);
                  }}
                  isActive={page === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((old) => Math.min(old + 1, totalPages));
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </section>
  );
}