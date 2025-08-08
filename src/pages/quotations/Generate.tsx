import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { categories, featureTypes, vehicleTypes, vehicleMakers, vehicleModels, getMakerModels, getTypeMakers, saveQuotation } from "@/mock/data";
import type { QuotationCreated } from "@/types";
import { useNavigate } from "react-router-dom";

export default function Generate() {
  useEffect(() => { document.title = "Generate Quotation | Nathkrupa"; }, []);

  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState({ typeId: null as number | null, makerId: null as number | null, modelId: null as number | null, variant: "" });
  const [selected, setSelected] = useState<Record<number, number | null>>({});

  const mainCategories = useMemo(() => categories.filter(c => !c.parentId), []);
  const childByParent = useMemo(() => {
    const map: Record<number, number[]> = {};
    categories.forEach(c => { if (c.parentId) { (map[c.parentId] ||= []).push(c.id); } });
    return map;
  }, []);

  const featuresByCategory = (catId: number) => featureTypes.filter(f => f.categoryId === catId);

  const total = useMemo(() => Object.values(selected).reduce((s, ftId) => {
    if (!ftId) return s; const ft = featureTypes.find(f => f.id === ftId); return s + (ft?.base_cost || 0);
  }, 0), [selected]);

  // Step 1
  const makers = vehicle.typeId ? getTypeMakers(vehicle.typeId) : vehicleMakers;
  const models = vehicle.makerId ? getMakerModels(vehicle.makerId) : [];

  // Save quote
  const finalize = () => {
    const id = `Q-${Date.now()}`;
    const payload: QuotationCreated = {
      id,
      vehicle,
      selectedFeatures: selected,
      total,
      created_at: new Date().toISOString(),
    };
    saveQuotation(payload);
    navigate(`/quotations/${id}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {step === 1 && (
        <section className="max-w-3xl">
          <h1 className="text-2xl font-semibold mb-4">Step 1: Vehicle Selection</h1>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Vehicle Type</label>
              <Select onValueChange={(v)=>setVehicle({ typeId: Number(v), makerId: null, modelId: null, variant: "" })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Maker</label>
              <Select onValueChange={(v)=>setVehicle(s=>({ ...s, makerId: Number(v), modelId: null }))}>
                <SelectTrigger><SelectValue placeholder="Select maker" /></SelectTrigger>
                <SelectContent>
                  {makers.map(m => (<SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Model</label>
              <Select onValueChange={(v)=>setVehicle(s=>({ ...s, modelId: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {models.map(m => (<SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={()=>setStep(2)} disabled={!vehicle.typeId || !vehicle.makerId || !vehicle.modelId}>Continue</Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="text-2xl font-semibold mb-2">Step 2: Configure Features</h1>
          <div className="grid grid-cols-12 gap-4">
            {/* Left 40% */}
            <div className="col-span-12 md:col-span-5 border rounded-lg bg-card">
              <div className="p-3 border-b"><strong>Categories</strong></div>
              <div className="max-h-[60vh] overflow-auto p-3 space-y-4">
                {mainCategories.map(main => (
                  <div key={main.id}>
                    <div className="text-sm font-medium mb-2">{main.name}</div>
                    <div className="space-y-2">
                      {(childByParent[main.id] || [main.id]).map((cid) => (
                        <div key={cid} className="border rounded-md">
                          <div className="px-2 py-1 text-xs text-muted-foreground border-b">{(categories.find(c=>c.id===cid)?.name) || ''}</div>
                          <div className="p-2 space-y-2">
                            {featuresByCategory(cid).map(ft => (
                              <button key={ft.id} className={`w-full text-left px-3 py-2 rounded-md border ${selected[cid]===ft.id? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`} onClick={()=>setSelected(s=>({ ...s, [cid]: ft.id }))}>
                                <div className="flex items-center justify-between">
                                  <span>{ft.name}</span>
                                  <span className="text-sm">₹{ft.base_cost}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 60% */}
            <div className="col-span-12 md:col-span-7 rounded-lg bg-card border flex flex-col">
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">Live Vehicle Preview</div>
              </div>
              <div className="border-t p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Estimated Total</div>
                    <div className="text-2xl font-bold">₹{total}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={()=>setStep(1)}>Back</Button>
                    <Button onClick={()=>setStep(3)}>Next</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="max-w-3xl">
          <h1 className="text-2xl font-semibold mb-2">Step 3: Customer Info & Summary</h1>
          <p className="text-sm text-muted-foreground mb-4">This simulates quote creation and stores it locally.</p>
          <div className="border rounded-lg p-4 mb-4">
            <div className="font-medium mb-2">Summary</div>
            <ul className="text-sm space-y-1 max-h-48 overflow-auto">
              {Object.entries(selected).map(([cid, ftid]) => {
                const cat = categories.find(c=>c.id===Number(cid));
                const ft = featureTypes.find(f=>f.id===ftid!);
                if (!ft) return null;
                return <li key={cid} className="flex justify-between"><span>{cat?.name}</span><span>₹{ft.base_cost}</span></li>
              })}
            </ul>
            <div className="mt-3 text-right font-semibold">Total: ₹{total}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={()=>setStep(2)}>Back</Button>
            <Button onClick={finalize}>Generate Quote</Button>
          </div>
        </section>
      )}
    </div>
  );
}
