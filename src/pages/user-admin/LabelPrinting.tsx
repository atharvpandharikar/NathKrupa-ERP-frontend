import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
    FileSpreadsheet, 
    Search, 
    Download, 
    Plus, 
    Minus, 
    X, 
    Loader2,
    Settings,
    RotateCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { shopProductsApi, ShopProduct } from '@/lib/shop-api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---

interface ExportItem {
    product: ShopProduct;
    quantity: number;
}

interface LabelTemplate {
    id: string;
    name: string;
    fields: string[];
}

const AVAILABLE_FIELDS = [
    { id: 'title', label: 'Product Name' },
    { id: 'barcode_number', label: 'Barcode' },
    { id: 'price', label: 'MRP' },
    { id: 'discounted_price', label: 'Discounted Price' },
    { id: 'hsn_code', label: 'HSN Code' },
    { id: 'tax_rate', label: 'Tax %' },
    { id: 'brand_name', label: 'Brand' },
    { id: 'sku', label: 'SKU' }, // assuming SKU maps to something or id
    { id: 'vehicle_compatibility', label: 'Vehicle Compatibility' },
    { id: 'quantity', label: 'Quantity' }
];

const TEMPLATES: LabelTemplate[] = [
    { 
        id: 'product_label', 
        name: 'Product Label', 
        fields: ['title', 'barcode_number', 'price', 'discounted_price', 'hsn_code', 'tax_rate', 'brand_name', 'sku', 'quantity'] 
    },
    { 
        id: 'shipping_label', 
        name: 'Shipping Label', 
        fields: ['title', 'sku', 'quantity'] 
    },
    { 
        id: 'price_tag', 
        name: 'Price Tag', 
        fields: ['title', 'price', 'barcode_number'] 
    }
];

