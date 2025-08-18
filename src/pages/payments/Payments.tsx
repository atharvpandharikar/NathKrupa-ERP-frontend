import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, workOrdersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, DollarSign, TrendingUp, CreditCard as CreditIcon, Wallet } from 'lucide-react';

export default function PaymentsPage(){
  const queryClient = useQueryClient();
  useEffect(()=>{ document.title = 'Payments | Nathkrupa ERP'; },[]);

  // Core queries
  const { data: payments = [], isLoading: isPaymentsLoading } = useQuery({ queryKey:['all-payments'], queryFn: () => paymentsApi.list() });
  const { data: workOrdersData = [], isLoading: isWorkOrdersLoading } = useQuery({ queryKey:['all-workorders'], queryFn: () => workOrdersApi.list() });
  const workOrders = Array.isArray(workOrdersData) ? workOrdersData : (workOrdersData?.results ?? []);

  // Aggregates
  const totalReceived = payments.reduce((s:any,p:any)=> s + Number(p.amount||0),0);
  const totalBooking = payments.filter((p:any)=>p.payment_type==='booking').reduce((s:any,p:any)=> s+Number(p.amount||0),0);
  const totalPartial = payments.filter((p:any)=>p.payment_type==='partial').reduce((s:any,p:any)=> s+Number(p.amount||0),0);
  const totalReceivable = workOrders.reduce((s:any,w:any)=> s + (Number(w.remaining_balance)||0),0);
  const avgPayment = payments.length? totalReceived / payments.length : 0;

  // Filters
  const [search,setSearch] = useState('');
  const [typeFilter,setTypeFilter] = useState('');
  const [dateFrom,setDateFrom] = useState('');
  const [dateTo,setDateTo] = useState('');
  const [sort,setSort] = useState('date_desc');

  // Add payment dialog
  const [dialogOpen,setDialogOpen] = useState(false);
  const [form,setForm] = useState({ bill:'', amount:'', payment_type:'booking', notes:'', payment_date: new Date().toISOString().split('T')[0] });
  const [formError,setFormError] = useState<string>('');
  const [submitting,setSubmitting] = useState(false);

  const addPaymentMutation = useMutation({
    mutationFn: (data:any) => paymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey:['all-payments'] });
      setForm(f=>({...f, amount:'', notes:''}));
      setSubmitting(false);
      setDialogOpen(false);
    },
    onError: () => setSubmitting(false)
  });

  const handleSubmit = (e:React.FormEvent) => {
    e.preventDefault();
    if(!form.bill || !form.amount) return;
    const wo = getBill(Number(form.bill));
    if(wo){
      const total = Number(wo.quoted_price)||0; // base quoted
      const additional = Number(wo.total_added_features_cost||0);
      const alreadyPaid = Number(wo.total_payments||0);
      const remaining = (total + additional) - alreadyPaid;
      if(Number(form.amount) > remaining){
        setFormError(`Amount exceeds remaining balance (₹${remaining.toLocaleString('en-IN')}).`);
        return;
      }
    }
    setFormError('');
    setSubmitting(true);
    addPaymentMutation.mutate({ ...form, bill: Number(form.bill) });
  };

  const getBill = (id:number) => workOrders.find((w:any)=> w.id === id);

  const filtered = (payments as any[]).filter(p => {
    const bill = getBill(p.bill);
    const customer = bill?.quotation?.customer?.name || '';
    const billNum = bill?.bill_number || '';
    const txtOk = !search || [customer,billNum,(p.payment_type||''), String(p.id)].some(v=> v.toLowerCase().includes(search.toLowerCase()));
    const typeOk = !typeFilter || p.payment_type === typeFilter;
    const date = p.payment_date ? new Date(p.payment_date) : null;
    const fromOk = !dateFrom || (date && date >= new Date(dateFrom));
    const toOk = !dateTo || (date && date <= new Date(dateTo));
    return txtOk && typeOk && fromOk && toOk;
  }).sort((a,b)=> {
    if(sort==='date_desc') return b.payment_date.localeCompare(a.payment_date);
    if(sort==='date_asc') return a.payment_date.localeCompare(b.payment_date);
    if(sort==='amount_desc') return Number(b.amount)-Number(a.amount);
    if(sort==='amount_asc') return Number(a.amount)-Number(b.amount);
    return 0;
  });

  const clearFilters = () => { setSearch(''); setTypeFilter(''); setDateFrom(''); setDateTo(''); setSort('date_desc'); };

  // Date formatting helper
  const formatDateTime = (iso?:string) => {
    if(!iso) return '-';
    try{
      const d = new Date(iso);
      if(isNaN(d.getTime())) return iso;
      return d.toLocaleString('en-IN',{ year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    }catch{return iso;}
  };

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Payments</h1>
          <p className="text-sm text-muted-foreground">Track and record customer payments</p>
        </div>
        <Button onClick={()=> setDialogOpen(true)} className="gap-2">
          <ExternalLink className="w-4 h-4" /> Add Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <CreditIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">₹{totalReceived.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">All time collections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
      <div className="text-2xl font-bold text-red-600">₹{totalReceivable.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Total receivable</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">₹{totalBooking.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Collected as booking</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">₹{avgPayment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">Mean payment value</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-wrap items-center gap-6">
            <CardTitle className="text-lg">All Payments</CardTitle>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Search</label>
                <input
                  className="h-9 w-52 rounded-md border bg-background px-3 text-sm"
                  placeholder="Customer, bill, type..."
                  value={search}
                  onChange={e=> setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Type</label>
                <select className="h-9 w-40 rounded-md border bg-background px-2 text-sm" value={typeFilter} onChange={e=> setTypeFilter(e.target.value)} title="Filter by payment type">
                  <option value="">All</option>
                  <option value="booking">Booking</option>
                  <option value="partial">Partial</option>
                  <option value="drop_off">Drop Off</option>
                  <option value="final">Final</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">From</label>
                <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" value={dateFrom} onChange={e=> setDateFrom(e.target.value)} title="From date" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">To</label>
                <input type="date" className="h-9 rounded-md border bg-background px-2 text-sm" value={dateTo} onChange={e=> setDateTo(e.target.value)} title="To date" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Sort</label>
                <select className="h-9 w-40 rounded-md border bg-background px-2 text-sm" value={sort} onChange={e=> setSort(e.target.value)} title="Sort order">
                  <option value="date_desc">Date ↓</option>
                  <option value="date_asc">Date ↑</option>
                  <option value="amount_desc">Amount ↓</option>
                  <option value="amount_asc">Amount ↑</option>
                </select>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">ID</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Bill</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {isPaymentsLoading ? (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                ) : filtered.map(p => {
                  const bill = getBill(p.bill);
                  const customer = bill?.quotation?.customer;
                  return (
                    <tr key={p.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-mono text-sm">{p.id}</td>
                      <td className="p-3">
                        {customer ? (
                          <div>
                            <div className="font-medium text-sm">{customer.name}</div>
                            {customer.phone_number && <div className="text-xs text-muted-foreground">{customer.phone_number}</div>}
                          </div>
                        ) : <span className="text-muted-foreground italic text-sm">Unknown</span>}
                      </td>
                      <td className="p-3 text-sm">{bill?.bill_number || '-'}</td>
                      <td className="p-3 font-semibold text-green-600">₹{Number(p.amount||0).toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="uppercase">{p.payment_type || '-'}</Badge>
                      </td>
                      <td className="p-3 text-sm">{formatDateTime(p.payment_date)}</td>
                      <td className="p-3">
                        {bill && (
                          <Button variant="outline" size="sm" onClick={()=> window.open(`/work-orders/${bill.id}`, '_blank')} className="gap-1">
                            <ExternalLink className="w-3 h-3" /> View
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!isPaymentsLoading && filtered.length===0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No payments found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
  <Dialog open={dialogOpen} onOpenChange={(o)=>{ setDialogOpen(o); if(o) setFormError(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit}>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Work Order (Bill) *</label>
              <Select value={form.bill} onValueChange={v=> setForm(f=>({...f, bill:v}))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Work Order" /></SelectTrigger>
                <SelectContent>
                  {isWorkOrdersLoading ? <SelectItem value="" disabled>Loading...</SelectItem> : (
                    workOrders.length === 0 ? <SelectItem value="" disabled>No work orders</SelectItem> : (
                      workOrders.map((wo:any)=>(
                        <SelectItem key={wo.id} value={wo.id.toString()}>{wo.bill_number} - {wo.quotation?.customer?.name || 'No customer'}</SelectItem>
                      ))
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount *</label>
              <Input name="amount" type="number" min="1" value={form.amount} onChange={e=> setForm(f=>({...f, amount:e.target.value}))} required disabled={submitting} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select value={form.payment_type} onValueChange={v=> setForm(f=>({...f, payment_type:v}))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="drop_off">Drop Off</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input type="date" value={form.payment_date} onChange={e=> setForm(f=>({...f, payment_date:e.target.value}))} disabled={submitting} />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input value={form.notes} onChange={e=> setForm(f=>({...f, notes:e.target.value}))} disabled={submitting} />
            </div>
            {formError && <div className="md:col-span-4 text-sm text-red-600">{formError}</div>}
            <div className="md:col-span-4 flex gap-2">
              <Button type="submit" disabled={submitting || !form.bill || !form.amount}>{submitting? 'Adding...' : 'Add Payment'}</Button>
              {addPaymentMutation.isError && <span className="text-red-600 text-sm">Error</span>}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
