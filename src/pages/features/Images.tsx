import { useEffect, useMemo, useState, useCallback } from "react";
import { api, API_ROOT } from "@/lib/api";
import { runWithConcurrencyDetailed, maybeCompressImage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
// API_ROOT comes from central api helper; uses HTTPS in production

interface VehicleModel { id: number; name: string }
interface FeatureCategory { id: number; name: string }
interface FeatureType { id: number; name: string; category: FeatureCategory }
interface FeaturePrice { id: number; vehicle_model: VehicleModel; feature_category: FeatureCategory; feature_type?: FeatureType | null }
interface FeatureImage { id: number; image: string; alt_text?: string | null; feature_price: number }

function fullImageUrl(path: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  // Use the new unified storage S3 bucket for media files
  if (path.startsWith("/")) return `https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com${path}`;
  return `https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/${path}`;
}

function priceLabel(p: FeaturePrice): string {
  const vm = p.vehicle_model?.name || 'Model';
  const cat = p.feature_category?.name || 'Category';
  const typ = p.feature_type?.name ? ` / ${p.feature_type.name}` : '';
  return `${vm} / ${cat}${typ}`;
}

const PAGE_SIZE = 20;

export default function FeatureImagesPage() {
  const { organizationName } = useOrganization();
  const [prices, setPrices] = useState<FeaturePrice[]>([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [imagesByPrice, setImagesByPrice] = useState<Record<number, FeatureImage[]>>({});
  const [loadingByPrice, setLoadingByPrice] = useState<Record<number, boolean>>({});
  const [primaryByPrice, setPrimaryByPrice] = useState<Record<number, FeatureImage | null>>({});
  const [uploadQueue, setUploadQueue] = useState<Record<number, File[]>>({});
  const [altMap, setAltMap] = useState<Record<number, string>>({});
  const [savingByPrice, setSavingByPrice] = useState<Record<number, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => {
    document.title = `Feature Images  | ${organizationName}`;
    const fetchPrices = async () => {
      setLoading(true);
      try {
        const offset = (currentPage - 1) * PAGE_SIZE;
        const response = await api.get<any>(`/feature-prices/?limit=${PAGE_SIZE}&offset=${offset}`);
        
        // Handle paginated response
        const prs = Array.isArray(response) ? response : (response.results || response.data || []);
        const count = response.count || prs.length;
        
        setPrices(prs);
        setTotalCount(count);
        
        // Prefetch primary image per price so preview shows without expanding
        await Promise.all(prs.map(async (p) => {
          const pid = p.id;
          try {
            setLoadingByPrice(prev => ({ ...prev, [pid]: true }));
            console.log('Loading initial images for priceId:', pid);
            const imgs = await api.get<FeatureImage[]>(`/feature-images/?feature_price=${pid}`);
            console.log('Loaded initial images for priceId', pid, ':', imgs);
            setPrimaryByPrice(prev => ({ ...prev, [pid]: imgs[0] || null }));
          } catch (error) {
            console.error('Error loading initial images for priceId', pid, ':', error);
            // ignore per-row failures
          } finally {
            setLoadingByPrice(prev => ({ ...prev, [pid]: false }));
          }
        }));
      } catch (error) {
        toast({ title: "Failed to load prices", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
  }, [organizationName, currentPage]);

  const filteredPrices = useMemo(() => {
    const q = query.toLowerCase();
    return prices.filter(p => priceLabel(p).toLowerCase().includes(q));
  }, [prices, query]);

  const loadImages = useCallback(async (priceId: number) => {
    setLoadingByPrice(prev => ({ ...prev, [priceId]: true }));
    try {
      console.log('Loading images for priceId:', priceId);
      const imgs = await api.get<FeatureImage[]>(`/feature-images/?feature_price=${priceId}`);
      console.log('Loaded images for priceId', priceId, ':', imgs);
      setImagesByPrice(prev => ({ ...prev, [priceId]: imgs }));
    } catch (error) {
      console.error('Error loading images for priceId', priceId, ':', error);
      toast({ title: 'Failed to load images', variant: 'destructive' });
    } finally {
      setLoadingByPrice(prev => ({ ...prev, [priceId]: false }));
    }
  }, []);

  const toggleExpand = (priceId: number) => {
    setOpenId(prev => {
      const isOpening = prev !== priceId;
      if (isOpening && !imagesByPrice[priceId]) {
        void loadImages(priceId);
      }
      return isOpening ? priceId : null;
    });
  };

  const onDrop = useCallback((priceId: number, ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const dropped = Array.from(ev.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (dropped.length) setUploadQueue(prev => ({ ...prev, [priceId]: [...(prev[priceId] || []), ...dropped] }));
  }, []);
  const onDragOver = useCallback((ev: React.DragEvent<HTMLDivElement>) => { ev.preventDefault(); }, []);

  const handlePickFiles = (priceId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      const selected = Array.from(input.files || []).filter(f => f.type.startsWith('image/'));
      if (selected.length) setUploadQueue(prev => ({ ...prev, [priceId]: [...(prev[priceId] || []), ...selected] }));
    };
    input.click();
  };

  const handleUpload = async (priceId: number) => {
    const files = uploadQueue[priceId] || [];
    if (!files.length) return;
    setSavingByPrice(prev => ({ ...prev, [priceId]: true }));
    try {
      const alt = altMap[priceId];
      const { succeeded, errors } = await runWithConcurrencyDetailed(files, 4, async (f) => {
        const uploadFile = await maybeCompressImage(f);
        const fd = new FormData();
        fd.append('feature_price_id', String(priceId));
        fd.append('image', uploadFile);
        if (alt) fd.append('alt_text', alt);
        return api.postForm<FeatureImage>(`/feature-images/`, fd);
      });
      // Refresh the list from server to ensure UI reflects backend state
      const fresh = await api.get<FeatureImage[]>(`/feature-images/?feature_price=${priceId}`);
      setImagesByPrice(prev => ({ ...prev, [priceId]: fresh }));
      setUploadQueue(prev => ({ ...prev, [priceId]: [] }));
      const ok = succeeded.length; const failed = errors.length;
      toast({ title: `Uploaded ${ok} image${ok === 1 ? '' : 's'}`, ...(failed ? { description: `${failed} failed` } : {}) });
    } catch (e: any) {
      const text = e?.message || 'Upload failed';
      toast({ title: text, variant: 'destructive' });
    } finally {
      setSavingByPrice(prev => ({ ...prev, [priceId]: false }));
    }
  };

  const handleDeleteImage = async (priceId: number, imageId: number) => {
    if (!confirm('Delete this image?')) return;
    try {
      await api.del<void>(`/feature-images/${imageId}/`);
      setImagesByPrice(prev => ({ ...prev, [priceId]: (prev[priceId] || []).filter(im => im.id !== imageId) }));
      toast({ title: 'Image deleted' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Feature Images</h1>
          <p className="text-sm text-muted-foreground">List of feature prices with expandable image galleries</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Feature Images</CardTitle>
            <Input placeholder="Search by model, category or type" value={query} onChange={e => setQuery(e.target.value)} className="max-w-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {filteredPrices.map(p => {
              const pid = p.id;
              const imgs = imagesByPrice[pid];
              const primary = (imgs && imgs[0]) || primaryByPrice[pid] || null;
              const isOpen = openId === pid;
              return (
                <div key={pid} className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-36 h-24 rounded-md overflow-hidden bg-muted/40 flex items-center justify-center">
                      {primary ? (
                        <img
                          src={fullImageUrl(primary.image)}
                          alt={primary.alt_text || ''}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image load error for priceId', pid, ':', primary.image, 'Full URL:', fullImageUrl(primary.image));
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully for priceId', pid, ':', primary.image, 'Full URL:', fullImageUrl(primary.image));
                          }}
                        />
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {loadingByPrice[pid] ? 'Loading…' : `No image (pid: ${pid})`}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" title={priceLabel(p)}>{priceLabel(p)}</div>
                      <div className="text-xs text-muted-foreground">
                        {imgs ? `${imgs.length} image${imgs.length === 1 ? '' : 's'}` : (loadingByPrice[pid] ? 'Loading…' : 'More info to view gallery')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleExpand(pid)}>{isOpen ? 'Show less' : 'More info'}</Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4">
                      {/* Upload area */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2">
                          <div
                            className="border-2 border-dashed rounded-md p-4 text-center hover:bg-muted/30 cursor-pointer"
                            onDrop={(ev) => onDrop(pid, ev)}
                            onDragOver={onDragOver}
                            onClick={() => handlePickFiles(pid)}
                          >
                            <p className="text-sm text-muted-foreground">Drag & drop images here, or click to select</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Alt text (optional)</label>
                          <Input value={altMap[pid] || ''} onChange={e => setAltMap(prev => ({ ...prev, [pid]: e.target.value }))} />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setUploadQueue(prev => ({ ...prev, [pid]: [] }))}>Clear</Button>
                            <Button size="sm" disabled={savingByPrice[pid]} onClick={() => handleUpload(pid)}>Upload</Button>
                          </div>
                        </div>
                      </div>
                      {uploadQueue[pid]?.length ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
                          {uploadQueue[pid].map((f, idx) => (
                            <div key={`${f.name}-${idx}`} className="relative border rounded-md overflow-hidden">
                              <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-24 object-cover" />
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded"
                                onClick={() => setUploadQueue(prev => ({ ...prev, [pid]: (prev[pid] || []).filter((_, i) => i !== idx) }))}
                              >Remove</button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Images grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(imgs || []).map(img => (
                          <div key={img.id} className="border rounded-md overflow-hidden">
                            <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                              <img src={fullImageUrl(img.image)} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-2 flex items-center justify-between gap-2 text-sm">
                              <span className="truncate" title={img.alt_text || undefined}>{img.alt_text || '—'}</span>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteImage(pid, img.id)}>Delete</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!imgs || imgs.length === 0) && !loadingByPrice[pid] && (
                          <div className="col-span-full p-8 text-center text-muted-foreground">No images yet for this price.</div>
                        )}
                        {loadingByPrice[pid] && (
                          <div className="col-span-full p-8 text-center text-muted-foreground">Loading images…</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredPrices.length === 0 && !loading && (
              <div className="p-8 text-center text-muted-foreground">No matching feature prices.</div>
            )}
            {loading && (
              <div className="p-8 text-center text-muted-foreground">Loading feature prices...</div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} prices
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                          }}
                          isActive={currentPage === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