export default function LabelPrinting() {
    const { toast } = useToast();
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<ShopProduct[]>([]);
    const [defaultProducts, setDefaultProducts] = useState<ShopProduct[]>([]);
    
    // Selection State
    const [exportList, setExportList] = useState<ExportItem[]>([]);
    
    // Template State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('product_label');
    const [customFields, setCustomFields] = useState<string[]>(TEMPLATES[0].fields);

    // Derived State
    const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplateId);
    
    // Load default products on mount
    useEffect(() => {
        const loadDefaults = async () => {
            try {
                const response = await shopProductsApi.listPaginated({ limit: 100 });
                if (response && Array.isArray(response.data)) {
                    setDefaultProducts(response.data);
                }
            } catch (error) {
                console.error("Failed to load default products", error);
            }
        };
        loadDefaults();
    }, []);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim()) {
                performSearch(searchTerm);
            } else {
                setSearchResults([]);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const performSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const response = await shopProductsApi.searchTypesense(query, { limit: 20 });
            if (response && Array.isArray(response.data)) {
                setSearchResults(response.data);
            } else if (Array.isArray(response)) {
                 setSearchResults(response);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error("Search error:", error);
            toast({
                title: "Search failed",
                description: "Could not fetch products. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddProduct = (product: ShopProduct) => {
        setExportList(prev => {
            const exists = prev.find(item => item.product.product_id === product.product_id);
            if (exists) {
                return prev.map(item => 
                    item.product.product_id === product.product_id 
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [{ product, quantity: 1 }, ...prev];
        });
    };

    const handleRemoveProduct = (productId: string) => {
        setExportList(prev => prev.filter(item => item.product.product_id !== productId));
    };

    const handleUpdateQuantity = (productId: string, delta: number) => {
        setExportList(prev => prev.map(item => {
            if (item.product.product_id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplateId(templateId);
        if (templateId === 'custom') {
            // Keep current fields
        } else {
            const template = TEMPLATES.find(t => t.id === templateId);
            if (template) {
                setCustomFields(template.fields);
            }
        }
    };

    const toggleField = (fieldId: string) => {
        setCustomFields(prev => {
            if (prev.includes(fieldId)) {
                return prev.filter(f => f !== fieldId);
            } else {
                return [...prev, fieldId];
            }
        });
        setSelectedTemplateId('custom');
    };

    const getProductValue = (product: ShopProduct, fieldId: string): string => {
        switch (fieldId) {
            case 'title': return product.title || '';
            case 'barcode_number': return product.barcode_number || product.barcode || '';
            case 'price': return product.price?.toString() || '0';
            case 'discounted_price': return product.discounted_price?.toString() || product.price?.toString() || '0';
            case 'hsn_code': return product.hsn_code || '';
            case 'tax_rate': return ((product as any).tax_rate ?? product.taxes ?? 0).toString();
            case 'brand_name': return product.brand?.name || '';
            case 'sku': return product.product_id || ''; // Using ID as SKU fallback
            case 'vehicle_compatibility': return ''; // Complex field, placeholder
            default: return '';
        }
    };

    const handleExport = () => {
        if (exportList.length === 0) return;

        // Header row
        const header = customFields.map(f => {
            const fieldDef = AVAILABLE_FIELDS.find(af => af.id === f);
            return fieldDef ? fieldDef.label : f;
        });

        const rows: string[][] = [];
        
        // Data rows (1 row per product item, with Quantity column if selected)
        // OR 1 row per label (expanded quantity).
        // Requirement "define quantity" usually relates to printing N labels.
        // Label software (BarTender) usually takes: Product, Qty. Then you map Qty field to "Print Quantity".
        // OR you provide N rows.
        // I will provide 1 row per product with a "Quantity" column if 'quantity' field is selected.
        
        exportList.forEach(item => {
            const row = customFields.map(fieldId => {
                if (fieldId === 'quantity') return item.quantity.toString();
                return `"${getProductValue(item.product, fieldId).replace(/"/g, '""')}"`; // Escape CSV
            });
            rows.push(row);
        });

        // CSV Construction
        const csvContent = [
            header.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `labels_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `Exported ${exportList.length} products to CSV.`,
        });
    };

    const totalRows = exportList.length;

    const [currentStep, setCurrentStep] = useState(1);

    const nextStep = () => {
        if (currentStep < 3) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const steps = [
        { number: 1, title: 'Select Products', description: 'Search and add products to export list' },
        { number: 2, title: 'Configure Template', description: 'Choose fields to include in export' },
        { number: 3, title: 'Export', description: 'Review and download CSV' }
    ];

    return (
        <div className="w-full px-4 space-y-6 animate-in fade-in duration-500 mb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Label Export Wizard</h1>
                            <p className="text-muted-foreground">step-by-step guide to generating product labels</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {currentStep > 1 && (
                        <Button variant="outline" onClick={prevStep}>
                            Back
                        </Button>
                    )}
                    {currentStep < 3 ? (
                        <Button 
                            onClick={nextStep} 
                            disabled={currentStep === 1 && exportList.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Next Step
                        </Button>
                    ) : (
                         <Button 
                            onClick={handleExport} 
                            disabled={exportList.length === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download CSV
                        </Button>
                    )}
                </div>
            </div>

            {/* Stepper Progress */}
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
                <div 
                    className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-300" 
                    style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                ></div>
                <div className="relative z-10 flex justify-between">
                    {steps.map((step) => (
                        <div 
                            key={step.number} 
                            className={`flex flex-col items-center gap-2 cursor-pointer ${
                                (step.number === 1) || 
                                (step.number === 2 && exportList.length > 0) ||
                                (step.number === 3 && exportList.length > 0 && currentStep >= 2) 
                                ? '' : 'opacity-50 pointer-events-none'
                            }`}
                            onClick={() => {
                                if (step.number < currentStep) {
                                    setCurrentStep(step.number);
                                } else if (step.number === 2 && exportList.length > 0) {
                                    setCurrentStep(step.number);
                                } else if (step.number === 3 && exportList.length > 0 && currentStep >= 2) {
                                    setCurrentStep(step.number);
                                }
                            }}
                        >
                            <div 
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 transition-all duration-300
                                    ${currentStep >= step.number 
                                        ? 'bg-indigo-600 border-white text-white shadow-md' 
                                        : 'bg-white border-gray-200 text-gray-400'
                                    }
                                    ${currentStep === step.number ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}
                                `}
                            >
                                {currentStep > step.number ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : step.number}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
                {/* STEP 1: Product Selection */}
                {currentStep === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                         {/* Search */}
                        <Card className="flex flex-col border-indigo-100 shadow-sm">
                            <CardHeader className="bg-indigo-50/50 pb-4">
                                <CardTitle className="text-lg">Find Products</CardTitle>
                                <CardDescription>Search by name, SKU, or barcode</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col pt-4 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Start typing to search products..." 
                                        className="pl-9 h-10 text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-3">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-white h-[500px]">
                                    <div className="bg-gray-50 border-b px-4 py-2 text-xs font-medium text-muted-foreground flex justify-between items-center h-9">
                                        <span>{searchTerm ? `SEARCH RESULTS (${searchResults.length})` : `PRODUCTS (${defaultProducts.length}+)`}</span>
                                        {searchTerm && (
                                            <Badge 
                                                variant="secondary" 
                                                className="cursor-pointer hover:bg-gray-200"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setSearchResults([]);
                                                }}
                                            >
                                                Clear
                                            </Badge>
                                        )}
                                    </div>
                                    <ScrollArea className="flex-1 h-full"> 
                                        <div className="divide-y">
                                            {(searchTerm ? searchResults : defaultProducts).length === 0 && !isSearching ? (
                                                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground space-y-2">
                                                    <Search className="w-8 h-8 opacity-20" />
                                                    <p className="text-sm">No products found.</p>
                                                </div>
                                            ) : (
                                                (searchTerm ? searchResults : defaultProducts).map(product => (
                                                    <div 
                                                        key={product.product_id} 
                                                        className="p-3 hover:bg-indigo-50/50 flex items-center justify-between group transition-colors cursor-pointer"
                                                        onClick={() => handleAddProduct(product)}
                                                    >
                                                        <div className="overflow-hidden mr-3">
                                                            <div className="font-medium text-sm truncate text-gray-900">{product.title}</div>
                                                            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                                                                <span className="text-gray-600 text-[12px] bg-gray-100 px-1 rounded border">
                                                                    SKU: {product.product_id}
                                                                </span>
                                                                <span className="text-gray-400">|</span>
                                                                <span className="text-gray-600 text-[12px]">
                                                                    BC: {product.barcode_number || product.barcode || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            size="sm" 
                                                            variant="secondary" 
                                                            className="h-8 w-8 p-0 rounded-full shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Selected List */}
                        <Card className="flex flex-col border-indigo-100 shadow-sm h-[500px]">
                            <CardHeader className="bg-indigo-50/50 pb-4 flex flex-row items-center justify-between shrink-0">
                                <div>
                                    <CardTitle className="text-lg">Selected Products</CardTitle>
                                    <CardDescription>{exportList.length} items ready for export</CardDescription>
                                </div>
                                {exportList.length > 0 && (
                                    <Button variant="ghost" size="sm" onClick={() => setExportList([])} className="text-red-600 hover:bg-red-50 h-8">
                                        Remove All
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col pt-4 min-h-0 overflow-hidden">
                                {exportList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-gray-50/50">
                                         <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                            <FileSpreadsheet className="w-6 h-6 text-gray-400" />
                                         </div>
                                         <h3 className="font-medium text-gray-900">Your list is empty</h3>
                                         <p className="text-sm max-w-[200px]">Add products from the search panel to get started.</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="flex-1 -mr-3 pr-3">
                                        <div className="space-y-3 pb-2">
                                            {exportList.map((item) => (
                                                <div key={item.product.product_id} className="border rounded-lg p-3 bg-white shadow-sm flex items-center gap-3 group hover:border-indigo-200 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm truncate text-gray-900">{item.product.title}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-[10px] h-5 font-normal text-gray-500">
                                                                {item.product.barcode_number || 'N/A'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center bg-gray-50 rounded-lg border p-1 shadow-sm">
                                                        <button 
                                                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:text-red-600 hover:shadow-sm transition-all"
                                                            onClick={() => handleUpdateQuantity(item.product.product_id, -1)}
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <div className="w-10 text-center font-semibold text-sm">
                                                            {item.quantity}
                                                        </div>
                                                        <button 
                                                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:text-green-600 hover:shadow-sm transition-all"
                                                            onClick={() => handleUpdateQuantity(item.product.product_id, 1)}
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                        onClick={() => handleRemoveProduct(item.product.product_id)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 2: Settings */}
                {currentStep === 2 && (
                    <div className="w-full animate-in slide-in-from-right-4 duration-300">
                        <Card>
                            <CardHeader>
                                <CardTitle>Export Configuration</CardTitle>
                                <CardDescription>Customize how your CSV file will be structured</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-base font-semibold">Choose Template</label>
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                            {activeTemplate?.name || 'Custom'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {TEMPLATES.map(t => (
                                            <div 
                                                key={t.id}
                                                className={`
                                                    cursor-pointer border-2 rounded-xl p-4 flex flex-col gap-2 transition-all duration-200
                                                    ${selectedTemplateId === t.id 
                                                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-1 ring-indigo-600' 
                                                        : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                                    }
                                                `}
                                                onClick={() => handleTemplateChange(t.id)}
                                            >
                                                <div className="font-semibold">{t.name}</div>
                                                <div className="text-xs text-muted-foreground">{t.fields.length} columns included</div>
                                                {selectedTemplateId === t.id && (
                                                    <div className="mt-1 text-xs font-medium text-indigo-600 flex items-center">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-600 mr-2"></div>
                                                        Selected
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-base font-semibold">Column Selection</label>
                                            <p className="text-sm text-muted-foreground">Check the boxes for columns you want to include in the CSV</p>
                                        </div>
                                        <div className="flex gap-2">
                                             <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                    setCustomFields(AVAILABLE_FIELDS.map(f => f.id));
                                                    setSelectedTemplateId('custom');
                                                }}
                                            >
                                                Select All
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                    setCustomFields([]);
                                                    setSelectedTemplateId('custom');
                                                }}
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {AVAILABLE_FIELDS.map(field => {
                                            const isSelected = customFields.includes(field.id);
                                            return (
                                                <div 
                                                    key={field.id}
                                                    className={`
                                                        flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors
                                                        ${isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'hover:bg-gray-50 border-gray-200'}
                                                    `}
                                                    onClick={() => toggleField(field.id)}
                                                >
                                                    <Checkbox 
                                                        checked={isSelected} 
                                                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium leading-none">{field.label}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* STEP 3: Export */}
                {currentStep === 3 && (
                    <div className="w-full animate-in slide-in-from-right-4 duration-300">
                        <Card className="text-center overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                                    <FileSpreadsheet className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-3xl font-bold mb-2">Ready to Export</h2>
                                <p className="text-indigo-100">Your CSV file is ready for download</p>
                            </div>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-gray-900">{exportList.length}</div>
                                        <div className="text-sm text-gray-500 uppercase tracking-widest mt-1">Products</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-gray-900">{totalRows}</div>
                                        <div className="text-sm text-gray-500 uppercase tracking-widest mt-1">Total Rows</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-gray-900">{customFields.length}</div>
                                        <div className="text-sm text-gray-500 uppercase tracking-widest mt-1">Columns</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-gray-900">CSV</div>
                                        <div className="text-sm text-gray-500 uppercase tracking-widest mt-1">Format</div>
                                    </div>
                                </div>
                                
                                <div className="pt-2">
                                     <Button 
                                        onClick={handleExport} 
                                        size="lg"
                                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all text-lg px-8 py-6 h-auto"
                                    >
                                        <Download className="w-6 h-6 mr-2" />
                                        Download CSV File
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-4">
                                        filename: labels_export_{new Date().toISOString().slice(0,10)}.csv
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}



