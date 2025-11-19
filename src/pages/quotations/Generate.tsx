import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
// import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { api, API_ROOT } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
// Removed carousel; we will implement a simple gallery with thumbnails
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useOrganization } from "@/hooks/useOrganization";
// Backend types
interface VehicleType { id: number; name: string; code: string }
interface VehicleMaker { id: number; name: string }
interface VehicleModel { id: number; name: string; maker: VehicleMaker; vehicle_type: VehicleType }
interface FeatureCategory { id: number; name: string; parent: number | null }
interface FeatureType { id: number; name: string; category: FeatureCategory }
interface FeaturePrice { id: number; price: string | number; vehicle_model: VehicleModel; feature_type?: FeatureType | null; feature_category: FeatureCategory }
interface FeatureImage { id: number; image: string; alt_text?: string | null; feature_price?: number }

// Centralized API_ROOT
function fullImageUrl(path: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  // Use the new unified storage S3 bucket for media files
  if (path.startsWith("/")) return `https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com${path}`;
  return `https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/${path}`;
}
type CustomerInfo = {
  name: string;
  phone: string;
  email: string;
  vehicleNumber: string;
};

type Customer = {
  id: number;
  name: string;
  phone_number: string;
  whatsapp_number?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
};

export default function GenerateQuotation() {
  const navigate = useNavigate();
  const { organizationName } = useOrganization();
  const [step, setStep] = useState(1);
  // Vehicle selectors (backend)
  const [vTypes, setVTypes] = useState<VehicleType[]>([]);
  const [makers, setMakers] = useState<VehicleMaker[]>([]);
  const [modelsByType, setModelsByType] = useState<VehicleModel[]>([]);
  const [modelsForMaker, setModelsForMaker] = useState<VehicleModel[]>([]);
  const [vehicle, setVehicle] = useState<{ typeId: number | null; makerId: number | null; modelId: number | null; variant: string }>({
    typeId: null,
    makerId: null,
    modelId: null,
    variant: ""
  });
  const [selected, setSelected] = useState<{
    [categoryId: number]: number | null;
  }>({});
  // Backend categories/types
  const [cats, setCats] = useState<FeatureCategory[]>([]);
  const parentCats = useMemo(() => cats.filter(c => c.parent == null), [cats]);
  const [activeParentCategory, setActiveParentCategory] = useState<number | null>(null);
  const subCats = useMemo(() => (pid: number) => cats.filter(c => c.parent === pid), [cats]);
  // Desired parent category order
  const normalize = (s: string) => s.trim().toLowerCase();
  const parentNameOrder: Record<string, number> = useMemo(() => ({
    [normalize('Front Section')]: 0,
    [normalize('Side Section')]: 1,
    [normalize('On Chassis / Underbody')]: 2,
    [normalize('Inside Cargo Body')]: 3,
    [normalize('Rear Section')]: 4,
    [normalize('Painting')]: 5,
    [normalize('Accessories')]: 6,
  }), []);
  const sortKey = (name: string) => parentNameOrder[normalize(name)] ?? 999;
  const parentCategories = useMemo(() => {
    return [...parentCats].sort((a, b) => sortKey(a.name) - sortKey(b.name));
  }, [parentCats]);
  const [typesForModel, setTypesForModel] = useState<FeatureType[]>([]);
  // Map feature_type.id => { price, fpId }
  const [featurePriceMap, setFeaturePriceMap] = useState<Record<number, { price: number; fpId: number }>>({});
  // Map feature_category.id => { price, fpId } for categories without types
  const [categoryPriceMap, setCategoryPriceMap] = useState<Record<number, { price: number; fpId: number }>>({});
  // Images cache: feature_type.id => images
  const [imagesByFt, setImagesByFt] = useState<Record<number, FeatureImage[] | null>>({});
  const [loadingImagesByFt, setLoadingImagesByFt] = useState<Record<number, boolean>>({});
  const [loadedCategories, setLoadedCategories] = useState<Set<number>>(new Set());
  const [selectedFeaturesOpen, setSelectedFeaturesOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasFeatureImages, setHasFeatureImages] = useState(false);
  const [focusedFeatureId, setFocusedFeatureId] = useState<number | null>(null);

  // Reset focused feature when switching parent categories
  useEffect(() => {
    setFocusedFeatureId(null);
    if (activeParentCategory) {
      loadFeaturesForCategory(activeParentCategory);
    }
  }, [activeParentCategory]);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [customFeature, setCustomFeature] = useState({
    category: "",
    name: "",
    price: ""
  });
  const [customFeatures, setCustomFeatures] = useState<Array<{ category: string, name: string, price: number }>>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
    vehicleNumber: ""
  });
  const [quotationDate, setQuotationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | "">("");
  const customerOptions: ComboboxOption[] = useMemo(() => customers.map(c => ({
    value: String(c.id),
    label: `${c.name} • ${c.phone_number}${c.city ? ` • ${c.city}` : ""}`
  })), [customers]);
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  useEffect(() => {
    document.title = `Generate Quotation | ${organizationName}`;
    // load vehicle types, makers, and categories - handle pagination
    Promise.all([
      api.get<any>("/vehicle-types/?page_size=1000"),
      api.get<any>("/vehicle-makers/?page_size=1000"),
      api.get<any>("/feature-categories/?page_size=1000")
    ]).then(([vtRes, mkRes, fcRes]) => {
      // Extract results from paginated response or use array directly
      const vt = Array.isArray(vtRes) ? vtRes : (vtRes.results || []);
      const mk = Array.isArray(mkRes) ? mkRes : (mkRes.results || []);
      const fc = Array.isArray(fcRes) ? fcRes : (fcRes.results || []);
      setVTypes(vt);
      setMakers(mk);
      setCats(fc);
      const parents = fc.filter(c => c.parent == null);
      const sorted = [...parents].sort((a, b) => sortKey(a.name) - sortKey(b.name));
      if (sorted[0]) setActiveParentCategory(sorted[0].id);
    }).catch(() => toast({ title: 'Failed to load initial data', variant: 'destructive' }));
    // Prefetch customers (first page or list)
    api.get<any>("/customers/")
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setCustomers(list as Customer[]);
      })
      .catch(() => { });
  }, [organizationName]);

  // When vehicle type changes, load models by type
  useEffect(() => {
    if (!vehicle.typeId) { setModelsByType([]); setModelsForMaker([]); return; }
    api.get<any>(`/vehicle-models/by_vehicle_type/?vehicle_type_id=${vehicle.typeId}&page_size=1000`)
      .then(msRes => {
        // Extract results from paginated response or use array directly
        const ms = Array.isArray(msRes) ? msRes : (msRes.results || []);
        setModelsByType(ms);
        const validMakerIds = new Set(ms.map(m => m.maker.id));
        if (vehicle.makerId && !validMakerIds.has(vehicle.makerId)) {
          setVehicle(v => ({ ...v, makerId: null, modelId: null }));
        }
      })
      .catch(() => toast({ title: 'Failed to load models', variant: 'destructive' }));
  }, [vehicle.typeId]);

  // When maker changes, filter models client-side
  useEffect(() => {
    if (!vehicle.makerId) { setModelsForMaker([]); return; }
    const filtered = modelsByType.filter(m => m.maker.id === vehicle.makerId);
    setModelsForMaker(filtered);
    if (vehicle.modelId && !filtered.some(m => m.id === vehicle.modelId)) {
      setVehicle(v => ({ ...v, modelId: null }));
    }
  }, [vehicle.makerId, modelsByType]);

  // When model changes, load types and prices for that model
  useEffect(() => {
    if (!vehicle.modelId) { setTypesForModel([]); setFeaturePriceMap({}); setImagesByFt({}); setLoadingImagesByFt({}); return; }

    // Clear previously loaded data when model changes
    setLoadedCategories(new Set());
    setTypesForModel([]);
    setFeaturePriceMap({});
    setCategoryPriceMap({});
    setImagesByFt({});
    setLoadingImagesByFt({});

    if (activeParentCategory) {
      loadFeaturesForCategory(activeParentCategory);
    }
  }, [vehicle.modelId]);

  const loadFeaturesForCategory = async (categoryId: number) => {
    if (!vehicle.modelId || loadedCategories.has(categoryId)) return;

    const relevantCategoryIds = [categoryId, ...subCats(categoryId).map(sc => sc.id)];

    try {
      // Fetch feature types and prices for each category separately and aggregate - handle pagination
      const typePromises = relevantCategoryIds.map(cid =>
        api.get<any>(`/feature-types/by_vehicle_model/?vehicle_model_id=${vehicle.modelId}&category_id=${cid}&page_size=1000`)
      );
      const pricePromises = relevantCategoryIds.map(cid =>
        api.get<any>(`/feature-prices/?vehicle_model=${vehicle.modelId}&feature_category=${cid}&page_size=1000`)
      );

      const [ftsArrays, fpsArrays] = await Promise.all([
        Promise.all(typePromises),
        Promise.all(pricePromises)
      ]);

      // Extract results from paginated responses or use arrays directly
      const fts = ftsArrays.flatMap(ftRes => Array.isArray(ftRes) ? ftRes : (ftRes.results || []));
      const fps = fpsArrays.flatMap(fpRes => Array.isArray(fpRes) ? fpRes : (fpRes.results || []));

      setTypesForModel(prev => [...prev, ...fts]);

      const featureMap: Record<number, { price: number; fpId: number }> = {};
      const categoryMap: Record<number, { price: number; fpId: number }> = {};
      for (const fp of fps) {
        const priceNum = typeof fp.price === 'string' ? parseFloat(fp.price) : fp.price;
        if (Number.isNaN(priceNum)) continue;

        if (fp.feature_type && fp.feature_type.id) {
          featureMap[fp.feature_type.id] = { price: priceNum, fpId: fp.id };
        } else if (fp.feature_category && fp.feature_category.id) {
          categoryMap[fp.feature_category.id] = { price: priceNum, fpId: fp.id };
        }
      }

      setFeaturePriceMap(prev => ({ ...prev, ...featureMap }));
      setCategoryPriceMap(prev => ({ ...prev, ...categoryMap }));

      setLoadedCategories(prev => new Set(prev).add(categoryId));

    } catch (error) {
      toast({ title: `Failed to load features for category ${categoryId}`, variant: 'destructive' });
    }
  };

  const total = useMemo(() => {
    return Object.entries(selected).reduce((sum: number, [categoryId, selectedId]) => {
      if (!selectedId) return sum;
      const categoryIdNum = parseInt(categoryId);

      // Check if it's a feature type ID
      if (featurePriceMap[selectedId]) {
        return sum + featurePriceMap[selectedId].price;
      }

      // Check if it's a category ID (for categories without types)
      if (selectedId === categoryIdNum && categoryPriceMap[categoryIdNum]) {
        return sum + categoryPriceMap[categoryIdNum].price;
      }

      return sum;
    }, 0);
  }, [selected, featurePriceMap, categoryPriceMap]);
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

  // Image pan/drag functionality
  const isEventFromNoPan = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement | null;
    return !!el && !!el.closest('[data-no-pan="true"]');
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1 && hasFeatureImages && !isEventFromNoPan(e)) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1 && hasFeatureImages) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Add constraints to prevent dragging too far
      const maxX = (containerSize.width * (imageZoom - 1)) / 2;
      const maxY = (containerSize.height * (imageZoom - 1)) / 2;
      const constrainedX = Math.max(-maxX, Math.min(maxX, newX));
      const constrainedY = Math.max(-maxY, Math.min(maxY, newY));

      setImagePosition({ x: constrainedX, y: constrainedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetImagePosition = () => {
    setImagePosition({ x: 0, y: 0 });
  };

  // Keep container size up to date
  useEffect(() => {
    const updateSize = () => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset position when zoom resets
  useEffect(() => {
    if (imageZoom === 1) setImagePosition({ x: 0, y: 0 });
  }, [imageZoom]);

  const totalWithCustom = Number(total || 0) + customFeatures.reduce((sum, cf) => sum + cf.price, 0);

  const validateCustomerInfo = () => {
    const newErrors: Partial<CustomerInfo> = {};

    if (!customerInfo.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!customerInfo.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(customerInfo.phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    if (customerInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (customerInfo.vehicleNumber && !/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}$/i.test(customerInfo.vehicleNumber)) {
      newErrors.vehicleNumber = "Invalid vehicle number format (e.g., MH 01 AB 1234)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const finalize = async () => {
    if (!validateCustomerInfo()) return;
    if (!vehicle.makerId || !vehicle.modelId) {
      toast({ title: 'Select vehicle maker and model', variant: 'destructive' });
      return;
    }
    try {
      const features = Object.entries(selected)
        .filter(([, selectedId]) => !!selectedId)
        .map(([categoryId, selectedId]) => {
          const categoryIdNum = parseInt(categoryId);
          const id = selectedId as number;

          // Check if it's a feature type
          if (featurePriceMap[id]) {
            const unit_price = featurePriceMap[id].price;
            return { feature_type_id: id, quantity: 1, unit_price };
          }

          // Check if it's a category without types
          if (selectedId === categoryIdNum && categoryPriceMap[categoryIdNum]) {
            const unit_price = categoryPriceMap[categoryIdNum].price;
            return { feature_category_id: categoryIdNum, quantity: 1, unit_price };
          }

          return null;
        })
        .filter(Boolean);
      // Note: customFeatures are not part of the formal schema yet; can be added later as AddedFeatures on Bill
      const customFeaturePayloads = customFeatures.map(cf => ({ custom_name: cf.name, quantity: 1, unit_price: cf.price }));
      const payload: any = {
        vehicle_maker: vehicle.makerId,
        vehicle_model: vehicle.modelId,
        vehicle_number: customerInfo.vehicleNumber || '',
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || '',
        customer_address: customerAddress || '',
        quotation_date: quotationDate,
        features: [...features, ...customFeaturePayloads],
      };
      if (selectedCustomerId) payload.customer_id = Number(selectedCustomerId);
      await api.post<any>(`/quotations/`, payload);
      toast({ title: 'Quotation created' });
      navigate(`/quotations`);
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to create quotation';
      toast({ title: msg, variant: 'destructive' });
    }
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
      const type = vTypes.find(vt => vt.id === vehicle.typeId);
      const maker = makers.find(vm => vm.id === vehicle.makerId);
      const model = modelsByType.find(md => md.id === vehicle.modelId);
      return `${type?.name || ''} - ${maker?.name || ''} ${model?.name || ''}`.trim();
    }
    return "No vehicle selected";
  };

  // Parent categories for horizontal tabs
  // parentCategories already sorted via memo above

  // Get current feature image based on selected features
  const getCurrentFeatureImage = () => {
    const selectedFeatureIds = Object.values(selected).filter(Boolean);
    if (selectedFeatureIds.length > 0) {
      // Return different images based on selected features or category
      const categoryImages: {
        [key: number]: string;
      } = {
        10: "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png",
        // Front Section
        30: "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png",
        // Rear Section
        40: "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png",
        // Side Section
        50: "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png",
        // Inside Cargo Body
        60: "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png",
        // On Chassis / Underbody
        70: "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png",
        // Accessories
        76: "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png" // Painting
      };
      if (activeParentCategory == null) return "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png";
      return categoryImages[activeParentCategory] || "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png";
    }
    return "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png";
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
                  {vTypes.map(vt => <SelectItem key={vt.id} value={vt.id.toString()}>{vt.name}</SelectItem>)}
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
                  {[...new Map(modelsByType.map(m => [m.maker.id, m.maker])).values()].map(mk => (
                    <SelectItem key={mk.id} value={mk.id.toString()}>{mk.name}</SelectItem>
                  ))}
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
                  {modelsForMaker.map(md => <SelectItem key={md.id} value={md.id.toString()}>{md.name}</SelectItem>)}
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
                {Object.entries(selected).filter(([, selectedId]) => selectedId).map(([categoryId, selectedId]) => {
                  const category = cats.find(c => c.id === +categoryId);
                  const categoryIdNum = parseInt(categoryId);

                  // Check if it's a feature type
                  const feature = typesForModel.find(f => f.id === selectedId);
                  let featureName = '';
                  let price = 0;

                  if (feature) {
                    featureName = feature.name;
                    price = featurePriceMap[feature.id]?.price ?? 0;
                  } else if (selectedId === categoryIdNum && categoryPriceMap[categoryIdNum]) {
                    // It's a category without types
                    featureName = category?.name || 'Unknown';
                    price = categoryPriceMap[categoryIdNum].price;
                  }

                  return <div key={categoryId} className="flex items-center justify-between p-3 border rounded-lg animate-fade-in hover:shadow-sm transition-all duration-200 hover:scale-[1.01] group">
                    <div className="flex-1">
                      <div className="font-medium text-sm group-hover:text-foreground transition-colors duration-150">{featureName}</div>
                      <div className="text-xs text-muted-foreground">{category?.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors duration-150">
                        ₹{price.toLocaleString()}
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
                    <span className="text-green-600">₹{Number(total || 0).toLocaleString()}</span>
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
        <Tabs value={(activeParentCategory ?? '').toString()} onValueChange={value => setActiveParentCategory(parseInt(value))} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-4 h-auto mx-6 flex-shrink-0">
            {parentCategories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id.toString()} className="text-xs sm:text-sm whitespace-normal text-center h-auto py-3 leading-tight">
                {cat.name}
              </TabsTrigger>
            ))}
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
                    {!loadedCategories.has(parentCat.id) && (
                      <div className="text-center p-8 text-muted-foreground">
                        Loading features...
                      </div>
                    )}
                    {loadedCategories.has(parentCat.id) && subCats(parentCat.id).map(subCat => {
                      const features = typesForModel.filter(ft => ft.category.id === subCat.id);
                      const categoryPrice = categoryPriceMap[subCat.id];
                      const hasFeatures = features.length > 0;
                      const hasCategoryPrice = categoryPrice !== undefined;

                      if (!hasFeatures && !hasCategoryPrice) return null;

                      return (
                        <div key={subCat.id} className="border rounded-lg p-4 animate-fade-in hover:shadow-sm transition-all duration-200">
                          <h3 className="font-medium mb-3 text-foreground">{subCat.name}</h3>
                          <div className="space-y-2">
                            {/* Show feature types if they exist */}
                            {features.map(feature => (
                              <label key={feature.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-all duration-150 hover:scale-[1.02] group">
                                <input
                                  type="radio"
                                  name={`category-${subCat.id}`}
                                  checked={selected[subCat.id] === feature.id}
                                  onChange={() => {
                                    setSelected({ ...selected, [subCat.id]: feature.id });
                                    setFocusedFeatureId(feature.id);
                                  }}
                                  className="text-primary transition-colors duration-150"
                                />
                                <span className="flex-1 text-sm group-hover:text-foreground transition-colors duration-150">{feature.name}</span>
                                <Badge variant="outline" className="text-xs group-hover:border-primary/50 transition-colors duration-150">₹{(featurePriceMap[feature.id]?.price ?? 0).toLocaleString()}</Badge>
                              </label>
                            ))}

                            {/* Show category option if it has a price but no types */}
                            {hasCategoryPrice && !hasFeatures && (
                              <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-all duration-150 hover:scale-[1.02] group">
                                <input
                                  type="radio"
                                  name={`category-${subCat.id}`}
                                  checked={selected[subCat.id] === subCat.id}
                                  onChange={() => {
                                    setSelected({ ...selected, [subCat.id]: subCat.id });
                                    setFocusedFeatureId(subCat.id);
                                  }}
                                  className="text-primary transition-colors duration-150"
                                />
                                <span className="flex-1 text-sm group-hover:text-foreground transition-colors duration-150">{subCat.name}</span>
                                <Badge variant="outline" className="text-xs group-hover:border-primary/50 transition-colors duration-150">₹{categoryPrice.price.toLocaleString()}</Badge>
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel - Preview (60%) */}
              <div className="lg:col-span-3 flex flex-col">
                <Card className="flex-1 flex flex-col">
                  <CardContent className="flex-1 flex flex-col p-6">
                    <div
                      className="bg-muted/30 rounded-lg relative w-full h-[420px] md:h-[480px] overflow-hidden flex items-center justify-center"
                      ref={previewRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={{ cursor: hasFeatureImages && imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                    >
                      <FeaturePreviewCarousel
                        activeParentCategory={activeParentCategory}
                        cats={cats}
                        selected={selected}
                        featurePriceMap={featurePriceMap}
                        categoryPriceMap={categoryPriceMap}
                        imagesByFt={imagesByFt}
                        loadingImagesByFt={loadingImagesByFt}
                        imageZoom={imageZoom}
                        imagePosition={imagePosition}
                        hasFeatureImages={hasFeatureImages}
                        setHasFeatureImages={setHasFeatureImages}
                        focusedFeatureId={focusedFeatureId}
                        setFocusedFeatureId={setFocusedFeatureId}
                        onNeedImages={async (ftId: number) => {
                          if (!vehicle.modelId) return;
                          if (loadingImagesByFt[ftId]) return;

                          // Check if it's a feature type or category
                          const featureEntry = featurePriceMap[ftId];
                          const categoryEntry = categoryPriceMap[ftId];

                          console.log('Loading images for ftId:', ftId, 'featureEntry:', featureEntry, 'categoryEntry:', categoryEntry);

                          if (!featureEntry && !categoryEntry) {
                            console.log('No price entry found for ftId:', ftId);
                            setImagesByFt(prev => ({ ...prev, [ftId]: [] }));
                            return;
                          }

                          try {
                            setLoadingImagesByFt(prev => ({ ...prev, [ftId]: true }));
                            // Use the appropriate price ID for the API call
                            const priceId = featureEntry ? featureEntry.fpId : categoryEntry.fpId;
                            console.log('Fetching images for priceId:', priceId);
                            const imgsRes = await api.get<any>(`/feature-images/?feature_price=${priceId}&page_size=1000`);
                            // Extract results from paginated response or use array directly
                            const imgs = Array.isArray(imgsRes) ? imgsRes : (imgsRes.results || []);
                            console.log('Loaded images:', imgs);
                            setImagesByFt(prev => ({ ...prev, [ftId]: imgs }));
                          } catch (error) {
                            console.error('Error loading images:', error);
                            setImagesByFt(prev => ({ ...prev, [ftId]: [] }));
                          } finally {
                            setLoadingImagesByFt(prev => ({ ...prev, [ftId]: false }));
                          }
                        }}
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {parentCat.name}
                        </Badge>
                      </div>
                      {/* Zoom Controls - Only show for feature images */}
                      {hasFeatureImages && (
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setImageZoom(prev => Math.min(prev + 0.25, 3));
                              resetImagePosition();
                            }}
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setImageZoom(prev => Math.max(prev - 0.25, 0.5));
                              resetImagePosition();
                            }}
                          >
                            -
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-xs"
                            onClick={() => {
                              setImageZoom(1);
                              resetImagePosition();
                            }}
                          >
                            Reset
                          </Button>
                          <div className="text-xs text-center bg-background/80 px-2 py-1 rounded text-muted-foreground">
                            {Math.round(imageZoom * 100)}%
                          </div>
                          {imageZoom > 1 && (
                            <div className="text-xs text-center bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-2 py-1 rounded">
                              Drag to pan
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground text-center mt-4">
                      {vehicle.typeId && vehicle.makerId && vehicle.modelId ? `${vTypes.find(vt => vt.id === vehicle.typeId)?.name} - ${makers.find(vm => vm.id === vehicle.makerId)?.name}` : "Select vehicle configuration"}
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
              Total: <span className="text-green-600">₹{Number(total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>;
  }

  // Step 3: Review

  const selectedFeaturesList = Object.entries(selected)
    .filter(([, selectedId]) => selectedId)
    .map(([categoryId, selectedId]) => {
      const category = cats.find(c => c.id === +categoryId);
      const categoryIdNum = parseInt(categoryId);

      // Check if it's a feature type
      const feature = typesForModel.find(f => f.id === selectedId);
      if (feature) {
        const cost = featurePriceMap[feature.id]?.price ?? 0;
        return { category: category?.name, feature: feature.name, cost };
      }

      // Check if it's a category without types
      if (selectedId === categoryIdNum && categoryPriceMap[categoryIdNum]) {
        const cost = categoryPriceMap[categoryIdNum].price;
        return { category: category?.name, feature: category?.name, cost };
      }

      return { category: category?.name, feature: 'Unknown', cost: 0 };
    });

  // Local Feature Preview component
  function FeaturePreviewCarousel(props: {
    activeParentCategory: number | null;
    cats: FeatureCategory[];
    selected: { [categoryId: number]: number | null };
    featurePriceMap: Record<number, { price: number; fpId: number }>;
    categoryPriceMap: Record<number, { price: number; fpId: number }>;
    imagesByFt: Record<number, FeatureImage[] | null>;
    loadingImagesByFt: Record<number, boolean>;
    imageZoom: number;
    imagePosition: { x: number; y: number };
    hasFeatureImages: boolean;
    setHasFeatureImages: (hasImages: boolean) => void;
    focusedFeatureId: number | null;
    setFocusedFeatureId: (id: number | null) => void;
    onNeedImages: (ftId: number) => void | Promise<void>;
  }) {
    const { activeParentCategory, cats, selected, featurePriceMap, categoryPriceMap, imagesByFt, loadingImagesByFt, imageZoom, imagePosition, hasFeatureImages, setHasFeatureImages, focusedFeatureId, setFocusedFeatureId, onNeedImages } = props;
    const selectedFeatureIds = useMemo(() => {
      if (!activeParentCategory) return [];
      const subIds = cats.filter(c => c.parent === activeParentCategory).map(c => c.id);
      const selectedIds: number[] = [];

      for (const cid of subIds) {
        const ftId = selected[cid];
        if (ftId) {
          // Check if this is a feature type (has a price in featurePriceMap)
          if (featurePriceMap[ftId]) {
            selectedIds.push(ftId); // This is a feature type with images
          }
          // Check if this is a category selection (ftId === cid) and has category price
          else if (ftId === cid && categoryPriceMap[cid]) {
            selectedIds.push(cid); // This is a category with images
          }
        }
      }
      return selectedIds;
    }, [activeParentCategory, cats, selected, featurePriceMap, categoryPriceMap]);

    // Always prioritize focused feature, only fallback to first selected if no focus
    const currentFtId = focusedFeatureId || (selectedFeatureIds.length > 0 ? selectedFeatureIds[0] : null);

    // If we have a focused feature, ensure it's valid and has images
    const effectiveFtId = focusedFeatureId && (focusedFeatureId in featurePriceMap || focusedFeatureId in categoryPriceMap)
      ? focusedFeatureId
      : (selectedFeatureIds.length > 0 ? selectedFeatureIds[0] : null);

    // Load images for the effective focused feature
    useEffect(() => {
      if (!effectiveFtId) return;
      // Check if it's a feature type or category with price
      const hasFeaturePrice = effectiveFtId in featurePriceMap;
      const hasCategoryPrice = effectiveFtId in categoryPriceMap;
      if (!hasFeaturePrice && !hasCategoryPrice) return; // no price for this feature/category
      if (imagesByFt[effectiveFtId] === undefined) {
        onNeedImages(effectiveFtId);
      }
    }, [effectiveFtId, featurePriceMap, categoryPriceMap, imagesByFt, onNeedImages]);

    // Get images for the effective focused feature only
    const images = effectiveFtId ? imagesByFt[effectiveFtId] : undefined;
    const isDefault = !effectiveFtId || !images || images.length === 0;
    const loading = !!(effectiveFtId && loadingImagesByFt[effectiveFtId]);


    // Tell parent whether we have real feature images (controls visibility), outside of render returns
    useEffect(() => {
      const has = !isDefault && Array.isArray(images) && images.length > 0;
      setHasFeatureImages(has);
    }, [isDefault, images ? images.length : 0, setHasFeatureImages]);

    if (isDefault) {
      // Default image - no zoom or pan (shows when no feature type is selected or category-only selection)
      return <img src={getCurrentFeatureImage()} alt="Vehicle Preview" className="h-full w-full object-contain" />;
    }
    const [selectedIdx, setSelectedIdx] = useState(0);
    useEffect(() => { setSelectedIdx(0); }, [effectiveFtId]);
    if (loading) {
      return <div className="p-8 text-muted-foreground">Loading images…</div>;
    }
    if (!images || images.length === 0) {
      // No feature images available for focused feature - show default image without zoom
      return <img src={getCurrentFeatureImage()} alt="Vehicle Preview" className="h-full w-full object-contain" />;
    }
    return (
      <div className="w-full h-full relative">
        <div className="flex items-center justify-center h-full w-full">
          <img
            src={fullImageUrl(images[Math.min(selectedIdx, images.length - 1)]?.image)}
            alt={images[Math.min(selectedIdx, images.length - 1)]?.alt_text || ''}
            className="h-full w-full object-contain transition-transform duration-200"
            style={{
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageZoom})`,
              transformOrigin: 'center center'
            }}
          />
        </div>
        {/* Thumbnails */}
        <div className="absolute bottom-2 left-2 right-2 bg-black/40 rounded-md p-2 overflow-x-auto" data-no-pan="true">
          <div className="flex gap-2" data-no-pan="true">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setSelectedIdx(idx)}
                className={`h-14 w-20 flex-shrink-0 rounded border ${idx === selectedIdx ? 'border-white' : 'border-transparent'} overflow-hidden`}
                title={img.alt_text || ''}
                data-no-pan="true"
              >
                <img src={fullImageUrl(img.image)} alt={img.alt_text || ''} className="h-full w-full object-cover" data-no-pan="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }


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
            <Select value={customFeature.category} onValueChange={(value) => setCustomFeature({ ...customFeature, category: value })}>
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
              onChange={(e) => setCustomFeature({ ...customFeature, name: e.target.value })}
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
                onChange={(e) => setCustomFeature({ ...customFeature, price: e.target.value })}
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

    <div className="flex justify-end">
      <div className="text-xl font-bold sticky bottom-0">Total: ₹{totalWithCustom.toLocaleString()}</div>
    </div>

    {/* Customer Information Form */}
    <Card className="max-w-6xl">
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label>Select Existing Customer</Label>
            <Combobox
              value={selectedCustomerId}
              onChange={(val) => {
                setSelectedCustomerId(val);
                if (!val) return;
                const found = customers.find(c => String(c.id) === val);
                if (found) {
                  setCustomerInfo({
                    name: found.name,
                    phone: found.phone_number || "",
                    email: found.email || "",
                    vehicleNumber: customerInfo.vehicleNumber,
                  });
                  setCustomerAddress(found.address || "");
                }
              }}
              options={customerOptions}
              placeholder="Search by name or phone"
              searchPlaceholder="Type to filter..."
              emptyText="No customers"
            />
            <p className="text-xs text-muted-foreground mt-1">Pick a previous customer to auto-fill details, or leave empty to add a new one.</p>
          </div>
          <div>
            <Label htmlFor="customerName">Name *</Label>
            <Input
              id="customerName"
              type="text"
              placeholder="Enter customer name"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="customerPhone">Phone Number *</Label>
            <Input
              id="customerPhone"
              type="tel"
              placeholder="10 digit phone number"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value.replace(/\D/g, '') })}
              maxLength={10}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
          </div>

          <div>
            <Label htmlFor="customerEmail">Email ID</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="customer@example.com"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <Input
              id="vehicleNumber"
              type="text"
              placeholder="MH 01 AB 1234"
              value={customerInfo.vehicleNumber}
              onChange={(e) => setCustomerInfo({ ...customerInfo, vehicleNumber: e.target.value.toUpperCase() })}
              className={errors.vehicleNumber ? "border-destructive" : ""}
            />
            {errors.vehicleNumber && <p className="text-sm text-destructive mt-1">{errors.vehicleNumber}</p>}
          </div>

          <div>
            <Label htmlFor="quotationDate">Quotation Date</Label>
            <Input
              id="quotationDate"
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-4">
            <Label htmlFor="customerAddress">Address</Label>
            <textarea
              id="customerAddress"
              placeholder="Customer address"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
      <Button onClick={finalize}>Generate Quote</Button>
    </div>
  </section>;
}
