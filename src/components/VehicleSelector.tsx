import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Car, ChevronRight, X } from 'lucide-react';
import { shopApi } from '@/lib/api';

interface VehicleMaker {
    id: string;
    name: string;
    slug: string;
}

interface VehicleModel {
    id: string;
    name: string;
    slug: string;
    car_maker: VehicleMaker;
}

interface VehicleVariant {
    id: string;
    name: string;
    slug: string;
    model: string;
    car_maker: string;
    year_start?: number;
    year_end?: number;
}

interface Vehicle {
    id: string;
    maker: string;
    model: string;
    year: number;
    variant?: string;
    makerId?: string;
    modelId?: string;
    variantId?: string;
}

interface VehicleSelectorProps {
    onVehicleSelect: (vehicle: Vehicle | null) => void;
    selectedVehicle?: Vehicle | null;
}

export default function VehicleSelector({ onVehicleSelect, selectedVehicle }: VehicleSelectorProps) {
    const [makers, setMakers] = useState<VehicleMaker[]>([]);
    const [models, setModels] = useState<VehicleModel[]>([]);
    const [years, setYears] = useState<string[]>([]);
    const [variants, setVariants] = useState<VehicleVariant[]>([]);

    const [selectedMaker, setSelectedMaker] = useState<VehicleMaker | null>(null);
    const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<VehicleVariant | null>(null);

    const [loading, setLoading] = useState(false);

    // Load makers on component mount
    useEffect(() => {
        loadMakers();
    }, []);

    const loadMakers = async () => {
        try {
            setLoading(true);
            const response = await shopApi.get('/shop/car-makers-readonly/') as any;
            setMakers(response.data || []);
        } catch (error) {
            console.error('Error loading makers:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadModels = async (makerId: string) => {
        try {
            setLoading(true);
            const response = await shopApi.get(`/shop/car-models-readonly/?maker_id=${makerId}`) as any;
            setModels(response.data || []);
            setVariants([]);
            setYears([]);
            setSelectedModel(null);
            setSelectedVariant(null);
            setSelectedYear(null);
        } catch (error) {
            console.error('Error loading models:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadYears = async (modelId: string) => {
        try {
            setLoading(true);
            const response = await shopApi.get(`/shop/car-years/?model_id=${modelId}`) as any;
            setYears(response.data || []);
            setVariants([]);
            setSelectedYear(null);
            setSelectedVariant(null);
        } catch (error) {
            console.error('Error loading years:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadVariants = async (modelId: string, year?: string) => {
        try {
            setLoading(true);
            let url = `/shop/car-variants/?model_id=${modelId}`;
            if (year) {
                url += `&year=${year}`;
            }
            const response = await shopApi.get(url) as any;
            setVariants(response.data || []);
            setSelectedVariant(null);
        } catch (error) {
            console.error('Error loading variants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMakerChange = (makerId: string) => {
        const maker = makers.find(m => m.id === makerId);
        if (maker) {
            setSelectedMaker(maker);
            loadModels(maker.id);
        }
    };

    const handleModelChange = (modelId: string) => {
        const model = models.find(m => m.id === modelId);
        if (model) {
            setSelectedModel(model);
            loadYears(model.id);
        }
    };

    const handleYearChange = (year: string) => {
        setSelectedYear(year);
        if (selectedModel) {
            loadVariants(selectedModel.id, year);
        }
    };

    const handleVariantChange = (variantId: string) => {
        const variant = variants.find(v => v.id === variantId);
        if (variant) {
            setSelectedVariant(variant);
        }
    };

    const handleSelectVehicle = () => {
        if (selectedMaker && selectedModel && selectedYear && selectedVariant) {
            const vehicle: Vehicle = {
                id: selectedVariant.id,
                maker: selectedMaker.name,
                model: selectedModel.name,
                year: selectedYear ? parseInt(selectedYear) : new Date().getFullYear(),
                variant: selectedVariant.name,
                makerId: selectedMaker.id,
                modelId: selectedModel.id,
                variantId: selectedVariant.id
            };
            onVehicleSelect(vehicle);
        }
    };

    const handleClearSelection = () => {
        setSelectedMaker(null);
        setSelectedModel(null);
        setSelectedYear(null);
        setSelectedVariant(null);
        setModels([]);
        setYears([]);
        setVariants([]);
        // Clear the selected vehicle in parent component
        onVehicleSelect(null);
    };

    // Require variant selection to avoid model-only filtering
    const canSelectVehicle = selectedMaker && selectedModel && selectedYear && selectedVariant;

    return (
        <div className="w-full">
            <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                    <Car className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold text-white">Select Vehicle</h3>
                    {(selectedVehicle || selectedMaker || selectedModel || selectedYear || selectedVariant) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearSelection}
                            className="ml-auto text-white hover:bg-blue-800 h-6 w-6 p-0"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {selectedVehicle ? (
                    <div className="flex items-center space-x-2 p-2 bg-blue-800 rounded-lg">
                        <Car className="h-4 w-4 text-blue-300" />
                        <div>
                            <p className="text-sm font-medium text-white">
                                {selectedVehicle.maker} {selectedVehicle.model} ({selectedVehicle.year})
                            </p>
                            {selectedVehicle.variant && (
                                <p className="text-xs text-blue-200">{selectedVehicle.variant}</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Maker Selection */}
                            <div>
                                <label className="block text-xs font-medium text-white mb-1">
                                    Select Car Maker
                                </label>
                                <Select onValueChange={handleMakerChange} disabled={loading}>
                                    <SelectTrigger className="bg-white h-8 text-sm">
                                        <SelectValue placeholder="Select Car Maker" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {makers.map((maker) => (
                                            <SelectItem key={maker.id} value={maker.id}>
                                                {maker.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Model Selection */}
                            <div>
                                <label className="block text-xs font-medium text-white mb-1">
                                    Select Model Line
                                </label>
                                <Select onValueChange={handleModelChange} disabled={loading || models.length === 0}>
                                    <SelectTrigger className="bg-white h-8 text-sm">
                                        <SelectValue placeholder="Select Model Line" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {models.map((model) => (
                                            <SelectItem key={model.id} value={model.id}>
                                                {model.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Year Selection */}
                            <div>
                                <label className="block text-xs font-medium text-white mb-1">
                                    Select Year
                                </label>
                                <Select
                                    onValueChange={handleYearChange}
                                    disabled={loading || years.length === 0}
                                >
                                    <SelectTrigger className="bg-white h-8 text-sm">
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Variant Selection */}
                            <div>
                                <label className="block text-xs font-medium text-white mb-1">
                                    Select Modification
                                </label>
                                <Select onValueChange={handleVariantChange} disabled={loading || variants.length === 0 || !selectedYear}>
                                    <SelectTrigger className="bg-white h-8 text-sm">
                                        <SelectValue placeholder="Select Modification" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {variants.map((variant) => (
                                            <SelectItem key={variant.id} value={variant.id}>
                                                {variant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Select Button */}
                        {canSelectVehicle && (
                            <div className="flex justify-center">
                                <Button
                                    onClick={handleSelectVehicle}
                                    disabled={loading}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 text-sm font-semibold"
                                >
                                    {loading ? 'Loading...' : 'SEARCH PARTS'}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}