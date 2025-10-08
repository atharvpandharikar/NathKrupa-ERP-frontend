import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { useOrganization } from "@/hooks/useOrganization";
interface VehicleMaker { id: number; name: string }

interface VehicleModel { id: number; name: string; }
interface FeatureCategory { id: number; name: string; }
interface FeatureType { id: number; name: string; category: FeatureCategory; vehicle_models: VehicleModel[] }

export default function FeatureTypesPage() {
  const { organizationName } = useOrganization();
  const [items, setItems] = useState<FeatureType[]>([]);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<FeatureCategory[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; category_id?: string; form?: string }>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureType | null>(null);
  const [form, setForm] = useState<{ name: string; category_id: number | ""; vehicle_model_ids: number[] }>({ name: "", category_id: "", vehicle_model_ids: [] });
  const [vmQuery, setVmQuery] = useState("");

  useEffect(() => {
    document.title = `Feature Types  | ${organizationName}`;
    Promise.all([
      api.get<FeatureType[]>("/feature-types/"),
      api.get<FeatureCategory[]>("/feature-categories/"),
      api.get<VehicleModel[]>("/vehicle-models/"),
    ])
  .then(([fts, cats, vms]) => { setItems(fts); setCategories(cats); setModels(vms); })
  .catch(() => toast({ title: "Failed to load data", description: "Please refresh the page or try again later.", variant: "destructive" }));
  }, [organizationName]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(i => {
      const matchesCategory = categoryFilter ? i.category?.id === categoryFilter : true;
      const matchesQuery = (
        i.name.toLowerCase().includes(q) ||
        i.category?.name?.toLowerCase().includes(q) ||
        i.vehicle_models?.some(v => v.name.toLowerCase().includes(q))
      );
      return matchesCategory && matchesQuery;
    });
  }, [items, query, categoryFilter]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Feature Types</h1>
          <p className="text-sm text-muted-foreground">Manage reusable feature types per vehicle model</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormErrors({}); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ name: "", category_id: "", vehicle_model_ids: [] }); }}>Add Feature Type</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Feature Type" : "Add Feature Type"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {formErrors.form && <p className="text-sm text-red-600">{formErrors.form}</p>}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Combobox
                  value={form.category_id ? String(form.category_id) : ""}
                  onChange={(val) => setForm(f => ({ ...f, category_id: val ? Number(val) : "" }))}
                  options={categories.map(c => ({ label: c.name, value: String(c.id) }))}
                  placeholder="Select category"
                  searchPlaceholder="Search categories..."
                />
                {formErrors.category_id && <p className="text-xs text-red-600">{formErrors.category_id}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Models</label>
                <Input placeholder="Search vehicle models..." value={vmQuery} onChange={e => setVmQuery(e.target.value)} className="h-8" />
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto p-2 border rounded-md">
                  {models.filter(m => m.name.toLowerCase().includes(vmQuery.toLowerCase())).map(m => {
                    const checked = form.vehicle_model_ids.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          setForm(f => ({
                            ...f,
                            vehicle_model_ids: e.target.checked ? [...f.vehicle_model_ids, m.id] : f.vehicle_model_ids.filter(id => id !== m.id)
                          }));
                        }} />
                        {m.name}
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
                if (!form.category_id) errors.category_id = 'Category is required';
                setFormErrors(errors);
                if (Object.keys(errors).length) return;

                const payload = { name: form.name.trim(), category_id: form.category_id, vehicle_model_ids: form.vehicle_model_ids } as any;
                setSaving(true);
                try {
                  if (editing) {
                    const updated = await api.put<FeatureType>(`/feature-types/${editing.id}/`, payload);
                    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
                    toast({ title: 'Feature type updated' });
                  } else {
                    const created = await api.post<FeatureType>(`/feature-types/`, payload);
                    setItems(prev => [created, ...prev]);
                    toast({ title: 'Feature type created' });
                  }
                  setOpen(false);
                } catch (e: any) {
                  let msg = e?.message || 'Save failed';
                  try { const parsed = JSON.parse(msg); msg = JSON.stringify(parsed); } catch {}
                  setFormErrors({ form: msg });
                  toast({ title: 'Failed to save', variant: 'destructive' });
                } finally {
                  setSaving(false);
                }
              }}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Feature Types</CardTitle>
            <div className="flex items-center gap-2">
              <label className="sr-only">Filter by category</label>
              <Combobox
                value={categoryFilter ? String(categoryFilter) : ""}
                onChange={(val) => setCategoryFilter(val ? Number(val) : "")}
                options={categories.map(c => ({ label: c.name, value: String(c.id) }))}
                placeholder="All categories"
                searchPlaceholder="Search categories..."
              />
              <Input placeholder="Search by name, category or vehicle" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
        <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Feature Type</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Vehicle Models</th>
          <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ft => (
                  <tr key={ft.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{ft.name}</td>
                    <td className="p-3">{ft.category?.name || "-"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {ft.vehicle_models?.length ? ft.vehicle_models.map(vm => (
                          <Badge key={vm.id} variant="secondary">{vm.name}</Badge>
                        )) : <span className="text-muted-foreground">None</span>}
                      </div>
                    </td>
                    <td className="p-3 text-right w-[140px]">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(ft); setForm({ name: ft.name, category_id: ft.category?.id || "", vehicle_model_ids: ft.vehicle_models?.map(v => v.id) || [] }); setOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          if (!confirm(`Delete feature type "${ft.name}"?`)) return;
                          try {
                            await api.del<void>(`/feature-types/${ft.id}/`);
                            setItems(prev => prev.filter(i => i.id !== ft.id));
                            toast({ title: "Feature type deleted" });
                          } catch {
                            toast({ title: "Delete failed", description: "Couldn't delete this feature type.", variant: "destructive" });
                          }
                        }}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">No feature types found.</td>
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
