import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useOptimizedVehicleMakers } from "@/hooks/useOptimizedData";

interface VehicleMaker { id: number; name: string; description?: string | null }

export default function VehicleMakersPage() {
  const { organizationName } = useOrganization();
  const {
    vehicleMakers: items,
    loading,
    error,
  } = useOptimizedVehicleMakers();

  const [itemsState, setItems] = useState<VehicleMaker[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<VehicleMaker | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; form?: string }>({});
  const [form, setForm] = useState<{ name: string; description?: string }>({ name: "", description: "" });

  useEffect(() => {
    document.title = `Vehicle Makers  | ${organizationName}`;
    if (error) {
      toast({ title: "Failed to load makers", variant: "destructive" });
    }
  }, [organizationName, error]);

  useEffect(() => {
    if (items) {
      setItems(items);
    }
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return itemsState.filter(i => i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q));
  }, [itemsState, query]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Vehicle Makers</h1>
            <p className="text-sm text-muted-foreground">Manage vehicle manufacturers</p>
          </div>
          <Button disabled>Add Maker</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading Makers...</CardTitle>
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
          <h1 className="text-2xl font-semibold mb-1">Vehicle Makers</h1>
          <p className="text-sm text-muted-foreground">Manage vehicle manufacturers</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormErrors({}); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ name: "", description: "" }); }}>Add Maker</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Maker" : "Add Maker"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {formErrors.form && <p className="text-sm text-red-600">{formErrors.form}</p>}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
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
                setFormErrors(errors);
                if (Object.keys(errors).length) return;
                const payload = { name: form.name.trim(), description: form.description || '' };
                setSaving(true);
                try {
                  if (editing) {
                    const updated = await api.put<VehicleMaker>(`/vehicle-makers/${editing.id}/`, payload);
                    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
                    toast({ title: 'Maker updated' });
                  } else {
                    const created = await api.post<VehicleMaker>(`/vehicle-makers/`, payload);
                    setItems(prev => [created, ...prev]);
                    toast({ title: 'Maker created' });
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
            <CardTitle>All Makers</CardTitle>
            <Input placeholder="Search by name or description" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{m.name}</td>
                    <td className="p-3">{m.description || '-'}</td>
                    <td className="p-3 text-right w-[140px]">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(m); setForm({ name: m.name, description: m.description || '' }); setOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (!confirm(`Delete maker "${m.name}"?`)) return;
                          try {
                            await api.del<void>(`/vehicle-makers/${m.id}/`);
                            setItems(prev => prev.filter(i => i.id !== m.id));
                            toast({ title: 'Maker deleted' });
                          } catch (e: any) {
                            const msg = typeof e?.message === 'string' && e.message.includes('Protected')
                              ? 'Cannot delete: maker has related models.'
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
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">No makers found.</td>
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
