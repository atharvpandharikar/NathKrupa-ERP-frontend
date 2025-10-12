import { useEffect, useMemo, useState } from "react";
import { api, API_ROOT } from "@/lib/api";
import { runWithConcurrencyDetailed, maybeCompressImage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { useOrganization } from "@/hooks/useOrganization";
import { useOptimizedAllFeatureData } from "@/hooks/useOptimizedData";

// API_ROOT from central helper; HTTPS in production
function fullImageUrl(path: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  // Use the new unified storage S3 bucket for media files
  if (path.startsWith("/")) return `https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com${path}`;
  return `https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/${path}`;
}

interface VehicleModel { id: number; name: string; }
interface FeatureCategory { id: number; name: string; }
interface FeatureType { id: number; name: string; category: FeatureCategory; }
interface FeaturePrice { id: number; vehicle_model: VehicleModel; feature_category?: FeatureCategory | null; feature_type?: FeatureType | null; price: string }
interface FeatureImage { id: number; image: string; alt_text?: string | null; feature_price: number }

export default function FeaturePricesPage() {
  const { organizationName } = useOrganization();
  const {
    prices: items,
    models,
    categories,
    types,
    images,
    loading,
    error,
  } = useOptimizedAllFeatureData();

  const [itemsState, setItems] = useState<FeaturePrice[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeaturePrice | null>(null);
  const [form, setForm] = useState<{ vehicle_model_id: number | ""; feature_category_id: number | ""; feature_type_id: number | ""; price: string }>(
    { vehicle_model_id: "", feature_category_id: "", feature_type_id: "", price: "" }
  );
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof form | 'form', string>>>({});
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  // Inline image upload during create/edit
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadAlt, setUploadAlt] = useState<string>("");
  // Per-row primary image preview
  const [primaryById, setPrimaryById] = useState<Record<number, FeatureImage | null>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<FeaturePrice | null>(null);
  const [detailsImages, setDetailsImages] = useState<FeatureImage[] | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsUploading, setDetailsUploading] = useState(false);
  const [detailsFiles, setDetailsFiles] = useState<File[]>([]);
  const [detailsAlt, setDetailsAlt] = useState<string>("");
  // Edit dialog existing images
  const [editImages, setEditImages] = useState<FeatureImage[] | null>(null);
  const [editImagesLoading, setEditImagesLoading] = useState(false);
  const categoryHasTypes = (cid: number | "") => !!cid && types.some(t => t.category?.id === cid);
  const filteredTypes = (cid: number | "") => types.filter(t => t.category?.id === cid);

  useEffect(() => {
    document.title = `Feature Prices  | ${organizationName}`;
    if (error) {
      toast({ title: "Failed to load data", description: error, variant: "destructive" });
    }
  }, [organizationName, error]);

  useEffect(() => {
    if (items) {
      setItems(items as FeaturePrice[]);
    }
  }, [items]);

  useEffect(() => {
    if (images && items) {
      const primaryImages: Record<number, FeatureImage | null> = {};
      const imagesByPriceId: Record<number, FeatureImage[]> = (images as FeatureImage[]).reduce((acc, img) => {
        if (!acc[img.feature_price]) {
          acc[img.feature_price] = [];
        }
        acc[img.feature_price].push(img);
        return acc;
      }, {} as Record<number, FeatureImage[]>);

      (items as FeaturePrice[]).forEach(fp => {
        primaryImages[fp.id] = (imagesByPriceId[fp.id] && imagesByPriceId[fp.id][0]) || null;
      });
      setPrimaryById(primaryImages);
    }
  }, [images, items]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return itemsState.filter(i => {
      const matchQ = (
        i.vehicle_model?.name?.toLowerCase().includes(q) ||
        i.feature_category?.name?.toLowerCase().includes(q) ||
        i.feature_type?.name?.toLowerCase().includes(q)
      );
      const matchCat = categoryFilter ? i.feature_category?.id === categoryFilter : true;
      return matchQ && matchCat;
    });
  }, [itemsState, query, categoryFilter]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Feature Prices</h1>
            <p className="text-sm text-muted-foreground">Set price per vehicle for category or type</p>
          </div>
          <Button disabled>Add Feature Price</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading Feature Prices...</CardTitle>
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
          <h1 className="text-2xl font-semibold mb-1">Feature Prices</h1>
          <p className="text-sm text-muted-foreground">Set price per vehicle for category or type</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFormErrors({}); setUploadFiles([]); setUploadAlt(""); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm({ vehicle_model_id: "", feature_category_id: "", feature_type_id: "", price: "" }); }}>Add Feature Price</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Feature Price" : "Add Feature Price"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {formErrors.form && <p className="text-sm text-red-600">{formErrors.form}</p>}
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Model</label>
                <Combobox
                  value={form.vehicle_model_id ? String(form.vehicle_model_id) : ""}
                  onChange={(val) => setForm(f => ({ ...f, vehicle_model_id: val ? Number(val) : "" }))}
                  options={(models as VehicleModel[]).map(m => ({ label: m.name, value: String(m.id) }))}
                  placeholder="Select model"
                  searchPlaceholder="Search models..."
                />
                {formErrors.vehicle_model_id && <p className="text-xs text-red-600">{formErrors.vehicle_model_id}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Combobox
                    value={form.feature_category_id ? String(form.feature_category_id) : ""}
                    onChange={(val) => { setForm(f => ({ ...f, feature_category_id: val ? Number(val) : "", feature_type_id: "" })); }}
                    options={(categories as FeatureCategory[]).map(c => ({ label: c.name, value: String(c.id) }))}
                    placeholder="Select category"
                    searchPlaceholder="Search categories..."
                  />
                  {formErrors.feature_category_id && <p className="text-xs text-red-600">{formErrors.feature_category_id}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Feature Type</label>
                  <Combobox
                    value={form.feature_type_id ? String(form.feature_type_id) : ""}
                    onChange={(val) => setForm(f => ({ ...f, feature_type_id: val ? Number(val) : "" }))}
                    options={filteredTypes(form.feature_category_id).map(t => ({ label: t.name, value: String(t.id) }))}
                    placeholder={categoryHasTypes(form.feature_category_id) ? "Select feature type" : "No types available"}
                    searchPlaceholder="Search types..."
                    disabled={!form.feature_category_id || !categoryHasTypes(form.feature_category_id)}
                  />
                  {formErrors.feature_type_id && <p className="text-xs text-red-600">{formErrors.feature_type_id}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                {formErrors.price && <p className="text-xs text-red-600">{formErrors.price}</p>}
                {/* Inline image upload (optional) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Images (optional)</label>
                  <div
                    className="border-2 border-dashed rounded-md p-4 text-center hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.multiple = true;
                      input.onchange = () => {
                        const selected = Array.from(input.files || []).filter(f => f.type.startsWith('image/'));
                        if (selected.length) setUploadFiles(prev => [...prev, ...selected]);
                      };
                      input.click();
                    }}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); if (files.length) setUploadFiles(prev => [...prev, ...files]); }}
                  >
                    <p className="text-sm text-muted-foreground">Drag & drop images here, or click to select</p>
                  </div>
                  {/* Existing images (edit mode) */}
                  {editing && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Existing images</div>
                      {editImagesLoading ? (
                        <div className="p-4 text-center text-muted-foreground">Loading…</div>
                      ) : editImages && editImages.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {editImages.map(img => (
                            <div key={img.id} className="border rounded-md overflow-hidden">
                              <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                                <img src={fullImageUrl(img.image)} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                              </div>
                              <div className="p-1 flex items-center justify-between gap-2 text-xs">
                                <span className="truncate" title={img.alt_text || undefined}>{img.alt_text || '—'}</span>
                                <Button size="sm" className="h-6 px-2 py-0 text-xs" variant="destructive" onClick={async () => {
                                  if (!confirm('Delete this image?')) return;
                                  try {
                                    await api.del<void>(`/feature-images/${img.id}/`);
                                    setEditImages(prev => (prev || []).filter(i => i.id !== img.id));
                                    toast({ title: 'Image deleted' });
                                  } catch { toast({ title: 'Delete failed', variant: 'destructive' }); }
                                }}>Delete</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">No images yet</div>
                      )}
                    </div>
                  )}
                  {uploadFiles.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {uploadFiles.map((f, idx) => (
                        <div key={`${f.name}-${idx}`} className="relative border rounded-md overflow-hidden">
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 object-cover" />
                          <button type="button" className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded" onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <div className="md:col-span-2">
                      <Input placeholder="Alt text (applies to all uploaded images)" value={uploadAlt} onChange={e => setUploadAlt(e.target.value)} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setUploadFiles([]); setUploadAlt(""); }}>Clear</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={saving} onClick={async () => {
                // client-side validation
                const errors: any = {};
                if (!form.vehicle_model_id) errors.vehicle_model_id = 'Vehicle model is required';
                if (!form.feature_category_id) errors.feature_category_id = 'Category is required';
                if (categoryHasTypes(form.feature_category_id) && !form.feature_type_id) errors.feature_type_id = 'Feature type is required';
                if (!form.price || Number(form.price) <= 0) errors.price = 'Enter a valid price';
                setFormErrors(errors);
                if (Object.keys(errors).length) return;

                const payload: any = {
                  vehicle_model_id: form.vehicle_model_id,
                  feature_category_id: form.feature_category_id,
                  feature_type_id: form.feature_type_id || undefined,
                  price: Number(form.price),
                };
                setSaving(true);
                try {
                  let target: FeaturePrice;
                  if (editing) {
                    const updated = await api.put<FeaturePrice>(`/feature-prices/${editing.id}/`, payload);
                    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
                    target = updated;
                    toast({ title: 'Feature price updated' });
                  } else {
                    const created = await api.post<FeaturePrice>(`/feature-prices/`, payload);
                    setItems(prev => [created, ...prev]);
                    target = created;
                    toast({ title: 'Feature price created' });
                  }
                  // Upload images if any
                  if (uploadFiles.length > 0) {
                    const { succeeded, errors } = await runWithConcurrencyDetailed(uploadFiles, 4, async (f) => {
                      const uploadFile = await maybeCompressImage(f);
                      const fd = new FormData();
                      fd.append('feature_price_id', String(target.id));
                      fd.append('image', uploadFile);
                      if (uploadAlt) fd.append('alt_text', uploadAlt);
                      return api.postForm<FeatureImage>(`/feature-images/`, fd);
                    });
                    const ok = succeeded.length; const failed = errors.length;
                    toast({ title: `Uploaded ${ok} image${ok !== 1 ? 's' : ''}`, ...(failed ? { description: `${failed} failed` } : {}) });
                  }
                  setOpen(false);
                } catch (e: any) {
                  let msg = e?.message || 'Save failed';
                  try { const parsed = JSON.parse(msg); msg = JSON.stringify(parsed); } catch { }
                  setFormErrors({ form: msg });
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
            <CardTitle>All Feature Prices</CardTitle>
            <div className="flex items-center gap-2">
              <label className="sr-only">Filter by category</label>
              <Combobox
                value={categoryFilter ? String(categoryFilter) : ""}
                onChange={(val) => setCategoryFilter(val ? Number(val) : "")}
                options={(categories as FeatureCategory[]).map(c => ({ label: c.name, value: String(c.id) }))}
                placeholder="All categories"
                searchPlaceholder="Search categories..."
              />
              <Input placeholder="Search by vehicle, category or type" value={query} onChange={e => setQuery(e.target.value)} className="max-w-xs" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs leading-tight">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1 font-medium">Preview</th>
                  <th className="text-left p-1 font-medium">Vehicle Model</th>
                  <th className="text-left p-1 font-medium">Category</th>
                  <th className="text-left p-1 font-medium">Feature Type</th>
                  <th className="text-left p-1 font-medium">Price</th>
                  <th className="text-right p-1 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(fp => (
                  <tr key={fp.id} className="border-b hover:bg-muted/50">
                    <td className="p-1 w-[96px]">
                      <div className="w-20 h-14 rounded-sm overflow-hidden bg-muted/40 flex items-center justify-center">
                        {primaryById[fp.id] ? (
                          <img src={fullImageUrl(primaryById[fp.id]!.image)} alt={primaryById[fp.id]!.alt_text || ''} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-xs text-muted-foreground">{loading ? 'Loading…' : 'No image'}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-1">{fp.vehicle_model?.name}</td>
                    <td className="p-1">{fp.feature_category?.name || "-"}</td>
                    <td className="p-1">{fp.feature_type?.name || "-"}</td>
                    <td className="p-1">₹{Number(fp.price).toLocaleString()}</td>
                    <td className="p-1 text-right w-[150px]">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" className="h-6 px-2 text-[11px]" variant="secondary" onClick={async () => {
                          setDetailsItem(fp);
                          setDetailsOpen(true);
                          setDetailsImages(null);
                          setDetailsFiles([]);
                          setDetailsAlt("");
                          setDetailsLoading(true);
                          try {
                            const imgs = await api.get<FeatureImage[]>(`/feature-images/?feature_price=${fp.id}`);
                            setDetailsImages(imgs);
                          } catch {
                            setDetailsImages([]);
                          } finally {
                            setDetailsLoading(false);
                          }
                        }}>Details</Button>
                        <Button size="sm" className="h-6 px-2 text-[11px]" variant="outline" onClick={() => {
                          setEditing(fp);
                          setForm({
                            vehicle_model_id: fp.vehicle_model?.id || "",
                            feature_category_id: fp.feature_category?.id || "",
                            feature_type_id: fp.feature_type?.id || "",
                            price: String(fp.price || ""),
                          });
                          setFormErrors({});
                          setUploadFiles([]);
                          setUploadAlt("");
                          // Load existing images for this price
                          setEditImages(null);
                          setEditImagesLoading(true);
                          api.get<FeatureImage[]>(`/feature-images/?feature_price=${fp.id}`)
                            .then(setEditImages)
                            .catch(() => setEditImages([]))
                            .finally(() => setEditImagesLoading(false));
                          setOpen(true);
                        }}>Edit</Button>
                        <Button size="sm" className="h-6 px-2 text-[11px]" variant="destructive" onClick={async () => {
                          if (!confirm("Delete this price?")) return;
                          try {
                            await api.del<void>(`/feature-prices/${fp.id}/`);
                            setItems(prev => prev.filter(i => i.id !== fp.id));
                            toast({ title: 'Feature price deleted' });
                          } catch {
                            toast({ title: 'Delete failed', description: 'Could not delete this price.', variant: 'destructive' });
                          }
                        }}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No feature prices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Consolidated Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={(v) => { setDetailsOpen(v); if (!v) { setDetailsItem(null); setDetailsImages(null); setDetailsFiles([]); setDetailsAlt(""); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Feature Price Details</DialogTitle>
          </DialogHeader>
          {detailsItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Vehicle Model</div>
                  <div className="font-medium">{detailsItem.vehicle_model?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div className="font-medium">{detailsItem.feature_category?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Feature Type</div>
                  <div className="font-medium">{detailsItem.feature_type?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Price</div>
                  <div className="font-medium">₹{Number(detailsItem.price).toLocaleString()}</div>
                </div>
              </div>

              {/* Upload area */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div
                    className="border-2 border-dashed rounded-md p-4 text-center hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.multiple = true;
                      input.onchange = () => {
                        const selected = Array.from(input.files || []).filter(f => f.type.startsWith('image/'));
                        if (selected.length) setDetailsFiles(prev => [...prev, ...selected]);
                      };
                      input.click();
                    }}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); if (files.length) setDetailsFiles(prev => [...prev, ...files]); }}
                  >
                    <p className="text-sm text-muted-foreground">Drag & drop images here, or click to select</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alt text (optional)</label>
                  <Input value={detailsAlt} onChange={e => setDetailsAlt(e.target.value)} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setDetailsFiles([]); setDetailsAlt(""); }}>Clear</Button>
                    <Button size="sm" disabled={detailsUploading} onClick={async () => {
                      if (!detailsItem || detailsFiles.length === 0) return;
                      setDetailsUploading(true);
                      try {
                        const { succeeded, errors } = await runWithConcurrencyDetailed(detailsFiles, 4, async (f) => {
                          const uploadFile = await maybeCompressImage(f);
                          const fd = new FormData();
                          fd.append('feature_price_id', String(detailsItem.id));
                          fd.append('image', uploadFile);
                          if (detailsAlt) fd.append('alt_text', detailsAlt);
                          return api.postForm<FeatureImage>(`/feature-images/`, fd);
                        });
                        // refresh list from server
                        const fresh = await api.get<FeatureImage[]>(`/feature-images/?feature_price=${detailsItem.id}`);
                        setDetailsImages(fresh);
                        setDetailsFiles([]);
                        const ok = succeeded.length; const failed = errors.length;
                        toast({ title: `Uploaded ${ok} image${ok !== 1 ? 's' : ''}`, ...(failed ? { description: `${failed} failed` } : {}) });
                      } catch {
                        toast({ title: 'Upload failed', variant: 'destructive' });
                      } finally {
                        setDetailsUploading(false);
                      }
                    }}>Upload</Button>
                  </div>
                </div>
              </div>

              {detailsFiles.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {detailsFiles.map((f, idx) => (
                    <div key={`${f.name}-${idx}`} className="relative border rounded-md overflow-hidden">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 object-cover" />
                      <button type="button" className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded" onClick={() => setDetailsFiles(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Gallery */}
              <div>
                <div className="text-sm font-medium mb-2">Images</div>
                {detailsLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading images…</div>
                ) : detailsImages && detailsImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {detailsImages.map(img => (
                      <div key={img.id} className="border rounded-md overflow-hidden">
                        <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                          <img src={fullImageUrl(img.image)} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate" title={img.alt_text || undefined}>{img.alt_text || '—'}</span>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="destructive" onClick={async () => {
                              if (!confirm('Delete this image?')) return;
                              try {
                                await api.del<void>(`/feature-images/${img.id}/`);
                                setDetailsImages(prev => (prev || []).filter(i => i.id !== img.id));
                                toast({ title: 'Image deleted' });
                              } catch {
                                toast({ title: 'Delete failed', variant: 'destructive' });
                              }
                            }}>Delete</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No images yet</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}