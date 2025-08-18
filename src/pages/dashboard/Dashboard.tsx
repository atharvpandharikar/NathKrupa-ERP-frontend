import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { workOrdersApi, paymentsApi, customersApi, type Bill, type Payment } from "@/lib/api";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Wallet, Users, Layers } from "lucide-react";

export default function Dashboard(){
  useEffect(()=>{ document.title = 'Dashboard | Nathkrupa ERP'; },[]);

  const { data: billsData, isLoading: isBillsLoading } = useQuery({ queryKey:['dashboard-bills'], queryFn: () => workOrdersApi.list() });
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery({ queryKey:['dashboard-payments'], queryFn: () => paymentsApi.list() });
  const { data: customersData, isLoading: isCustomersLoading } = useQuery({ queryKey:['dashboard-customers'], queryFn: () => customersApi.list() });

  const bills: Bill[] = Array.isArray(billsData) ? billsData : (billsData?.results || []);
  const payments: Payment[] = paymentsData || [];
  const customers = Array.isArray(customersData) ? customersData : (customersData?.results || []);

  // KPI calculations
  const totalRevenue = bills.reduce((s,b)=> s + Number(b.quoted_price||0) + Number(b.total_added_features_cost||0),0);
  const totalPaid = bills.reduce((s,b)=> s + Number(b.total_payments||0),0);
  const outstanding = bills.reduce((s,b)=> s + Number(b.remaining_balance||0),0);
  const uniqueCustomers = new Set(bills.map(b=> b.quotation?.customer?.id).filter(Boolean)).size;

  // Helpers
  const formatINR = (n:number) => '₹'+ n.toLocaleString('en-IN');
  const today = new Date();
  const daysBack = 14;
  const dateKey = (d:Date) => d.toISOString().split('T')[0];

  const revenueTrend = useMemo(()=>{
    // Group payments by date
    const map: Record<string, number> = {};
    payments.forEach(p=> { const k = (p.payment_date||'').split('T')[0]; if(!k) return; map[k] = (map[k]||0) + Number(p.amount||0); });
    const arr: Array<{date:string; amount:number; cum:number}> = [];
    let cum = 0;
    for(let i=daysBack-1;i>=0;i--){
      const d = new Date(today); d.setDate(d.getDate()-i); const k = dateKey(d);
      const amt = map[k]||0; cum += amt; arr.push({ date: k.slice(5), amount: amt, cum });
    }
    return arr;
  },[payments]);

  const statusDistribution = useMemo(()=>{
    const counts: Record<string, number> = {};
    bills.forEach(b=> { counts[b.status] = (counts[b.status]||0)+1; });
    return Object.entries(counts).map(([status,count])=>({ status, count }));
  },[bills]);

  const paymentsByType = useMemo(()=>{
    const sums: Record<string, number> = {};
    payments.forEach(p=> { const t = p.payment_type || 'other'; sums[t] = (sums[t]||0)+ Number(p.amount||0); });
    return Object.entries(sums).map(([type,value])=>({ type, value }));
  },[payments]);

  const newWorkOrdersDaily = useMemo(()=>{
    const map: Record<string, number> = {};
    bills.forEach(b=> { const k = (b.appointment_date||'').split('T')[0]; if(!k) return; map[k] = (map[k]||0)+1; });
    const arr: Array<{date:string; count:number}> = [];
    for(let i=daysBack-1;i>=0;i--){
      const d = new Date(today); d.setDate(d.getDate()-i); const k = dateKey(d);
      arr.push({ date: k.slice(5), count: map[k]||0 });
    }
    return arr;
  },[bills]);

  const loading = isBillsLoading || isPaymentsLoading || isCustomersLoading;
  const percentPaid = totalRevenue? (totalPaid/totalRevenue)*100 : 0;

  const kpis = [
    { label:'Total Revenue', value: formatINR(totalRevenue), icon: Wallet, trend: percentPaid>=50? 'up':'down', sub: `${percentPaid.toFixed(1)}% paid` },
    { label:'Total Paid', value: formatINR(totalPaid), icon: TrendingUp, trend: 'up', sub: 'Collected so far' },
    { label:'Outstanding', value: formatINR(outstanding), icon: TrendingDown, trend: 'down', sub: 'Remaining balance' },
    { label:'Active Customers', value: uniqueCustomers.toString(), icon: Users, trend: 'up', sub: 'Distinct customers' },
  ];

  const chartColors = ['#0ea5e9','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live overview powered by backend data.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{loading? '…' : k.value}</div>
              <p className="text-[11px] text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payments (Last {daysBack} Days)</CardTitle>
            <CardDescription>Daily amounts & cumulative total</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ amount:{ label:'Daily Amount', color:'hsl(var(--primary))' }, cum:{ label:'Cumulative', color:'#10b981' } }} className="h-56">
              <AreaChart data={revenueTrend} margin={{ left: 12, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="fillAmount" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillCum" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis width={60} tickFormatter={(v)=> (v/1000)+'k'} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#fillAmount)" strokeWidth={2} />
                <Area type="monotone" dataKey="cum" stroke="#10b981" fill="url(#fillCum)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Work Order Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Work Order Status</CardTitle>
            <CardDescription>Current jobs by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count:{ label:'Count', color:'#6366f1' } }} className="h-56">
              <BarChart data={statusDistribution} margin={{ left: 12, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="status" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4,4,0,0]} fill="#6366f1" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payments by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payments by Type</CardTitle>
            <CardDescription>Share of amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={paymentsByType}
                    dataKey="value"
                    nameKey="type"
                    innerRadius={50}
                    outerRadius={80}
                    strokeWidth={2}
                  >
                    {paymentsByType.map((p, i) => (
                      <Cell
                        key={p.type}
                        fill={chartColors[i % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* New Work Orders Daily */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New Work Orders (Last {daysBack} Days)</CardTitle>
            <CardDescription>Daily creation volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count:{ label:'Count', color:'#f59e0b' } }} className="h-56">
              <BarChart data={newWorkOrdersDaily} margin={{ left: 12, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
