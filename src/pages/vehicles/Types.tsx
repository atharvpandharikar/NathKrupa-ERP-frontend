import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useOptimizedVehicleTypes } from "@/hooks/useOptimizedData";

interface VehicleType { id: number; code: string; name: string; description?: string | null }

export default function VehicleTypesPage() {
  const { organizationName } = useOrganization();
  const {
    vehicleTypes: items,
    loading,
    error,
  } = useOptimizedVehicleTypes();

  const [itemsState, setItems] = useState<VehicleType[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [formErrors, setFormErrors] = useState<{ code?: string; name?: string; form?: string }>({});
  const [form, setForm] = useState<{ code: string; name: string; description?: string }>({ code: "", name: "", description: "" });

  useEffect(() => {
    document.title = `Vehicle Types  | ${organizationName}`;
    if (error) {
      toast({ title: "Failed to load vehicle types", variant: "destructive" });
    }
  }, [organizationName, error]);

  useEffect(() => {
    if (items) {
      setItems(items);
    }
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return itemsState.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }, [itemsState, query]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Vehicle Types</h1>
            <p className="text-sm text-muted-foreground">Manage high-level vehicle type buckets</p>
          </div>
          <Button disabled>Add Vehicle Type</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading Vehicle Types...</CardTitle>
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
          <h1 className="text-2xl font-semibold mb-1">Vehicle Types</h1>
          <p className="text-sm text-muted-foreground">Manage high-level vehicle type buckets</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormErrors({}); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ code: "", name: "", description: "" }); }}>Add Vehicle Type</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Vehicle Type" : "Add Vehicle Type"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {formErrors.form && <p className="text-sm text-red-600">{formErrors.form}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code</label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g., LCV" />
                  {formErrors.code && <p className="text-xs text-red-600">{formErrors.code}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Light Commercial Vehicle" />
                  {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
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
                if (!form.code.trim()) errors.code = 'Code is required';
                if (!form.name.trim()) errors.name = 'Name is required';
                setFormErrors(errors);
                if (Object.keys(errors).length) return;
                const payload = { code: form.code.trim(), name: form.name.trim(), description: form.description || '' };
                setSaving(true);
                try {
                  if (editing) {
                    const updated = await api.put<VehicleType>(`/vehicle-types/${editing.id}/`, payload);
                    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
                    toast({ title: 'Vehicle type updated' });
                  } else {
                    const created = await api.post<VehicleType>(`/vehicle-types/`, payload);
                    setItems(prev => [created, ...prev]);
                    toast({ title: 'Vehicle type created' });
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
            <CardTitle>All Vehicle Types</CardTitle>
            <Input placeholder="Search by code, name, description" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(vt => (
                  <tr key={vt.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-mono">{vt.code}</td>
                    <td className="p-3">{vt.name}</td>
                    <td className="p-3">{vt.description || '-'}</td>
                    <td className="p-3 text-right w-[140px]">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(vt); setForm({ code: vt.code, name: vt.name, description: vt.description || '' }); setOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (!confirm(`Delete vehicle type "${vt.name}"?`)) return;
                          try {
                            await api.del<void>(`/vehicle-types/${vt.id}/`);
                            setItems(prev => prev.filter(i => i.id !== vt.id));
                            toast({ title: 'Vehicle type deleted' });
                          } catch (e: any) {
                            const msg = typeof e?.message === 'string' && e.message.includes('Protected')
                              ? 'Cannot delete: type is referenced by vehicle models.'
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
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">No vehicle types found.</td>
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
