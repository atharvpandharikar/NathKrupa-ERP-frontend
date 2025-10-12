import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { useOrganization } from "@/hooks/useOrganization";
import { useOptimizedVehicleModelsPageData } from "@/hooks/useOptimizedData";

interface VehicleType { id: number; name: string; }
interface VehicleMaker { id: number; name: string; }
interface VehicleModel { id: number; name: string; description?: string | null; maker: VehicleMaker; vehicle_type: VehicleType }

export default function VehicleModelsPage() {
  const { organizationName } = useOrganization();
  const {
    models: items,
    makers,
    types,
    loading,
    error,
  } = useOptimizedVehicleModelsPageData();

  const [itemsState, setItems] = useState<VehicleModel[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<VehicleModel | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; maker_id?: string; vehicle_type_id?: string; form?: string }>({});
  const [form, setForm] = useState<{ name: string; description?: string; maker_id: number | ""; vehicle_type_id: number | "" }>({ name: "", description: "", maker_id: "", vehicle_type_id: "" });

  useEffect(() => {
    document.title = `Vehicle Models  | ${organizationName}`;
    if (error) {
      toast({ title: "Failed to load models", variant: "destructive" });
    }
  }, [organizationName, error]);

  useEffect(() => {
    if (items) {
      setItems(items);
    }
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return itemsState.filter(i => i.name.toLowerCase().includes(q) || i.maker?.name?.toLowerCase().includes(q) || i.vehicle_type?.name?.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }, [itemsState, query]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Vehicle Models</h1>
            <p className="text-sm text-muted-foreground">Manage models by maker and vehicle type</p>
          </div>
          <Button disabled>Add Model</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading Models...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 text-muted-foreground">
              Please wait while we load the data.
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Vehicle Models</h1>
          <p className="text-sm text-muted-foreground">Manage models by maker and vehicle type</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormErrors({}); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", maker_id: "", vehicle_type_id: "" }); }}>Add Model</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Model" : "Add Model"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {formErrors.form && <p className="text-sm text-red-600">{formErrors.form}</p>}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Maker</label>
                  <Combobox
                    value={form.maker_id ? String(form.maker_id) : ""}
                    onChange={(val) => setForm(f => ({ ...f, maker_id: val ? Number(val) : "" }))}
                    options={makers.map(m => ({ label: m.name, value: String(m.id) }))}
                    placeholder="Select maker"
                    searchPlaceholder="Search makers..."
                  />
                  {formErrors.maker_id && <p className="text-xs text-red-600">{formErrors.maker_id}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vehicle Type</label>
                  <Combobox
                    value={form.vehicle_type_id ? String(form.vehicle_type_id) : ""}
                    onChange={(val) => setForm(f => ({ ...f, vehicle_type_id: val ? Number(val) : "" }))}
                    options={types.map(t => ({ label: t.name, value: String(t.id) }))}
                    placeholder="Select vehicle type"
                    searchPlaceholder="Search types..."
                  />
                  {formErrors.vehicle_type_id && <p className="text-xs text-red-600">{formErrors.vehicle_type_id}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={saving} onClick={async () => {
                const errors: any = {};
                if (!form.name.trim()) errors.name = 'Name is required';
                if (!form.maker_id) errors.maker_id = 'Maker is required';
                if (!form.vehicle_type_id) errors.vehicle_type_id = 'Vehicle type is required';
                setFormErrors(errors);
                if (Object.keys(errors).length) return;
                const payload: any = { name: form.name.trim(), description: form.description || '', maker_id: form.maker_id, vehicle_type_id: form.vehicle_type_id };
                setSaving(true);
                try {
                  if (editing) {
                    const updated = await api.put<VehicleModel>(`/vehicle-models/${editing.id}/`, payload);
                    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
                    toast({ title: 'Model updated' });
                  } else {
                    const created = await api.post<VehicleModel>(`/vehicle-models/`, payload);
                    setItems(prev => [created, ...prev]);
                    toast({ title: 'Model created' });
                  }
                  setOpen(false);
                } catch (e: any) {
                  const text = e?.message || 'Save failed';
                  setFormErrors({ form: text });
                  toast({ title: 'Failed to save', variant: 'destructive' });
                } finally {
                  setSaving(false);
                }
              }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Models</CardTitle>
            <Input placeholder="Search by name, maker or type" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Model</th>
                  <th className="text-left p-3 font-medium">Maker</th>
                  <th className="text-left p-3 font-medium">Vehicle Type</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(vm => (
                  <tr key={vm.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{vm.name}</td>
                    <td className="p-3">{vm.maker?.name || '-'}</td>
                    <td className="p-3">{vm.vehicle_type?.name || '-'}</td>
                    <td className="p-3">{vm.description || '-'}</td>
                    <td className="p-3 text-right w-[140px]">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(vm); setForm({ name: vm.name, description: vm.description || '', maker_id: vm.maker?.id || '', vehicle_type_id: vm.vehicle_type?.id || '' }); setOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (!confirm(`Delete model "${vm.name}"?`)) return;
                          try {
                            await api.del<void>(`/vehicle-models/${vm.id}/`);
                            setItems(prev => prev.filter(i => i.id !== vm.id));
                            toast({ title: 'Model deleted' });
                          } catch (e: any) {
                            const msg = typeof e?.message === 'string' && e.message.includes('Protected')
                              ? 'Cannot delete: model is referenced by other records.'
                              : 'Delete failed';
                            toast({ title: msg, variant: 'destructive' });
                          }
                        }}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">No models found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
