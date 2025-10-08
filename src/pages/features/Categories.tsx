import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

interface VehicleType { id: number; name: string; }
interface FeatureCategory { id: number; name: string; description?: string | null; parent?: number | null; vehicle_types?: VehicleType[] }

export default function FeatureCategoriesPage() {
  const { organizationName } = useOrganization();
  const [items, setItems] = useState<FeatureCategory[]>([]);
  const [vtypes, setVtypes] = useState<VehicleType[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<FeatureCategory | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; parent_id?: string; form?: string }>({});
  const [form, setForm] = useState<{ name: string; description?: string; parent_id?: number | null; vehicle_type_ids: number[] }>({ name: "", description: "", parent_id: null, vehicle_type_ids: [] });
  const [vtQuery, setVtQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    document.title = `Feature Categories | ${organizationName}`;
    Promise.all([
      api.get<FeatureCategory[]>("/feature-categories/"),
      api.get<VehicleType[]>("/vehicle-types/"),
    ])
      .then(([cats, types]) => { setItems(cats); setVtypes(types); })
      .catch(() => toast({ title: "Failed to load data", variant: "destructive" }));
  }, [organizationName]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const list = items.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    return list;
  }, [items, query]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Feature Categories</h1>
          <p className="text-sm text-muted-foreground">Reusable categories, optionally linked to vehicle types</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", parent_id: null, vehicle_type_ids: [] }); setFormErrors({}); }}>Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Category *</label>
                <select
                  className="h-9 px-2 border rounded-md bg-background"
                  value={form.parent_id ?? ""}
                  onChange={(e) => setForm(f => ({ ...f, parent_id: e.target.value ? Number(e.target.value) : null }))}
                  aria-label="Parent Category"
                  required
                >
                  <option value="">Select Parent Category</option>
                  {items.filter(pc => pc.parent === null).map(pc => (
                    <option key={pc.id} value={pc.id}>{pc.name}</option>
                  ))}
                </select>
                {formErrors.parent_id && <p className="text-xs text-red-600">{formErrors.parent_id}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Types (optional)</label>
                <Input placeholder="Search vehicle types..." value={vtQuery} onChange={e => setVtQuery(e.target.value)} className="h-8" />
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto p-2 border rounded-md">
                  {vtypes.filter(t => t.name.toLowerCase().includes(vtQuery.toLowerCase())).map(t => {
                    const checked = form.vehicle_type_ids.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          setForm(f => ({
                            ...f,
                            vehicle_type_ids: e.target.checked ? [...f.vehicle_type_ids, t.id] : f.vehicle_type_ids.filter(id => id !== t.id)
                          }));
                        }} />
                        {t.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={saving} onClick={async () => {
                const errors: any = {};
                if (!form.name.trim()) errors.name = 'Name is required';
                if (!form.parent_id) errors.parent_id = 'Parent category is required';
                setFormErrors(errors);
                if (Object.keys(errors).length) return;
                const payload: any = { name: form.name.trim(), description: form.description || "", vehicle_type_ids: form.vehicle_type_ids };
                if (form.parent_id !== undefined) payload.parent_id = form.parent_id;
                setSaving(true);
                try {
                  if (editing) {
                    const updated = await api.put<FeatureCategory>(`/feature-categories/${editing.id}/`, payload);
                    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
                    toast({ title: 'Category updated' });
                  } else {
                    const created = await api.post<FeatureCategory>(`/feature-categories/`, payload);
                    setItems(prev => [created, ...prev]);
                    toast({ title: 'Category created' });
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
            <CardTitle>All Categories</CardTitle>
            <Input placeholder="Search by name or description" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Vehicle Types</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(c => (
                  <tr key={c.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{c.vehicle_types?.map(v => v.name).join(', ') || '-'}</td>
                    <td className="p-3 text-right w-[140px]">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || '', parent_id: (c as any).parent ?? null, vehicle_type_ids: c.vehicle_types?.map(v => v.id) || [] }); setOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (!confirm(`Delete category "${c.name}"?`)) return;
                          try {
                            await api.del<void>(`/feature-categories/${c.id}/`);
                            setItems(prev => prev.filter(i => i.id !== c.id));
                            toast({ title: 'Category deleted' });
                          } catch (e: any) {
                            const msg = typeof e?.message === 'string' && e.message.includes('Protected')
                              ? 'Cannot delete: category is in use by feature types/prices.'
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
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">No categories found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
