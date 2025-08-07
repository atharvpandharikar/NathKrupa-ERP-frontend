import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import vehiclePreview from "@/assets/vehicle-preview.jpg";

interface Feature {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
}

interface FeatureCategory {
  id: string;
  name: string;
  features: Feature[];
}

const mockFeatures: FeatureCategory[] = [
  {
    id: "exterior",
    name: "Exterior",
    features: [
      { id: "metallic-silver", name: "Metallic Silver", price: 0 },
      { id: "gloss-black", name: "Gloss Black", price: 1500 },
      { id: "ceramic-white", name: "Ceramic White", price: 800 },
      { id: "racing-red", name: "Racing Red", price: 1200 },
      { id: "midnight-blue", name: "Midnight Blue", price: 1000 },
    ]
  },
  {
    id: "wheels",
    name: "Wheels",
    features: [
      { id: "20-standard", name: "20\" Standard Alloy", price: 0 },
      { id: "21-diamond", name: "21\" Diamond Turned", price: 2500 },
      { id: "22-sport", name: "22\" Sport Design", price: 3500 },
      { id: "22-gloss", name: "22\" Gloss Black", price: 4000 },
    ]
  },
  {
    id: "interior",
    name: "Interior",
    features: [
      { id: "fabric-black", name: "Premium Fabric Black", price: 0 },
      { id: "leather-tan", name: "Windsor Leather Tan", price: 2000 },
      { id: "leather-black", name: "Windsor Leather Black", price: 1800 },
      { id: "alcantara", name: "Alcantara Sport", price: 2500 },
    ]
  },
  {
    id: "technology",
    name: "Technology",
    features: [
      { id: "basic-infotainment", name: "Basic Infotainment", price: 0 },
      { id: "premium-sound", name: "Premium Sound System", price: 1500 },
      { id: "navigation-pro", name: "Navigation Pro", price: 800 },
      { id: "heads-up-display", name: "Heads-Up Display", price: 1200 },
    ]
  },
  {
    id: "safety",
    name: "Safety & Driver Assistance",
    features: [
      { id: "basic-safety", name: "Basic Safety Package", price: 0 },
      { id: "adaptive-cruise", name: "Adaptive Cruise Control", price: 1000 },
      { id: "park-assist", name: "Park Assist Pro", price: 800 },
      { id: "night-vision", name: "Night Vision", price: 1500 },
    ]
  }
];

export default function VehicleConfigurator() {
  const [activeCategory, setActiveCategory] = useState("exterior");
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, string>>({
    exterior: "metallic-silver",
    wheels: "20-standard",
    interior: "fabric-black",
    technology: "basic-infotainment",
    safety: "basic-safety"
  });

  const handleFeatureSelect = (categoryId: string, featureId: string) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [categoryId]: featureId
    }));
  };

  const getSelectedFeature = (categoryId: string): Feature | undefined => {
    const category = mockFeatures.find(cat => cat.id === categoryId);
    if (!category) return undefined;
    return category.features.find(feature => feature.id === selectedFeatures[categoryId]);
  };

  const getTotalPrice = () => {
    let total = 45000; // Base price
    Object.entries(selectedFeatures).forEach(([categoryId, featureId]) => {
      const category = mockFeatures.find(cat => cat.id === categoryId);
      const feature = category?.features.find(f => f.id === featureId);
      if (feature) total += feature.price;
    });
    return total;
  };

  const getSelectedFeaturesList = () => {
    return Object.entries(selectedFeatures).map(([categoryId, featureId]) => {
      const category = mockFeatures.find(cat => cat.id === categoryId);
      const feature = category?.features.find(f => f.id === featureId);
      return feature ? { category: category?.name, feature } : null;
    }).filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-configurator-bg">
      {/* Header Navigation */}
      <header className="bg-configurator-panel border-b border-configurator-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-foreground">VEHICLE CONFIGURATOR</h1>
              <nav className="hidden md:flex space-x-1">
                {mockFeatures.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-feature-hover"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Price</div>
              <div className="text-2xl font-bold text-price-accent">
                £{getTotalPrice().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Configurator */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-5 min-h-[calc(100vh-120px)]">
          {/* Left Panel - Features */}
          <div className="col-span-2 bg-configurator-panel border-r border-configurator-border">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {mockFeatures.find(cat => cat.id === activeCategory)?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred option from the available features
                </p>
              </div>

              {/* Feature Options */}
              <div className="space-y-3">
                {mockFeatures
                  .find(cat => cat.id === activeCategory)
                  ?.features.map((feature) => (
                    <Card
                      key={feature.id}
                      className={`p-4 cursor-pointer transition-all border-2 ${
                        selectedFeatures[activeCategory] === feature.id
                          ? "border-feature-selected bg-feature-selected/5"
                          : "border-configurator-border hover:border-muted-foreground hover:bg-feature-hover"
                      }`}
                      onClick={() => handleFeatureSelect(activeCategory, feature.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedFeatures[activeCategory] === feature.id
                                ? "border-feature-selected bg-feature-selected"
                                : "border-muted-foreground"
                            }`}>
                              {selectedFeatures[activeCategory] === feature.id && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">{feature.name}</h3>
                              {feature.description && (
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            feature.price === 0 
                              ? "text-muted-foreground" 
                              : "text-price-accent"
                          }`}>
                            {feature.price === 0 ? "Included" : `+£${feature.price.toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>

              {/* Selected Features Summary */}
              <div className="mt-8 pt-6 border-t border-configurator-border">
                <h3 className="font-semibold text-foreground mb-4">Selected Features</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getSelectedFeaturesList().map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{item?.category}</span>
                      <div className="text-right">
                        <div className="font-medium text-foreground">{item?.feature.name}</div>
                        <div className="text-price-accent">
                          {item?.feature.price === 0 ? "Included" : `+£${item?.feature.price.toLocaleString()}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Vehicle Preview */}
          <div className="col-span-3 bg-gradient-to-br from-configurator-bg to-configurator-panel">
            <div className="h-full flex flex-col">
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="relative max-w-4xl w-full">
                  <img
                    src={vehiclePreview}
                    alt="Vehicle Preview"
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="text-sm">
                      Live Preview
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="p-6 bg-configurator-panel border-t border-configurator-border">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Range Rover SV</h3>
                    <p className="text-muted-foreground">Standard Wheelbase • D350 Diesel Mild Hybrid</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">From</div>
                    <div className="text-2xl font-bold text-price-accent">
                      £{getTotalPrice().toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-configurator-panel border-t border-configurator-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Selection
            </Button>
            <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
              Continue to Summary
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}