import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, workOrdersApi, quotationApi, QuotationDiscount, featureApi, FeatureType, FeatureCategory, FeaturePrice, ManufacturingLoad } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, MapPin, Car, Building2, Tag, Hash, FileText, Layers, DollarSign, Printer, Plus, Percent, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

type QuotationDetail = {
  id: number;
  quotation_number: string;
  created_at: string;
  suggested_total: string | number;
  final_total?: string | number | null;
  status: string;
  customer?: { name: string; phone_number?: string; email?: string | null; address?: string | null } | null;
  vehicle_maker?: { name: string } | null;
  vehicle_model?: { name: string } | null;
  vehicle_number?: string | null;
  features?: Array<{
    id: number;
    feature_type?: { name: string; category?: { name: string } } | null;
    custom_name?: string | null;
    is_custom?: boolean;
    quantity: number;
    unit_price: string | number;
    total_price: string | number;
  }>
};

export default function QuotationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuotationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openConvert, setOpenConvert] = useState(false);
  const [openAddDiscount, setOpenAddDiscount] = useState(false);
  const [days, setDays] = useState<number>(3);
  const [appt, setAppt] = useState<string>("");
  const [tokenAmt, setTokenAmt] = useState<string>("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [discMode, setDiscMode] = useState<'amount'|'percent'>('amount');
  const [discValue, setDiscValue] = useState<string>("");
  const [discNote, setDiscNote] = useState<string>("");
  const [discounts, setDiscounts] = useState<QuotationDiscount[]>([]);
  const [discountTotals, setDiscountTotals] = useState<{ base_total: number; total_discount: number; discounted_total: number }|null>(null);
  const [versions, setVersions] = useState<Array<{id:number; version:number; base_total:number; discount_total:number; discounted_total:number; note?:string; created_at:string; created_by?: { id:number; username:string } }>>([]);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideValue, setOverrideValue] = useState<string>("");
  const [overrideNote, setOverrideNote] = useState<string>("");
  // Add feature dialog state (simple custom feature)
  const [addFeatureOpen, setAddFeatureOpen] = useState(false);
  const [featName, setFeatName] = useState("");
  const [featQty, setFeatQty] = useState("1");
  const [featUnitPrice, setFeatUnitPrice] = useState("");
  const [featureTypes, setFeatureTypes] = useState<FeatureType[]>([]);
  const [parentCategories, setParentCategories] = useState<FeatureCategory[]>([]);
  const [childCategories, setChildCategories] = useState<FeatureCategory[]>([]);
  const [featurePrices, setFeaturePrices] = useState<FeaturePrice[]>([]);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<number | null>(null);
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState<number | null>(null);
  const [autoUnitPrice, setAutoUnitPrice] = useState<number | null>(null);
  const [featSearch, setFeatSearch] = useState("");
  const [selectedFeatureType, setSelectedFeatureType] = useState<number | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  
  // Manufacturing load state
  const [manufacturingLoad, setManufacturingLoad] = useState<ManufacturingLoad | null>(null);
  const [loadLoading, setLoadLoading] = useState(false);
  useEffect(() => {
    document.title = `Quotation ${id} | Nathkrupa`;
    if (!id) return;
    api.get<QuotationDetail>(`/quotations/${id}/`)
      .then(setQuote)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
        toast({ title: 'Failed to load quotation', description: msg, variant: 'destructive' });
      });
    // Load discounts summary
    quotationApi.listDiscounts(Number(id)).then((d) => {
      setDiscounts(d.items);
      setDiscountTotals({ base_total: d.base_total, total_discount: d.total_discount, discounted_total: d.discounted_total });
    }).catch(() => {});
    // Load versions
    api.get<Array<{id:number; version:number; base_total:number; discount_total:number; discounted_total:number; note?:string; created_at:string; created_by?: { id:number; username:string } }>>(`/quotations/${id}/versions/`).then(setVersions).catch(() => {});
    // Preload feature types for related vehicle model (if quotation loaded later we'll refetch in another effect)
  }, [id]);

  useEffect(()=>{
    // no-op placeholder retained
  },[quote]);

  useEffect(()=>{
    // When opening add feature dialog, fetch parent categories always; prices only if vehicle model known
    const vmId = (quote as any)?.vehicle_model_id; // optional
    if(addFeatureOpen){
      featureApi.parentCategories().then(setParentCategories).catch(()=>{});
      // clear dependent selections each open
      setChildCategories([]);
      setSelectedParentCategoryId(null); setSelectedChildCategoryId(null);
      setSelectedFeatureType(null);
      setFeatSearch('');
      setFeatureTypes([]);
      if(vmId){
        featureApi.pricesByModel(vmId).then(setFeaturePrices).catch(()=>{});
      } else {
        setFeaturePrices([]);
      }
    }
  },[addFeatureOpen, quote]);

  // Recompute suggested unit price when selection changes
  useEffect(()=>{
    if(!addFeatureOpen) return;
    const vmId = (quote as any)?.vehicle_model_id;
    if(!vmId){ setAutoUnitPrice(null); return; }
    if(useCustom){ setAutoUnitPrice(null); return; }
    // If feature type selected, find price by (vehicle_model + feature_type)
    if(selectedFeatureType){
      const fp = featurePrices.find(p=>p.feature_type && p.feature_type.id===selectedFeatureType);
      if(fp){ setAutoUnitPrice(Number(fp.price)); if(!featUnitPrice) setFeatUnitPrice(String(fp.price)); return; }
    }
    // else if only child category selected
    if(selectedChildCategoryId){
      const fp = featurePrices.find(p=>!p.feature_type && p.feature_category.id===selectedChildCategoryId);
      if(fp){ setAutoUnitPrice(Number(fp.price)); if(!featUnitPrice) setFeatUnitPrice(String(fp.price)); return; }
    }
    setAutoUnitPrice(null);
  },[selectedFeatureType, selectedChildCategoryId, featurePrices, addFeatureOpen, useCustom]);

  // When parent category changes, load children
  useEffect(()=>{
    if(!addFeatureOpen) return;
    if(selectedParentCategoryId==null){ setChildCategories([]); setSelectedChildCategoryId(null); return; }
  featureApi.childCategories(selectedParentCategoryId).then(setChildCategories).catch(()=>{});
    setSelectedChildCategoryId(null); setSelectedFeatureType(null);
  },[selectedParentCategoryId, addFeatureOpen]);

  // When child category changes, load feature types for that category & vehicle model
  useEffect(()=>{
    const vmId = (quote as any)?.vehicle_model_id;
    if(!addFeatureOpen){ return; }
    if(selectedChildCategoryId){
      if(vmId){
        featureApi.byVehicleModel(vmId, selectedChildCategoryId).then(setFeatureTypes).catch(()=>{});
      } else {
        // Fallback: generic feature types by category if model id missing
        api.get<FeatureType[]>(`/feature-types/?category=${selectedChildCategoryId}`).then(setFeatureTypes).catch(()=>{});
      }
    } else {
      setFeatureTypes([]); setSelectedFeatureType(null);
    }
  },[selectedChildCategoryId, addFeatureOpen, quote]);

  // Suggest earliest appointment when days change
  useEffect(() => {
    const d = Number(days);
    if (!d || d <= 0) return;
    setSuggestLoading(true);
    workOrdersApi.scheduleSuggest(d).then(r => {
      setAppt(r.suggestionDate);
    }).catch(() => {
      // ignore
    }).finally(() => setSuggestLoading(false));
  }, [days]);

  // Load manufacturing load when convert dialog opens
  useEffect(() => {
    if (openConvert && !manufacturingLoad) {
      setLoadLoading(true);
      workOrdersApi.getCurrentLoad()
        .then(setManufacturingLoad)
        .catch((e) => {
          console.error('Failed to load manufacturing load:', e);
          toast({ 
            title: 'Warning', 
            description: 'Could not load current manufacturing load', 
            variant: 'destructive' 
          });
        })
        .finally(() => setLoadLoading(false));
    }
  }, [openConvert, manufacturingLoad]);

  async function handleConvert() {
    try {
      if (!id) return;
      if (!appt || !days || days <= 0) {
        toast({ title: 'Missing fields', description: 'Please set appointment date and days', variant: 'destructive' });
        return;
      }
      const payload = {
        quotation_id: Number(id),
        appointment_date: appt,
        estimated_completion_days: Number(days),
        booking_amount: tokenAmt ? Number(tokenAmt) : undefined,
      };
      const bill = await workOrdersApi.create(payload);
      toast({ title: 'Work Order created', description: bill.bill_number });
      setOpenConvert(false);
      setManufacturingLoad(null); // Clear load data
      navigate(`/work-orders/${bill.id}`);
    } catch (e) {
      let msg = e instanceof Error ? e.message : 'Unknown error';
      // Try to extract suggestionDate from JSON response
      try {
        const data = JSON.parse(msg);
        if (data && data.suggestionDate) {
          msg = `Slot full. Suggested: ${data.suggestionDate}`;
          setAppt(data.suggestionDate);
        }
      } catch {}
      toast({ title: 'Failed to create work order', description: msg, variant: 'destructive' });
    }
  }

  function baseTotal(): number {
    if (!quote) return 0;
    const s = typeof quote.suggested_total === 'string' ? parseFloat(quote.suggested_total) : (quote.suggested_total as number);
    return s || 0;
  }

  function previewFinal(): number {
  // With inline discount input removed, preview is just current discounted total
  if (discountTotals?.discounted_total != null) return discountTotals.discounted_total;
  return baseTotal();
  }

  async function handleSubmitForReview() {
    try {
      if (!id) return;
      await api.post(`/quotations/${id}/submit_for_review/`, {});
      toast({ title: 'Submitted for review' });
      const fresh = await api.get<QuotationDetail>(`/quotations/${id}/`);
      setQuote(fresh);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to submit for review', description: msg, variant: 'destructive' });
    }
  }

  async function handleApproveWithFinal() {
    try {
      if (!id) return;
  const final_total = discountTotals?.discounted_total ?? baseTotal();
      await api.post(`/quotations/${id}/approve/`, { final_total });
      toast({ title: 'Approved', description: `Final total ₹${final_total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` });
      const fresh = await api.get<QuotationDetail>(`/quotations/${id}/`);
      setQuote(fresh);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to approve', description: msg, variant: 'destructive' });
    }
  }

  async function handleAddDiscount() {
    if (!id) return;
    const v = parseFloat(discValue || '0');
    if (!v || v <= 0) {
      toast({ title: 'Enter discount', description: 'Value must be > 0', variant: 'destructive' });
      return;
    }
    try {
      await quotationApi.addDiscount(Number(id), { mode: discMode, value: v, note: discNote || undefined });
      setDiscValue(""); setDiscNote(""); setOpenAddDiscount(false);
      const d = await quotationApi.listDiscounts(Number(id));
      setDiscounts(d.items); setDiscountTotals({ base_total: d.base_total, total_discount: d.total_discount, discounted_total: d.discounted_total });
      toast({ title: 'Discount added' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to add discount', description: msg, variant: 'destructive' });
    }
  }

  async function handleCreateVersionFromInput() {
    if (!id) return;
    const v = parseFloat(discValue || '0');
    if (!v || v <= 0) {
      toast({ title: 'Enter discount', description: 'Value must be > 0', variant: 'destructive' });
      return;
    }
    try {
      const ver = await api.post<{id:number}>(`/quotations/${id}/versions/`, { mode: discMode, value: v, note: discNote || undefined });
      toast({ title: 'Version created' });
      // refresh version list
      const list = await api.get<typeof versions>(`/quotations/${id}/versions/`);
      setVersions(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to create version', description: msg, variant: 'destructive' });
    }
  }

  async function handlePrintVersion(vid: number) {
    if (!id) return;
    try {
      const API_ROOT = (import.meta.env.VITE_API_ROOT as string) || "http://127.0.0.1:8000";
      const tokensRaw = localStorage.getItem("nk:tokens");
      const access = tokensRaw ? (JSON.parse(tokensRaw).access as string) : "";
      const res = await fetch(`${API_ROOT}/api/manufacturing/quotations/${id}/print/?version_id=${vid}`, {
        headers: access ? { Authorization: `Bearer ${access}` } : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `quotation-${id}-v${vid}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to generate version PDF', description: msg, variant: 'destructive' });
    }
  }

  async function handlePrint() {
    if (!id) return;
    try {
      const API_ROOT = (import.meta.env.VITE_API_ROOT as string) || "http://127.0.0.1:8000";
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
        // Fallback to download if pop-up blocked
        const a = document.createElement('a');
        a.href = url;
        a.download = `quotation-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      // Cleanup after some time
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Failed to generate PDF', description: msg, variant: 'destructive' });
    }
  }

  async function handleAddFeature() {
    if (!id) return;
    const q = parseInt(featQty || '0');
    const unit = parseFloat(featUnitPrice || '0');
  if (!useCustom && !selectedChildCategoryId) { toast({title:'Select category', variant:'destructive'}); return; }
    if (useCustom && !featName.trim()) { toast({title:'Name required', variant:'destructive'}); return; }
    if (q <= 0) { toast({title:'Quantity must be > 0', variant:'destructive'}); return; }
    if (unit < 0) { toast({title:'Unit price must be >= 0', variant:'destructive'}); return; }
    try {
  await quotationApi.addFeature(Number(id), { name: useCustom ? featName.trim() : undefined, feature_type_id: !useCustom ? (selectedFeatureType ?? undefined) : undefined, feature_category_id: !useCustom ? selectedChildCategoryId ?? undefined : undefined, quantity: q, unit_price: unit || undefined });
      toast({ title: 'Feature added' });
  setAddFeatureOpen(false); setFeatName(''); setFeatQty('1'); setFeatUnitPrice(''); setSelectedFeatureType(null); setUseCustom(false); setFeatSearch(''); setSelectedParentCategoryId(null); setSelectedChildCategoryId(null);
      // Refresh quotation + discounts + versions
      const fresh = await api.get<QuotationDetail>(`/quotations/${id}/`); setQuote(fresh);
      const d = await quotationApi.listDiscounts(Number(id)); setDiscounts(d.items); setDiscountTotals({ base_total: d.base_total, total_discount: d.total_discount, discounted_total: d.discounted_total });
      const vers = await api.get<typeof versions>(`/quotations/${id}/versions/`); setVersions(vers);
    } catch(e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title:'Failed to add feature', description: msg, variant:'destructive'});
    }
  }

  if (error) return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Unable to load quotation</h1>
      <p className="text-sm text-red-600 mb-4">{error}</p>
      <a href="/quotations" className="text-primary underline">Back to quotations</a>
    </div>
  );

  if (!quote) return <div className="p-6">Loading…</div>;

  return (
    <section className="space-y-3">
      {/* Compact header bar (sticky) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/95 backdrop-blur px-3 py-2 sticky top-12 z-30 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Quote:</span>
          <span className="font-medium">{quote.quotation_number}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={quote.status === 'approved' ? 'default' : 'secondary'} className="uppercase tracking-wide">{quote.status}</Badge>
          <span className="text-muted-foreground">Created:</span>
          <span>{new Date(quote.created_at).toLocaleDateString()}</span>
          <Button size="sm" variant="outline" onClick={handlePrint} className="ml-2 gap-1">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          
          {/* Action buttons based on status */}
          {quote.status === 'draft' && (
            <Button size="sm" variant="outline" className="ml-2" onClick={() => {
              // Submit for review logic
              api.post(`/quotations/${quote.id}/submit_for_review/`, {})
                .then(() => {
                  toast({ title: 'Success', description: 'Quotation submitted for review' });
                  // Refresh the quotation data
                  if (id) {
                    api.get<QuotationDetail>(`/quotations/${id}/`)
                      .then(setQuote)
                      .catch(console.error);
                  }
                })
                .catch((e) => {
                  const msg = e instanceof Error ? e.message : 'Unknown error';
                  toast({ title: 'Failed to submit for review', description: msg, variant: 'destructive' });
                });
            }}>
              Submit for Review
            </Button>
          )}
          
          {quote.status === 'review' && (
            <Button size="sm" variant="outline" className="ml-2" onClick={() => {
              // Approve quotation logic - no final total required
              api.post(`/quotations/${quote.id}/approve/`, { 
                final_total: quote.suggested_total // Use suggested total as final total
              })
                .then(() => {
                  toast({ title: 'Success', description: 'Quotation approved' });
                  // Refresh the quotation data
                  if (id) {
                    api.get<QuotationDetail>(`/quotations/${id}/`)
                      .then(setQuote)
                      .catch(console.error);
                  }
                })
                .catch((e) => {
                  const msg = e instanceof Error ? e.message : 'Unknown error';
                  toast({ title: 'Failed to approve quotation', description: msg, variant: 'destructive' });
                });
            }}>
              Approve Quotation
            </Button>
          )}
          
          {quote.status === 'approved' && (
            <Dialog open={openConvert} onOpenChange={(open) => {
              setOpenConvert(open);
              if (!open) {
                // Clear manufacturing load when dialog closes to get fresh data next time
                setManufacturingLoad(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-2">Convert to Work Order</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Convert to Work Order</DialogTitle>
                </DialogHeader>
                
                {/* Manufacturing Load Summary */}
                {loadLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 animate-spin" />
                    Loading manufacturing load...
                  </div>
                ) : manufacturingLoad && (
                  <div className="space-y-3 mb-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      Current Manufacturing Load
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="text-center p-2 bg-background rounded border">
                        <div className="font-semibold text-lg">{manufacturingLoad.total_active_jobs}</div>
                        <div className="text-muted-foreground">Active Jobs</div>
                      </div>
                      <div className="text-center p-2 bg-background rounded border">
                        <div className="font-semibold text-lg">{manufacturingLoad.average_job_duration}</div>
                        <div className="text-muted-foreground">Avg Days/Job</div>
                      </div>
                      <div className="text-center p-2 bg-background rounded border">
                        <div className="font-semibold text-lg">{manufacturingLoad.max_daily_capacity}</div>
                        <div className="text-muted-foreground">Daily Capacity</div>
                      </div>
                    </div>

                    {/* Weekly Load Summary */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-green-50 border border-green-200 rounded">
                        <div className="font-medium text-green-700">{manufacturingLoad.load_summary.available_days}</div>
                        <div className="text-green-600">Available Days</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="font-medium text-yellow-700">{manufacturingLoad.load_summary.high_load_days}</div>
                        <div className="text-yellow-600">High Load Days</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 border border-red-200 rounded">
                        <div className="font-medium text-red-700">{manufacturingLoad.load_summary.fully_booked_days}</div>
                        <div className="text-red-600">Fully Booked</div>
                      </div>
                    </div>

                    {/* Next Available Slots */}
                    {manufacturingLoad.next_available_slots && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">Next Available Slots:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(manufacturingLoad.next_available_slots).slice(0, 4).map(([duration, slot]) => (
                            <div key={duration} className="p-2 bg-background rounded border">
                              <div className="font-medium">{duration.replace('_', ' ').toUpperCase()}</div>
                              {slot.start_date ? (
                                <div className="text-muted-foreground">
                                  {new Date(slot.start_date).toLocaleDateString()} 
                                  {slot.days_from_now !== null && ` (+${slot.days_from_now}d)`}
                                </div>
                              ) : (
                                <div className="text-red-600">Not available</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* High load warning */}
                    {manufacturingLoad.load_summary.fully_booked_days > 2 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Manufacturing capacity is high. Consider scheduling for later dates for better service.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Schedule Form */}
                <div className="grid gap-3 py-2">
                  <div className="grid gap-1">
                    <Label htmlFor="days">Required days</Label>
                    <Input id="days" type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} />
                    {manufacturingLoad?.next_available_slots?.[`${days}_day`] && (
                      <div className="text-xs text-muted-foreground">
                        Next {days}-day slot: {manufacturingLoad.next_available_slots[`${days}_day`].start_date 
                          ? new Date(manufacturingLoad.next_available_slots[`${days}_day`].start_date!).toLocaleDateString()
                          : 'Not available in next 30 days'}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="appt">Appointment date {suggestLoading && <span className="text-xs text-muted-foreground">(suggesting…)</span>}</Label>
                    <Input id="appt" type="date" value={appt} onChange={(e) => setAppt(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="token">Token amount (optional)</Label>
                    <Input id="token" type="number" min={0} value={tokenAmt} onChange={(e) => setTokenAmt(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setOpenConvert(false);
                    setManufacturingLoad(null);
                  }}>Cancel</Button>
                  <Button onClick={handleConvert}>Create Work Order</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {quote.status === 'rejected' && (
            <span className="ml-2 text-sm text-red-600">This quotation has been rejected</span>
          )}
          
          {quote.status === 'converted' && (
            <span className="ml-2 text-sm text-green-600">Converted to work order</span>
          )}
        </div>
      </div>

      {/* Info cards: Customer, Vehicle, Order Details moved just below header */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="font-medium text-sm">{quote.customer?.name || '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">{quote.customer?.phone_number || '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm break-words">{quote.customer?.email || '-'}</div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm break-words">{quote.customer?.address || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">{quote.vehicle_maker?.name || '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">{quote.vehicle_model?.name || '-'}</div>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">{quote.vehicle_number || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground"><FileText className="h-4 w-4" /><span className="sr-only">Quote No.</span></div>
                <span className="font-medium">{quote.quotation_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground"><Layers className="h-4 w-4" /><span className="sr-only">Total Features</span></div>
                <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5">
                  {quote.features?.length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground"><Percent className="h-4 w-4" /><span className="sr-only">Total Discount</span></div>
                <span className="inline-flex items-center justify-center rounded-md bg-amber-100 text-amber-700 text-xs px-2 py-0.5 font-medium">
                  ₹{(() => {
                    const disc = discountTotals?.total_discount ?? 0;
                    return disc.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4" /><span className="sr-only">Total Price</span></div>
                <span className="inline-flex items-center justify-center rounded-md bg-emerald-100 text-emerald-700 text-sm px-2 py-0.5 font-semibold">
                  ₹{(() => {
                    const raw = (discountTotals?.discounted_total ?? (quote.final_total ?? quote.suggested_total));
                    const n = typeof raw === 'string' ? parseFloat(raw as string) : (raw as number);
                    return (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
                  })()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing / Discount */}
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pricing & Discount</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>Base: <span className="font-semibold">₹{(discountTotals?.base_total ?? baseTotal()).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div className="text-muted-foreground">•</div>
            <div>Already discounted: <span className="font-semibold">₹{(discountTotals?.total_discount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div className="text-muted-foreground">→</div>
            <div>Current price: <span className="font-semibold">₹{(discountTotals?.discounted_total ?? baseTotal()).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Dialog open={openAddDiscount} onOpenChange={setOpenAddDiscount}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Add Discount</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Discount</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-1">
                    <Label>Mode</Label>
                    <Tabs value={discMode} onValueChange={(v)=>setDiscMode(v as 'amount'|'percent')}>
                      <TabsList>
                        <TabsTrigger value="amount">Amount</TabsTrigger>
                        <TabsTrigger value="percent">Percent</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="grid gap-1">
                    <Label>{discMode === 'amount' ? 'Amount (₹)' : 'Percent (%)'}</Label>
                    <Input type="number" min={0} max={discMode==='percent'?100:undefined} value={discValue} onChange={e=>setDiscValue(e.target.value)} placeholder={discMode==='amount'?'5000':'10'} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Note (optional)</Label>
                    <Input value={discNote} onChange={e=>setDiscNote(e.target.value)} placeholder="Reason / context" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setOpenAddDiscount(false)}>Cancel</Button>
                  <Button onClick={handleAddDiscount}>Add</Button>
                  <Button variant="secondary" onClick={handleCreateVersionFromInput}>Save as Version</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {quote.status === 'draft' && (
              <Button size="sm" onClick={handleSubmitForReview} variant="outline">Submit for Review</Button>
            )}
            {quote.status === 'review' && (
              <Button size="sm" onClick={handleApproveWithFinal}>Approve with Final</Button>
            )}
            <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">Manual Override</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manual Final Total Override</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-1">
                    <Label>New final total</Label>
                    <Input type="number" min={0} value={overrideValue} onChange={e=>setOverrideValue(e.target.value)} placeholder="e.g. 588.06" />
                    <p className="text-xs text-muted-foreground">Current discounted: ₹{(discountTotals?.discounted_total ?? baseTotal()).toLocaleString('en-IN',{maximumFractionDigits:2})}</p>
                  </div>
                  <div className="grid gap-1">
                    <Label>Note (optional)</Label>
                    <Input value={overrideNote} onChange={e=>setOverrideNote(e.target.value)} placeholder="Reason / reference" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setOverrideOpen(false)}>Cancel</Button>
                  <Button onClick={async ()=>{
                    if(!id) return;
                    const v = parseFloat(overrideValue||'0');
                    if(!v || v<0){ toast({title:'Enter valid final total', variant:'destructive'}); return; }
                    try {
                      await api.post(`/quotations/${id}/manual_override/`, { final_total: v, note: overrideNote||undefined });
                      toast({ title:'Final total overridden', description:`New final ₹${v.toLocaleString('en-IN',{maximumFractionDigits:2})}` });
                      setOverrideOpen(false); setOverrideNote(''); setOverrideValue('');
                      const fresh = await api.get<QuotationDetail>(`/quotations/${id}/`); setQuote(fresh);
                      const list = await api.get<typeof versions>(`/quotations/${id}/versions/`); setVersions(list);
                    } catch(e){
                      const msg = e instanceof Error ? e.message : 'Unknown error';
                      toast({ title:'Override failed', description:msg, variant:'destructive'});
                    }
                  }}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {/* Discount list */}
          <div className="pt-2 border-t mt-2 text-sm">
            {discounts.length === 0 ? (
              <div className="text-muted-foreground">No discounts applied yet.</div>
            ) : (
              <div className="space-y-2">
                {discounts.map(d => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{d.mode === 'amount' ? `₹${d.value}` : `${d.value}%`}</span>
                      {d.note ? <span className="text-muted-foreground"> • {d.note}</span> : null}
                      <span className="text-muted-foreground"> • {new Date(d.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {d.status === 'approved' && (
                        <Badge variant="outline" className="text-green-700 border-green-300">Approved{d.approved_by ? ` by ${d.approved_by.username}` : ''}</Badge>
                      )}
                      {d.status === 'pending' && (
                        <>
                          <Badge variant="secondary">Pending</Badge>
                          <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              await quotationApi.approveDiscount(Number(id), d.id);
                              const data = await quotationApi.listDiscounts(Number(id));
                              setDiscounts(data.items);
                              setDiscountTotals({ base_total: data.base_total, total_discount: data.total_discount, discounted_total: data.discounted_total });
                              toast({ title: 'Discount approved' });
                            } catch (e) {
                              const msg = e instanceof Error ? e.message : 'Unknown error';
                              toast({ title: 'Approve failed', description: msg, variant: 'destructive' });
                            }
                          }}>Approve</Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            try {
                              await quotationApi.rejectDiscount(Number(id), d.id);
                              const data = await quotationApi.listDiscounts(Number(id));
                              setDiscounts(data.items);
                              setDiscountTotals({ base_total: data.base_total, total_discount: data.total_discount, discounted_total: data.discounted_total });
                              toast({ title: 'Discount rejected' });
                            } catch (e) {
                              const msg = e instanceof Error ? e.message : 'Unknown error';
                              toast({ title: 'Reject failed', description: msg, variant: 'destructive' });
                            }
                          }}>Reject</Button>
                        </>
                      )}
                      {d.status === 'rejected' && (
                        <Badge variant="destructive">Rejected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Versions */}
          <div className="pt-3 border-t mt-3">
            <div className="text-sm font-medium mb-2">Quote Versions</div>
            {versions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No versions yet. Use "Save as Version" in Add discount popup.</div>
            ) : (
              <div className="space-y-2 text-sm">
                {versions.map(v => (
                  <div key={v.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">v{v.version}</span>
                      <span className="text-muted-foreground"> • Base ₹{v.base_total.toLocaleString('en-IN', { maximumFractionDigits: 2 })} • Discount ₹{v.discount_total.toLocaleString('en-IN', { maximumFractionDigits: 2 })} • Final ₹{v.discounted_total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      {v.note ? <span className="text-muted-foreground"> • {v.note}</span> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handlePrintVersion(v.id)}>Print</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Features</CardTitle>
          {quote.status !== 'converted' && (
            <Dialog open={addFeatureOpen} onOpenChange={setAddFeatureOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Plus className="h-4 w-4" /> Add Feature</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Feature</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1">
                      <input type="radio" className="h-3 w-3" checked={!useCustom} onChange={()=>setUseCustom(false)} /> Existing
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" className="h-3 w-3" checked={useCustom} onChange={()=>setUseCustom(true)} /> Custom
                    </label>
                  </div>
                  {!useCustom && (
                    <div className="grid gap-3">
                      {/* Parent Category */}
                      <div className="grid gap-1">
                        <Label>Parent Category</Label>
                        <select aria-label="Parent Category" className="border rounded px-2 py-1 text-sm" value={selectedParentCategoryId??''} onChange={e=>{const v=e.target.value?Number(e.target.value):null; setSelectedParentCategoryId(v);}}>
                          <option value="">-- Select Parent --</option>
                          {parentCategories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      {/* Child Category (always shown) */}
                      <div className="grid gap-1">
                        <Label>Category</Label>
                        <select aria-label="Child Category" className="border rounded px-2 py-1 text-sm" disabled={!selectedParentCategoryId} value={selectedChildCategoryId??''} onChange={e=>{const v=e.target.value?Number(e.target.value):null; setSelectedChildCategoryId(v); setSelectedFeatureType(null);}}>
                          <option value="">{selectedParentCategoryId? '-- Select Category --' : 'Select parent first'}</option>
                          {childCategories.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      {/* Feature Type (always shown) */}
                      <div className="grid gap-1">
                        <Label>Feature Type (optional)</Label>
                        <select aria-label="Feature Type" className="border rounded px-2 py-1 text-sm" disabled={!selectedChildCategoryId || featureTypes.length===0} value={selectedFeatureType??''} onChange={e=>{const v=e.target.value?Number(e.target.value):null; setSelectedFeatureType(v);}}>
                          <option value="">{selectedChildCategoryId? (featureTypes.length? '-- Select Feature Type --' : 'No types available') : 'Select category first'}</option>
                          {featureTypes.map(ft=> <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                        </select>
                        <p className="text-[10px] text-muted-foreground">Leave blank to add category-level line.</p>
                      </div>
                    </div>
                  )}
                  {useCustom && (
                    <div className="grid gap-1">
                      <Label>Name</Label>
                      <Input value={featName} onChange={e=>setFeatName(e.target.value)} placeholder="e.g. Ladder" />
                    </div>
                  )}
                  <div className="grid gap-1">
                    <Label>Quantity</Label>
                    <Input type="number" min={1} value={featQty} onChange={e=>setFeatQty(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Unit Price (₹){autoUnitPrice!=null && <span className="ml-2 text-xs text-muted-foreground">Suggested: ₹{autoUnitPrice.toLocaleString('en-IN',{maximumFractionDigits:2})}</span>}</Label>
                    <Input type="number" min={0} value={featUnitPrice} onChange={e=>setFeatUnitPrice(e.target.value)} placeholder={autoUnitPrice!=null?String(autoUnitPrice):'e.g. 2500'} />
                    <p className="text-[10px] text-muted-foreground">Auto-filled from price list if available; you can override.</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Discounts will automatically re-apply on the new base and a new version will be created.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setAddFeatureOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddFeature}>Add Feature</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {quote.features && quote.features.length > 0 ? (
            <div className="space-y-2 text-sm">
              {quote.features.map(f => {
                const catName = (f as any).feature_category?.name;
                const name = f.feature_type?.name || (f.custom_name?.trim() ? f.custom_name.trim() : (catName || 'Item'));
                const isCustom = !!f.custom_name && !f.feature_type;
                const categoryName = f.feature_type?.category?.name || ( (f as any).feature_category?.name );
                return (
                  <div key={f.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{name}{isCustom && ' (custom)'}</div>
                      {categoryName && (
                        <div className="text-xs text-muted-foreground">{categoryName}</div>
                      )}
                    </div>
                    <div className="text-sm">x{f.quantity} • ₹{(typeof f.unit_price === 'string' ? parseFloat(f.unit_price) : f.unit_price).toLocaleString()} = <span className="font-semibold">₹{(typeof f.total_price === 'string' ? parseFloat(f.total_price) : f.total_price).toLocaleString()}</span></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground">No features</div>
          )}
        </CardContent>
      </Card>
      <div className="text-right text-sm mb-1">
        Base: ₹{(discountTotals?.base_total ?? baseTotal()).toLocaleString('en-IN', { maximumFractionDigits: 2 })} • Discount: ₹{(discountTotals?.total_discount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>
      <div className="text-right text-lg font-semibold">
        Total after discounts: ₹{(discountTotals?.discounted_total ?? (typeof quote.final_total === 'string' ? parseFloat(quote.final_total) : (quote.final_total ?? quote.suggested_total as number))).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>
    </section>
  );
}
