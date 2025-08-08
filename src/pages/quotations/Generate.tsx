import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { vehicleTypes, vehicleMakers, getMakerModels, getTypeMakers, categories, featureTypes, saveQuotation } from "@/mock/data";
import type { QuotationData } from "@/types";
export default function GenerateQuotation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState<QuotationData["vehicle"]>({
    typeId: null,
    makerId: null,
    modelId: null,
    variant: ""
  });
  const [selected, setSelected] = useState<{
    [categoryId: number]: number | null;
  }>({});
  const [activeParentCategory, setActiveParentCategory] = useState(10); // Default to "Front Section"
  const [selectedFeaturesOpen, setSelectedFeaturesOpen] = useState(false);
  const [customFeature, setCustomFeature] = useState({
    category: "",
    name: "",
    price: ""
  });
  const [customFeatures, setCustomFeatures] = useState<Array<{category: string, name: string, price: number}>>([]);
  useEffect(() => {
    document.title = "Generate Quotation | Nathkrupa ERP";
  }, []);
  const total = useMemo(() => {
    return Object.values(selected).reduce((sum, featureTypeId) => {
      if (!featureTypeId) return sum;
      const ft = featureTypes.find(f => f.id === featureTypeId);
      return sum + (ft?.base_cost || 0);
    }, 0);
  }, [selected]);
  const addCustomFeature = () => {
    if (customFeature.category && customFeature.name && customFeature.price) {
      setCustomFeatures([...customFeatures, {
        category: customFeature.category,
        name: customFeature.name,
        price: parseInt(customFeature.price)
      }]);
      setCustomFeature({ category: "", name: "", price: "" });
    }
  };

  const totalWithCustom = total + customFeatures.reduce((sum, cf) => sum + cf.price, 0);

  const finalize = () => {
    const newQuote: QuotationData = {
      id: `QUO-${Date.now()}`,
      vehicle,
      selectedFeatures: selected,
      total: totalWithCustom,
      created_at: new Date().toISOString()
    };
    saveQuotation(newQuote);
    navigate(`/quotations/${newQuote.id}`);
  };
  const clearAllSelections = () => {
    setSelected({});
  };
  const removeFeature = (categoryId: number) => {
    setSelected({
      ...selected,
      [categoryId]: null
    });
  };
  const getSelectedVehicleName = () => {
    if (vehicle.typeId && vehicle.makerId && vehicle.modelId) {
      const type = vehicleTypes.find(vt => vt.id === vehicle.typeId);
      const maker = vehicleMakers.find(vm => vm.id === vehicle.makerId);
      const model = getMakerModels(vehicle.makerId).find(md => md.id === vehicle.modelId);
      return `${type?.name} - ${maker?.name} ${model?.name}`;
    }
    return "No vehicle selected";
  };

  // Parent categories for horizontal tabs
  const parentCategories = [{
    id: 10,
    name: "Front Section"
  }, {
    id: 30,
    name: "Rear Section"
  }, {
    id: 40,
    name: "Side Section"
  }, {
    id: 50,
    name: "Inside Cargo Body"
  }, {
    id: 60,
    name: "On Chassis / Underbody"
  }, {
    id: 70,
    name: "Accessories"
  }, {
    id: 76,
    name: "Painting"
  } // Adding painting as separate category
  ];

  // Get current feature image based on selected features
  const getCurrentFeatureImage = () => {
    const selectedFeatureIds = Object.values(selected).filter(Boolean);
    if (selectedFeatureIds.length > 0) {
      // Return different images based on selected features or category
      const categoryImages: {
        [key: number]: string;
      } = {
        10: "/src/assets/vehicle-preview.jpg",
        // Front Section
        30: "/src/assets/vehicle-preview.jpg",
        // Rear Section
        40: "/src/assets/vehicle-preview.jpg",
        // Side Section
        50: "/src/assets/vehicle-preview.jpg",
        // Inside Cargo Body
        60: "/src/assets/vehicle-preview.jpg",
        // On Chassis / Underbody
        70: "/src/assets/vehicle-preview.jpg",
        // Accessories
        76: "/src/assets/vehicle-preview.jpg" // Painting
      };
      return categoryImages[activeParentCategory] || "/src/assets/vehicle-preview.jpg";
    }
    return "/src/assets/vehicle-preview.jpg";
  };
  if (step === 1) {
    return <section className="space-y-6">
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
                <Select value={vehicle.typeId?.toString() || ""} onValueChange={v => setVehicle({
                ...vehicle,
                typeId: +v,
                makerId: null,
                modelId: null
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Vehicle Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(vt => <SelectItem key={vt.id} value={vt.id.toString()}>{vt.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {vehicle.typeId && <div>
                  <label className="text-sm font-medium mb-2 block">Maker</label>
                  <Select value={vehicle.makerId?.toString() || ""} onValueChange={v => setVehicle({
                ...vehicle,
                makerId: +v,
                modelId: null
              })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Maker" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTypeMakers(vehicle.typeId).map(mk => <SelectItem key={mk.id} value={mk.id.toString()}>{mk.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>}

              {vehicle.makerId && <div>
                  <label className="text-sm font-medium mb-2 block">Model</label>
                  <Select value={vehicle.modelId?.toString() || ""} onValueChange={v => setVehicle({
                ...vehicle,
                modelId: +v
              })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMakerModels(vehicle.makerId).map(md => <SelectItem key={md.id} value={md.id.toString()}>{md.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>}
            </div>

            <div className="flex justify-end mt-6">
              <Button disabled={!vehicle.modelId} onClick={() => setStep(2)}>
                Next: Configure Features
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>;
  }
  if (step === 2) {
    return <div className="h-screen flex flex-col max-w-7xl mx-auto overflow-hidden">
        {/* Compact header with vehicle name and clear selection */}
        <div className="flex items-center justify-between py-4 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold">Vehicle Configurator</h1>
              <p className="text-sm text-muted-foreground">{getSelectedVehicleName()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Sheet open={selectedFeaturesOpen} onOpenChange={setSelectedFeaturesOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  Selected Features ({Object.keys(selected).filter(key => selected[+key]).length})
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    Selected Features
                    <Button variant="outline" size="sm" onClick={clearAllSelections} disabled={Object.keys(selected).filter(key => selected[+key]).length === 0}>
                      Clear All
                    </Button>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-background hover:scrollbar-thumb-border/60 transition-all duration-300 pr-2">
                  {Object.entries(selected).filter(([, featureTypeId]) => featureTypeId).map(([categoryId, featureTypeId]) => {
                  const category = categories.find(c => c.id === +categoryId);
                  const feature = featureTypes.find(f => f.id === featureTypeId);
                  return <div key={categoryId} className="flex items-center justify-between p-3 border rounded-lg animate-fade-in hover:shadow-sm transition-all duration-200 hover:scale-[1.01] group">
                          <div className="flex-1">
                            <div className="font-medium text-sm group-hover:text-foreground transition-colors duration-150">{feature?.name}</div>
                            <div className="text-xs text-muted-foreground">{category?.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors duration-150">
                              ₹{feature?.base_cost}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => removeFeature(+categoryId)} className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-150">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>;
                })}
                  {Object.keys(selected).filter(key => selected[+key]).length === 0 && <p className="text-muted-foreground text-center py-8 animate-fade-in">No features selected</p>}
                  <div className="border-t pt-4 mt-4 sticky bottom-0 bg-background/95 backdrop-blur -mb-6">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Price</span>
                      <span className="text-green-600">₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
            <Button size="sm" onClick={() => setStep(3)}>Next: Review</Button>
          </div>
        </div>

        {/* Horizontal Parent Category Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeParentCategory.toString()} onValueChange={value => setActiveParentCategory(parseInt(value))} className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-4 h-auto mx-6 flex-shrink-0">
              {parentCategories.map(cat => <TabsTrigger key={cat.id} value={cat.id.toString()} className="text-xs sm:text-sm whitespace-normal text-center h-auto py-3 leading-tight">
                  {cat.name}
                </TabsTrigger>)}
            </TabsList>

            {parentCategories.map(parentCat => <TabsContent key={parentCat.id} value={parentCat.id.toString()} className="flex-1 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full px-6">
                  {/* Left Panel - Feature Categories (40%) */}
                  <div className="lg:col-span-2 flex flex-col">
                    <Card className="flex-1 flex flex-col">
                      <CardHeader className="pb-3 flex-shrink-0">
                        <CardTitle className="text-base">{parentCat.name} - Features</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-y-auto space-y-4 max-h-[calc(100vh-300px)] scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-background hover:scrollbar-thumb-border/60 transition-all duration-300 pr-2">
                        {categories.filter(c => c.parentId === parentCat.id || parentCat.id === 76 && c.id === 76) // Special handling for Painting
                    .map(subCat => {
                      const features = featureTypes.filter(ft => ft.categoryId === subCat.id);
                      if (features.length === 0) return null;
                      return <div key={subCat.id} className="border rounded-lg p-4 animate-fade-in hover:shadow-sm transition-all duration-200">
                                <h3 className="font-medium mb-3 text-foreground">{subCat.name}</h3>
                                <div className="space-y-2">
                                  {features.map(feature => <label key={feature.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-all duration-150 hover:scale-[1.02] group">
                                      <input type="radio" name={`category-${subCat.id}`} checked={selected[subCat.id] === feature.id} onChange={() => setSelected({
                              ...selected,
                              [subCat.id]: feature.id
                            })} className="text-primary transition-colors duration-150" />
                                      <span className="flex-1 text-sm group-hover:text-foreground transition-colors duration-150">{feature.name}</span>
                                      <Badge variant="outline" className="text-xs group-hover:border-primary/50 transition-colors duration-150">₹{feature.base_cost}</Badge>
                                    </label>)}
                                </div>
                              </div>;
                    })}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Panel - Preview (60%) */}
                  <div className="lg:col-span-3 flex flex-col">
                    <Card className="flex-1 flex flex-col">
                      <CardContent className="flex-1 flex flex-col p-6">
                        <div className="bg-muted/30 rounded-lg flex-1 flex items-center justify-center relative">
                          <img src={getCurrentFeatureImage()} alt="Vehicle Preview" className="max-h-full max-w-full object-contain rounded" />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {parentCat.name}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground text-center mt-4">
                          {vehicle.typeId && vehicle.makerId && vehicle.modelId ? `${vehicleTypes.find(vt => vt.id === vehicle.typeId)?.name} - ${vehicleMakers.find(vm => vm.id === vehicle.makerId)?.name}` : "Select vehicle configuration"}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>)}
          </Tabs>
        </div>

        {/* Summary Footer */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{Object.keys(selected).filter(key => selected[+key]).length}</span> features selected
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-lg font-bold">
                Total: <span className="text-green-600">₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>;
  }

  // Step 3: Review

  const selectedFeaturesList = Object.entries(selected).filter(([, featureTypeId]) => featureTypeId).map(([categoryId, featureTypeId]) => {
    const category = categories.find(c => c.id === +categoryId);
    const feature = featureTypes.find(f => f.id === featureTypeId);
    return {
      category: category?.name,
      feature: feature?.name,
      cost: feature?.base_cost || 0
    };
  });


  return <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Review & Finalize</h1>
        <p className="text-sm text-muted-foreground">Review your configuration and generate quotation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        {/* Left Side - Custom Features */}
        <Card>
          <CardHeader>
            <CardTitle>Add Custom Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Feature Category</label>
              <Select value={customFeature.category} onValueChange={(value) => setCustomFeature({...customFeature, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Front Section">Front Section</SelectItem>
                  <SelectItem value="Rear Section">Rear Section</SelectItem>
                  <SelectItem value="Side Section">Side Section</SelectItem>
                  <SelectItem value="Inside Cargo Body">Inside Cargo Body</SelectItem>
                  <SelectItem value="On Chassis/Underbody">On Chassis/Underbody</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Painting">Painting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Feature Name</label>
              <input 
                type="text"
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter feature name"
                value={customFeature.name}
                onChange={(e) => setCustomFeature({...customFeature, name: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                <input 
                  type="number"
                  className="w-full pl-8 pr-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter price"
                  value={customFeature.price}
                  onChange={(e) => setCustomFeature({...customFeature, price: e.target.value})}
                />
              </div>
            </div>

            <Button 
              onClick={addCustomFeature} 
              disabled={!customFeature.category || !customFeature.name || !customFeature.price}
              className="w-full"
            >
              Add Feature
            </Button>
          </CardContent>
        </Card>

        {/* Right Side - Selected Features */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Regular Features */}
              {selectedFeaturesList.length > 0 && selectedFeaturesList.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span>{item.category} - {item.feature}</span>
                  <Badge>₹{item.cost}</Badge>
                </div>
              ))}
              
              {/* Custom Features with different color */}
              {customFeatures.map((cf, i) => (
                <div key={`custom-${i}`} className="flex justify-between items-center">
                  <span>{cf.category} - {cf.name}</span>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">₹{cf.price}</Badge>
                </div>
              ))}
              
              {selectedFeaturesList.length === 0 && customFeatures.length === 0 && (
                <p className="text-muted-foreground">No features selected</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-right text-xl font-bold">Total: ₹{totalWithCustom.toLocaleString()}</div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
        <Button onClick={finalize}>Generate Quote</Button>
      </div>
    </section>;
}