import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, customerAddressesApi, type CustomerAddress } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function CustomerDetail() {
  const { id } = useParams<{id:string}>();
  const cid = id? Number(id): null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', cid],
    queryFn: ()=> customersApi.get(cid!),
    enabled: cid!=null
  });

  const { data: vehicleData } = useQuery({
    queryKey: ['customer-vehicles', cid],
    queryFn: ()=> customersApi.vehicles(cid!),
    enabled: cid!=null
  });

  const { data: addresses } = useQuery({
    queryKey: ['customer-addresses', cid],
    queryFn: ()=> customerAddressesApi.list(cid!),
    enabled: cid!=null
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any)=> customersApi.update(customer!.id, payload),
    onSuccess: ()=> { qc.invalidateQueries({queryKey:['customer', cid]}); qc.invalidateQueries({queryKey:['customers']}); toast({title:'Updated'}); }
  });

  const addAddressMutation = useMutation({
    mutationFn: (payload: any)=> customerAddressesApi.create(payload),
    onSuccess: ()=> { qc.invalidateQueries({queryKey:['customer-addresses', cid]}); toast({title:'Address added'}); }
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({id, data}:{id:number; data:any})=> customerAddressesApi.update(id, data),
    onSuccess: ()=> { qc.invalidateQueries({queryKey:['customer-addresses', cid]}); toast({title:'Address saved'}); }
  });

  const [editBasic, setEditBasic] = useState(false);
  // Removed whatsapp_number and legacy default address per business decision
  const [form, setForm] = useState({ name:'', phone_number:'', email:'', org_id:'', gst_id:'' });
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [addrForm, setAddrForm] = useState<{id?:number; label:string; line1:string; line2:string; city:string; state:string; pincode:string; is_primary:boolean}>({label:'', line1:'', line2:'', city:'', state:'', pincode:'', is_primary:false});

  if(isLoading || !customer) return <div className="p-6">Loading...</div>;

  // Initialize form when entering edit
  const startEdit = () => { setForm({ name: customer.name||'', phone_number: customer.phone_number||'', email: customer.email||'', org_id: customer.org_id||'', gst_id: customer.gst_id||'' }); setEditBasic(true); };

  const saveBasic = () => { updateMutation.mutate(form); setEditBasic(false); };

  return (
    <div className="p-6 space-y-6">
      <div className="text-sm text-muted-foreground cursor-pointer" onClick={()=>navigate('/dashboard/customers')}>Customers / <span className="font-medium">{customer.name}</span></div>
      <h1 className="text-2xl font-semibold">Customer: {customer.name}</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Basic Info</CardTitle>{!editBasic && <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>}</CardHeader>
          <CardContent className="space-y-2 text-sm">
            {editBasic ? (
              <div className="space-y-2">
                <Input placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
                <Input placeholder="Phone" value={form.phone_number} onChange={e=>setForm(f=>({...f,phone_number:e.target.value}))} />
                <Input placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                <Input placeholder="Org ID" value={form.org_id} onChange={e=>setForm(f=>({...f,org_id:e.target.value}))} />
                <Input placeholder="GST ID" value={form.gst_id} onChange={e=>setForm(f=>({...f,gst_id:e.target.value}))} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveBasic} disabled={updateMutation.isPending}>{updateMutation.isPending?'Saving...':'Save'}</Button>
                  <Button size="sm" variant="ghost" onClick={()=>setEditBasic(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div><span className="text-muted-foreground">Phone:</span> {customer.phone_number||'—'}</div>
                {/* WhatsApp removed */}
                <div><span className="text-muted-foreground">Email:</span> {customer.email||'—'}</div>
                <div><span className="text-muted-foreground">Org ID:</span> {customer.org_id||'—'}</div>
                <div><span className="text-muted-foreground">GST ID:</span> {customer.gst_id||'—'}</div>
                {/* Legacy default address removed; addresses managed below */}
                <div className="text-xs text-muted-foreground">Created: {new Date(customer.created_at).toLocaleDateString()}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Addresses</CardTitle><Button size="sm" variant="outline" onClick={()=>{ setAddrForm({label:'', line1:'', line2:'', city:'', state:'', pincode:'', is_primary:false}); setAddressDialogOpen(true); }}>Add</Button></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(addresses||[]).length===0 && <div className="text-muted-foreground">No addresses.</div>}
            {(addresses||[]).map(a=> (
              <div key={a.id} className="border rounded p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium flex items-center gap-2">{a.label||'Address'} {a.is_primary && <Badge variant="outline" className="text-xs">Primary</Badge>}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={()=>{ setAddrForm({id:a.id,label:a.label||'', line1:a.line1, line2:a.line2||'', city:a.city||'', state:a.state||'', pincode:a.pincode||'', is_primary:a.is_primary}); setAddressDialogOpen(true); }}>Edit</Button>
                  </div>
                </div>
                <div>{a.line1}{a.line2? ', '+a.line2:''}</div>
                <div className="text-muted-foreground text-xs">{[a.city,a.state,a.pincode].filter(Boolean).join(', ')||'—'}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicles</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!vehicleData && <div className="text-muted-foreground">Loading vehicles...</div>}
            {vehicleData && vehicleData.vehicles.length===0 && <div className="text-muted-foreground">No vehicles recorded.</div>}
            {vehicleData && vehicleData.vehicles.map(v=> (
              <div key={v.quotation_id} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="flex flex-col">
                  <span className="font-medium">{v.vehicle_maker.name} {v.vehicle_model.name}</span>
                  <span className="text-xs text-muted-foreground">{v.vehicle_number||'—'} • Quote {v.quotation_number}</span>
                </div>
                <Button size="sm" variant="outline" onClick={()=>navigate(`/quotations/${v.quotation_id}`)}>View Quotation</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{addrForm.id? 'Edit Address':'Add Address'}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <Input placeholder="Label" value={addrForm.label} onChange={e=>setAddrForm(f=>({...f,label:e.target.value}))}/>
            <Input placeholder="Line 1" value={addrForm.line1} onChange={e=>setAddrForm(f=>({...f,line1:e.target.value}))}/>
            <Input placeholder="Line 2" value={addrForm.line2} onChange={e=>setAddrForm(f=>({...f,line2:e.target.value}))}/>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="City" value={addrForm.city} onChange={e=>setAddrForm(f=>({...f,city:e.target.value}))}/>
              <Input placeholder="State" value={addrForm.state} onChange={e=>setAddrForm(f=>({...f,state:e.target.value}))}/>
              <Input placeholder="Pincode" value={addrForm.pincode} onChange={e=>setAddrForm(f=>({...f,pincode:e.target.value}))}/>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={addrForm.is_primary} onChange={e=>setAddrForm(f=>({...f,is_primary:e.target.checked}))}/> Primary</label>
          </div>
          <DialogFooter>
            <Button onClick={()=>{
              if(!addrForm.line1){ toast({title:'Line1 required', variant:'destructive'}); return; }
              if(addrForm.id){ updateAddressMutation.mutate({id:addrForm.id, data:{...addrForm}}); }
              else { addAddressMutation.mutate({ customer: customer.id, ...addrForm }); }
              setAddressDialogOpen(false);
            }}>{addrForm.id? 'Save':'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
