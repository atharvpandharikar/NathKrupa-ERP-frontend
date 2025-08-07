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
      {/* Header */}
      <header className="bg-configurator-panel border-b border-configurator-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">VEHICLE CONFIGURATOR</h1>
            <div className="text-sm text-muted-foreground">
              Range Rover SV • Standard Wheelbase
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout - Exact 40/60 split */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - 40% */}
        <div className="w-2/5 bg-configurator-panel border-r border-configurator-border flex flex-col">
          {/* Tabs to select from Categories */}
          <div className="border-b border-configurator-border">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-foreground mb-3">Vehicle Configurator</h2>
              <div className="flex flex-wrap gap-1">
                {mockFeatures.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                      activeCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-feature-hover"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subcategories */}
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <h3 className="text-base font-medium text-foreground mb-3">
                {mockFeatures.find(cat => cat.id === activeCategory)?.name}
              </h3>
              
              {/* Feature Type if available */}
              <div className="space-y-2">
                {mockFeatures
                  .find(cat => cat.id === activeCategory)
                  ?.features.map((feature) => (
                    <div
                      key={feature.id}
                      className={`p-3 border rounded cursor-pointer transition-all ${
                        selectedFeatures[activeCategory] === feature.id
                          ? "border-feature-selected bg-feature-selected/5"
                          : "border-configurator-border hover:border-muted-foreground hover:bg-feature-hover"
                      }`}
                      onClick={() => handleFeatureSelect(activeCategory, feature.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedFeatures[activeCategory] === feature.id
                              ? "border-feature-selected bg-feature-selected"
                              : "border-muted-foreground"
                          }`}>
                            {selectedFeatures[activeCategory] === feature.id && (
                              <Check className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground">{feature.name}</span>
                        </div>
                        <span className={`text-sm font-medium ${
                          feature.price === 0 
                            ? "text-muted-foreground" 
                            : "text-price-accent"
                        }`}>
                          {feature.price === 0 ? "Included" : `+£${feature.price.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - 60% */}
        <div className="w-3/5 bg-gradient-to-br from-configurator-bg to-configurator-panel flex flex-col">
          {/* Vehicle Image */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="relative max-w-full w-full">
              <img
                src={vehiclePreview}
                alt="Vehicle Preview"
                className="w-full h-auto object-contain max-h-96"
              />
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="text-xs">
                  Live Preview
                </Badge>
              </div>
            </div>
          </div>

          {/* Selected Feature List (scrollable) */}
          <div className="bg-configurator-panel border-t border-configurator-border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Selected Features</h3>
              <div className="space-y-3 max-h-40 overflow-y-auto mb-6">
                {getSelectedFeaturesList().map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-configurator-border last:border-b-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">{item?.feature.name}</div>
                      <div className="text-xs text-muted-foreground">{item?.category}</div>
                    </div>
                    <div className="text-sm font-medium text-price-accent">
                      {item?.feature.price === 0 ? "Included" : `+£${item?.feature.price.toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Price */}
              <div className="pt-4 border-t border-configurator-border">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-semibold text-foreground">Total Price</div>
                    <div className="text-sm text-muted-foreground">Base price: £45,000</div>
                  </div>
                  <div className="text-right">
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

      {/* Navigation Buttons */}
      <div className="bg-configurator-panel border-t border-configurator-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}