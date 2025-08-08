import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { vehicleTypes, vehicleMakers, getMakerModels, getTypeMakers, categories, featureTypes, saveQuotation } from "@/mock/data";
import type { QuotationData } from "@/types";

export default function GenerateQuotation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState<QuotationData["vehicle"]>({
    typeId: null,
    makerId: null,
    modelId: null,
    variant: "",
  });
  const [selected, setSelected] = useState<{ [categoryId: number]: number | null }>({});
  const [activeParentCategory, setActiveParentCategory] = useState(10); // Default to "Front Section"

  useEffect(() => {
    document.title = "Generate Quotation | Nathkrupa ERP";
  }, []);

  const total = useMemo(() => {
    return Object.values(selected).reduce((sum, featureTypeId) => {
      if (!featureTypeId) return sum;
      const ft = featureTypes.find((f) => f.id === featureTypeId);
      return sum + (ft?.base_cost || 0);
    }, 0);
  }, [selected]);

  const finalize = () => {
    const newQuote: QuotationData = {
      id: `QUO-${Date.now()}`,
      vehicle,
      selectedFeatures: selected,
      total,
      created_at: new Date().toISOString(),
    };
    saveQuotation(newQuote);
    navigate(`/quotations/${newQuote.id}`);
  };

  // Parent categories for horizontal tabs
  const parentCategories = [
    { id: 10, name: "Front Section" },
    { id: 30, name: "Rear Section" },
    { id: 40, name: "Side Section" },
    { id: 50, name: "Inside Cargo Body" },
    { id: 60, name: "On Chassis / Underbody" },
    { id: 70, name: "Accessories" },
    { id: 76, name: "Painting" } // Adding painting as separate category
  ];

  // Get current feature image based on selected features
  const getCurrentFeatureImage = () => {
    const selectedFeatureIds = Object.values(selected).filter(Boolean);
    if (selectedFeatureIds.length > 0) {
      // Return different images based on selected features or category
      const categoryImages: { [key: number]: string } = {
        10: "/src/assets/vehicle-preview.jpg", // Front Section
        30: "/src/assets/vehicle-preview.jpg", // Rear Section
        40: "/src/assets/vehicle-preview.jpg", // Side Section
        50: "/src/assets/vehicle-preview.jpg", // Inside Cargo Body
        60: "/src/assets/vehicle-preview.jpg", // On Chassis / Underbody
        70: "/src/assets/vehicle-preview.jpg", // Accessories
        76: "/src/assets/vehicle-preview.jpg", // Painting
      };
      return categoryImages[activeParentCategory] || "/src/assets/vehicle-preview.jpg";
    }
    return "/src/assets/vehicle-preview.jpg";
  };

  if (step === 1) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Vehicle Configurator</h1>
          <p className="text-sm text-muted-foreground">Configure your vehicle specifications</p>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Vehicle Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Vehicle Type</label>
                <Select value={vehicle.typeId?.toString() || ""} onValueChange={(v) => setVehicle({ ...vehicle, typeId: +v, makerId: null, modelId: null })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Vehicle Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((vt) => (
                      <SelectItem key={vt.id} value={vt.id.toString()}>{vt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {vehicle.typeId && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Maker</label>
                  <Select value={vehicle.makerId?.toString() || ""} onValueChange={(v) => setVehicle({ ...vehicle, makerId: +v, modelId: null })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Maker" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTypeMakers(vehicle.typeId).map((mk) => (
                        <SelectItem key={mk.id} value={mk.id.toString()}>{mk.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {vehicle.makerId && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Model</label>
                  <Select value={vehicle.modelId?.toString() || ""} onValueChange={(v) => setVehicle({ ...vehicle, modelId: +v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMakerModels(vehicle.makerId).map((md) => (
                        <SelectItem key={md.id} value={md.id.toString()}>{md.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button disabled={!vehicle.modelId} onClick={() => setStep(2)}>
                Next: Configure Features
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (step === 2) {
    return (
      <section className="space-y-6 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Vehicle Configurator</h1>
          <p className="text-muted-foreground">Customize your vehicle features</p>
        </div>

        {/* Horizontal Parent Category Tabs */}
        <Tabs value={activeParentCategory.toString()} onValueChange={(value) => setActiveParentCategory(parseInt(value))}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-8 h-auto">
            {parentCategories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id.toString()} className="text-xs sm:text-sm whitespace-normal text-center h-auto py-3 leading-tight">
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {parentCategories.map((parentCat) => (
            <TabsContent key={parentCat.id} value={parentCat.id.toString()}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Panel - Feature Categories (40%) */}
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{parentCat.name} - Features</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[500px] overflow-y-auto space-y-4">
                      {categories
                        .filter((c) => c.parentId === parentCat.id || (parentCat.id === 76 && c.id === 76)) // Special handling for Painting
                        .map((subCat) => {
                          const features = featureTypes.filter((ft) => ft.categoryId === subCat.id);
                          if (features.length === 0) return null;

                          return (
                            <div key={subCat.id} className="border rounded-lg p-4">
                              <h3 className="font-medium mb-3">{subCat.name}</h3>
                              <div className="space-y-2">
                                {features.map((feature) => (
                                  <label key={feature.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                                    <input
                                      type="radio"
                                      name={`category-${subCat.id}`}
                                      checked={selected[subCat.id] === feature.id}
                                      onChange={() => setSelected({ ...selected, [subCat.id]: feature.id })}
                                      className="text-primary"
                                    />
                                    <span className="flex-1 text-sm">{feature.name}</span>
                                    <Badge variant="outline" className="text-xs">₹{feature.base_cost}</Badge>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel - Preview and Summary (60%) */}
                <div className="lg:col-span-3 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Vehicle Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/30 rounded-lg h-80 flex items-center justify-center mb-4 relative">
                        <img 
                          src={getCurrentFeatureImage()}
                          alt="Vehicle Preview" 
                          className="max-h-full max-w-full object-contain rounded"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {parentCat.name}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground text-center">
                        {vehicle.typeId && vehicle.makerId && vehicle.modelId 
                          ? `${vehicleTypes.find(vt => vt.id === vehicle.typeId)?.name} - ${vehicleMakers.find(vm => vm.id === vehicle.makerId)?.name}`
                          : "Select vehicle configuration"
                        }
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Selected Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Object.entries(selected)
                          .filter(([, featureTypeId]) => featureTypeId)
                          .map(([categoryId, featureTypeId]) => {
                            const category = categories.find((c) => c.id === +categoryId);
                            const feature = featureTypes.find((f) => f.id === featureTypeId);
                            return (
                              <div key={categoryId} className="flex justify-between items-center py-2 border-b">
                                <div>
                                  <div className="font-medium text-sm">{feature?.name}</div>
                                  <div className="text-xs text-muted-foreground">{category?.name}</div>
                                </div>
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                  ₹{feature?.base_cost}
                                </Badge>
                              </div>
                            );
                          })}
                        {Object.keys(selected).filter(key => selected[+key]).length === 0 && (
                          <p className="text-muted-foreground text-center py-4">No features selected</p>
                        )}
                      </div>

                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total Price</span>
                          <span className="text-green-600">₹{total.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
          <Button onClick={() => setStep(3)}>Next: Review</Button>
        </div>
      </section>
    );
  }

  // Step 3: Review
  const selectedFeaturesList = Object.entries(selected)
    .filter(([, featureTypeId]) => featureTypeId)
    .map(([categoryId, featureTypeId]) => {
      const category = categories.find((c) => c.id === +categoryId);
      const feature = featureTypes.find((f) => f.id === featureTypeId);
      return { category: category?.name, feature: feature?.name, cost: feature?.base_cost || 0 };
    });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Review & Finalize</h1>
        <p className="text-sm text-muted-foreground">Review your configuration and generate quotation</p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Selected Features</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFeaturesList.length > 0 ? (
              <ul className="space-y-2">
                {selectedFeaturesList.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{item.category} - {item.feature}</span>
                    <Badge>₹{item.cost}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No features selected</p>
            )}
          </CardContent>
        </Card>

        <div className="text-right text-xl font-bold">Total: ₹{total}</div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
          <Button onClick={finalize}>Generate Quote</Button>
        </div>
      </div>
    </section>
  );
}