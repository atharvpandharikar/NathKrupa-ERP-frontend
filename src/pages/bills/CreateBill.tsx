import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { WorkOrderDatePicker } from "@/components/ui/work-order-date-picker";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Calendar, User, Car, DollarSign, Plus, X, FileText, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { customersApi, addedFeaturesApi, featureApi, billsApi, quotationApi, type Customer, type AddedFeature, type FeatureCategory, type FeatureType, type FeaturePrice, type QuotationData } from "@/lib/api";

interface CreateBillFormData {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    vehicle_maker: string;
    vehicle_model: string;
    vehicle_number?: string;
    appointment_date: string;
    estimated_completion_days: number;
    expected_delivery_date: string;
    quoted_price: number;
    booking_amount?: number;
    notes?: string;
    is_test: boolean;
    quotation_id?: number; // Add quotation_id here
}

interface AdditionalWorkItem {
    id: string;
    feature_name: string;
    quantity: number;
    unit_price: number;
    cost: number;
    notes?: string;
}

export default function CreateBill() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Additional work state
    const [additionalWork, setAdditionalWork] = useState<AdditionalWorkItem[]>([]);
    const [addWorkDialogOpen, setAddWorkDialogOpen] = useState(false);
    const [addWorkForm, setAddWorkForm] = useState({
        feature_name: "",
        quantity: "1",
        unit_price: "",
        cost: "",
        notes: ""
    });
    const [addWorkExisting, setAddWorkExisting] = useState(true);
    const [parentCategories, setParentCategories] = useState<FeatureCategory[]>([]);
    const [childCategories, setChildCategories] = useState<FeatureCategory[]>([]);
    const [featureTypes, setFeatureTypes] = useState<FeatureType[]>([]);
    const [featurePrices, setFeaturePrices] = useState<FeaturePrice[]>([]);
    const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<number | null>(null);
    const [selectedChildCategoryId, setSelectedChildCategoryId] = useState<number | null>(null);
    const [selectedFeatureType, setSelectedFeatureType] = useState<number | null>(null);
    const [autoUnitPrice, setAutoUnitPrice] = useState<number | null>(null);

    // Quotation search state
    const [quotationSearchTerm, setQuotationSearchTerm] = useState("");
    const [quotationSearchResults, setQuotationSearchResults] = useState<QuotationData[]>([]);
    const [selectedQuotation, setSelectedQuotation] = useState<QuotationData | null>(null);
    const [isSearchingQuotations, setIsSearchingQuotations] = useState(false);

    const [formData, setFormData] = useState<CreateBillFormData>({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        vehicle_maker: "",
        vehicle_model: "",
        vehicle_number: "",
        appointment_date: new Date().toISOString().split('T')[0],
        estimated_completion_days: 7,
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quoted_price: 0,
        booking_amount: 0,
        notes: "",
        is_test: false,
    });

    // Search customers
    const searchCustomers = async (query: string) => {
        if (query.length < 2) {
            setCustomers([]);
            return;
        }

        setIsSearching(true);
        try {
            const response = await customersApi.list(query);
            const customerList = Array.isArray(response) ? response : response.results || [];
            setCustomers(customerList);
        } catch (error) {
            console.error("Error searching customers:", error);
            setCustomers([]);
        } finally {
            setIsSearching(false);
        }
    };

    const searchQuotations = async (query: string) => {
        if (query.length < 2) {
            setQuotationSearchResults([]);
            return;
        }

        setIsSearchingQuotations(true);
        try {
            const response = await quotationApi.searchByNumber(query);
            const quotationList = Array.isArray(response) ? response : response.results || [];
            setQuotationSearchResults(quotationList as QuotationData[]);
        } catch (error) {
            console.error("Error searching quotations:", error);
            setQuotationSearchResults([]);
        } finally {
            setIsSearchingQuotations(false);
        }
    };

    const handleQuotationSelect = (quotation: QuotationData) => {
        setSelectedQuotation(quotation);
        setFormData(prev => ({
            ...prev,
            quotation_id: quotation.id,
            customer_name: quotation.customer.name, // Pre-fill customer info
            customer_phone: quotation.customer.phone_number,
            customer_email: quotation.customer.email || "",
            vehicle_maker: quotation.vehicle_maker.name, // Pre-fill vehicle info
            vehicle_model: quotation.vehicle_model.name,
            vehicle_number: quotation.vehicle_number || "",
            quoted_price: parseFloat(quotation.final_total.toString()), // Pre-fill quoted price
        }));
        setQuotationSearchTerm(quotation.quotation_number);
        setQuotationSearchResults([]);
    };

    // Derive total cost when quantity or unit price changes
    useEffect(() => {
        const q = parseFloat(addWorkForm.quantity || '0');
        const u = parseFloat(addWorkForm.unit_price || '0');
        if (q > 0 && u >= 0) {
            const total = q * u;
            setAddWorkForm(prev => ({ ...prev, cost: String(total) }));
        } else if (!addWorkForm.unit_price) {
            setAddWorkForm(prev => ({ ...prev, cost: '' }));
        }
    }, [addWorkForm.quantity, addWorkForm.unit_price]);

    // Load data when Add Work dialog opens
    useEffect(() => {
        if (!addWorkDialogOpen) return;
        setSelectedParentCategoryId(null);
        setSelectedChildCategoryId(null);
        setSelectedFeatureType(null);
        setChildCategories([]);
        setFeatureTypes([]);
        setFeaturePrices([]);
        featureApi.parentCategories().then(setParentCategories).catch(() => { });
    }, [addWorkDialogOpen]);

    // Load child categories when parent category changes
    useEffect(() => {
        if (!addWorkDialogOpen) return;
        if (selectedParentCategoryId == null) {
            setChildCategories([]);
            setSelectedChildCategoryId(null);
            return;
        }
        featureApi.childCategories(selectedParentCategoryId).then(setChildCategories).catch(() => { });
    }, [selectedParentCategoryId, addWorkDialogOpen]);

    // Load feature types when child category changes
    useEffect(() => {
        if (!addWorkDialogOpen) return;
        if (!selectedChildCategoryId) {
            setFeatureTypes([]);
            setSelectedFeatureType(null);
            return;
        }
        // For now, we'll skip vehicle model specific features since we don't have that context
        setFeatureTypes([]);
    }, [selectedChildCategoryId, addWorkDialogOpen]);

    // Auto-set unit price based on selection
    useEffect(() => {
        if (!addWorkDialogOpen || !addWorkExisting) {
            setAutoUnitPrice(null);
            return;
        }
        if (selectedFeatureType) {
            const fp = featurePrices.find(p => p.feature_type && p.feature_type.id === selectedFeatureType);
            if (fp) {
                setAutoUnitPrice(Number(fp.price));
                if (!addWorkForm.unit_price) setAddWorkForm(p => ({ ...p, unit_price: String(fp.price) }));
                return;
            }
        }
        if (selectedChildCategoryId) {
            const fp = featurePrices.find(p => !p.feature_type && p.feature_category.id === selectedChildCategoryId);
            if (fp) {
                setAutoUnitPrice(Number(fp.price));
                if (!addWorkForm.unit_price) setAddWorkForm(p => ({ ...p, unit_price: String(fp.price) }));
                return;
            }
        }
        setAutoUnitPrice(null);
    }, [addWorkDialogOpen, addWorkExisting, selectedFeatureType, selectedChildCategoryId, featurePrices, addWorkForm.unit_price]);

    // Create bill mutation
    const createBillMutation = useMutation({
        mutationFn: async (data: CreateBillFormData & { additional_work?: any[] }) => {
            return billsApi.create(data);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            toast({
                title: "Bill created successfully",
                description: `Bill ${data.bill_number} has been created`,
            });
            navigate(`/bills/${data.id}`);
        },
        onError: (error: any) => {
            toast({
                title: "Failed to create bill",
                description: error?.message || "An error occurred while creating the bill",
                variant: "destructive",
            });
        },
    });

    const handleInputChange = (field: keyof CreateBillFormData, value: any) => {
        setFormData(prev => {
            const updatedData = {
                ...prev,
                [field]: value,
            };

            try {
                // Auto-calculate expected delivery date when completion days change
                if (field === 'estimated_completion_days') {
                    const appointmentDate = new Date(updatedData.appointment_date);
                    if (!isNaN(appointmentDate.getTime()) && value && value > 0) {
                        const deliveryDate = new Date(appointmentDate.getTime() + value * 24 * 60 * 60 * 1000);
                        if (!isNaN(deliveryDate.getTime())) {
                            updatedData.expected_delivery_date = deliveryDate.toISOString().split('T')[0];
                        }
                    }
                }

                // Auto-calculate expected delivery date when appointment date changes
                if (field === 'appointment_date') {
                    const appointmentDate = new Date(value);
                    if (!isNaN(appointmentDate.getTime()) && updatedData.estimated_completion_days && updatedData.estimated_completion_days > 0) {
                        const deliveryDate = new Date(appointmentDate.getTime() + updatedData.estimated_completion_days * 24 * 60 * 60 * 1000);
                        if (!isNaN(deliveryDate.getTime())) {
                            updatedData.expected_delivery_date = deliveryDate.toISOString().split('T')[0];
                        }
                    }
                }
            } catch (error) {
                console.error('Error calculating delivery date:', error);
                // Don't update the delivery date if there's an error
            }

            return updatedData;
        });
    };

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setFormData(prev => ({
            ...prev,
            customer_name: customer.name,
            customer_phone: customer.phone_number,
            customer_email: customer.email || "",
        }));
        setSearchTerm(customer.name);
        setCustomers([]);
    };

    const handleAddWork = () => {
        let featureName = addWorkForm.feature_name.trim();

        // If using existing features, get the name from selections
        if (addWorkExisting) {
            if (selectedFeatureType) {
                const ft = featureTypes.find(f => f.id === selectedFeatureType);
                if (ft) featureName = ft.name;
            } else if (selectedChildCategoryId) {
                const cat = childCategories.find(c => c.id === selectedChildCategoryId);
                if (cat) featureName = cat.name;
            }
        }

        if (!featureName || !addWorkForm.cost) {
            toast({
                title: "Missing required fields",
                description: "Please fill in feature name and ensure cost is calculated",
                variant: "destructive",
            });
            return;
        }

        const newWorkItem: AdditionalWorkItem = {
            id: Date.now().toString(),
            feature_name: featureName,
            quantity: parseFloat(addWorkForm.quantity),
            unit_price: parseFloat(addWorkForm.unit_price),
            cost: parseFloat(addWorkForm.cost),
            notes: addWorkForm.notes || undefined,
        };

        setAdditionalWork(prev => [...prev, newWorkItem]);

        // Reset form
        setAddWorkForm({ feature_name: "", quantity: "1", unit_price: "", cost: "", notes: "" });
        setSelectedParentCategoryId(null);
        setSelectedChildCategoryId(null);
        setSelectedFeatureType(null);
        setAddWorkDialogOpen(false);

        toast({
            title: "Additional work added",
            description: `${newWorkItem.feature_name} has been added to the bill`,
        });
    };

    const handleRemoveWork = (id: string) => {
        setAdditionalWork(prev => prev.filter(item => item.id !== id));
    };

    const getTotalAdditionalWorkCost = () => {
        return additionalWork.reduce((sum, item) => sum + item.cost, 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.customer_name || !formData.customer_phone || !formData.quoted_price) {
            toast({
                title: "Missing required fields",
                description: "Please fill in customer name, phone, and quoted price",
                variant: "destructive",
            });
            return;
        }

        if (!formData.vehicle_maker || !formData.vehicle_model) {
            toast({
                title: "Missing vehicle information",
                description: "Please fill in vehicle maker and model",
                variant: "destructive",
            });
            return;
        }

        if (formData.quoted_price <= 0) {
            toast({
                title: "Invalid quoted price",
                description: "Quoted price must be greater than 0",
                variant: "destructive",
            });
            return;
        }

        // Quotation is optional - can create standalone bills

        // Create bill with additional work
        const billData = {
            ...formData,
            // Only include quotation_id if a quotation is selected
            ...(selectedQuotation && { quotation_id: selectedQuotation.id }),
            additional_work: additionalWork.map(item => ({
                feature_name: item.feature_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                cost: item.cost,
                ...(item.notes && { notes: item.notes }),
            })),
        };


        createBillMutation.mutate(billData);
    };

    return (
        <div className="container mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link to="/bills">
                    <Button size="sm" variant="outline" className="gap-1">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Bills
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold">Create New Bill</h1>
                    <p className="text-muted-foreground">Create a standalone bill without quote or work order</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Quotation Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Link to Quotation (Optional)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="quotation_search">Search Quotation by Number</Label>
                                <div className="relative">
                                    <Input
                                        id="quotation_search"
                                        placeholder="Search by quotation number..."
                                        value={quotationSearchTerm}
                                        onChange={(e) => {
                                            setQuotationSearchTerm(e.target.value);
                                            searchQuotations(e.target.value);
                                        }}
                                    />
                                    {isSearchingQuotations && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                        </div>
                                    )}
                                    {quotationSearchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {quotationSearchResults.map((quotation) => (
                                                <div
                                                    key={quotation.id}
                                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => handleQuotationSelect(quotation)}
                                                >
                                                    <div className="font-medium">{quotation.quotation_number}</div>
                                                    <div className="text-sm text-gray-500">{quotation.customer.name} - {quotation.vehicle_model.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selectedQuotation && (
                                <div className="space-y-2 p-3 border rounded-md bg-muted">
                                    <p className="text-sm font-medium">Selected Quotation:</p>
                                    <p className="text-sm"><strong>Number:</strong> {selectedQuotation.quotation_number}</p>
                                    <p className="text-sm"><strong>Customer:</strong> {selectedQuotation.customer.name}</p>
                                    <p className="text-sm"><strong>Vehicle:</strong> {selectedQuotation.vehicle_maker.name} {selectedQuotation.vehicle_model.name}</p>
                                    <p className="text-sm"><strong>Total Price:</strong> ₹{parseFloat(selectedQuotation.final_total.toString()).toLocaleString('en-IN')}</p>
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setSelectedQuotation(null);
                                        setQuotationSearchTerm("");
                                        setFormData(prev => ({ ...prev, quotation_id: undefined })); // Clear quotation_id
                                        // Optionally clear related customer/vehicle info if not manually edited
                                        // For now, leave manually entered values as is
                                    }}>Clear Selection</Button>
                                </div>
                            )}
                            {!selectedQuotation && quotationSearchTerm && !isSearchingQuotations && quotationSearchResults.length === 0 && (
                                <p className="text-sm text-muted-foreground">No quotations found for "{quotationSearchTerm}".</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Customer Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Customer Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer_search">Search Customer (Optional)</Label>
                                <div className="relative">
                                    <Input
                                        id="customer_search"
                                        placeholder="Search by name or phone..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            searchCustomers(e.target.value);
                                        }}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                        </div>
                                    )}
                                    {customers.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {customers.map((customer) => (
                                                <div
                                                    key={customer.id}
                                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => handleCustomerSelect(customer)}
                                                >
                                                    <div className="font-medium">{customer.name}</div>
                                                    <div className="text-sm text-gray-500">{customer.phone_number}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customer_name">Customer Name *</Label>
                                <Input
                                    id="customer_name"
                                    value={formData.customer_name}
                                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                                    placeholder="Enter customer name"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customer_phone">Phone Number *</Label>
                                <Input
                                    id="customer_phone"
                                    value={formData.customer_phone}
                                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                                    placeholder="Enter phone number"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customer_email">Email (Optional)</Label>
                                <Input
                                    id="customer_email"
                                    type="email"
                                    value={formData.customer_email}
                                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vehicle Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Car className="h-5 w-5" />
                                Vehicle Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicle_maker">Vehicle Maker *</Label>
                                <Input
                                    id="vehicle_maker"
                                    value={formData.vehicle_maker}
                                    onChange={(e) => handleInputChange('vehicle_maker', e.target.value)}
                                    placeholder="e.g., Maruti Suzuki, Hyundai"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vehicle_model">Vehicle Model *</Label>
                                <Input
                                    id="vehicle_model"
                                    value={formData.vehicle_model}
                                    onChange={(e) => handleInputChange('vehicle_model', e.target.value)}
                                    placeholder="e.g., Swift, i20"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vehicle_number">Vehicle Number (Optional)</Label>
                                <Input
                                    id="vehicle_number"
                                    value={formData.vehicle_number}
                                    onChange={(e) => handleInputChange('vehicle_number', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Schedule Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Schedule Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="appointment_date">Appointment Date *</Label>
                                <WorkOrderDatePicker
                                    date={formData.appointment_date ? new Date(formData.appointment_date + 'T00:00:00') : undefined}
                                    onDateChange={(date) => {
                                        if (date) {
                                            const year = date.getFullYear();
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const day = String(date.getDate()).padStart(2, '0');
                                            handleInputChange('appointment_date', `${year}-${month}-${day}`);
                                        } else {
                                            handleInputChange('appointment_date', '');
                                        }
                                    }}
                                    placeholder="Select appointment date"
                                    quotationDate={formData.quotation_id ? undefined : undefined} // No quotation date for new bills
                                    workOrderDate={undefined} // No work order date for new bills
                                    appointmentDate={formData.appointment_date}
                                    deliveryDate={formData.expected_delivery_date}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="estimated_completion_days">Estimated Completion Days *</Label>
                                <Input
                                    id="estimated_completion_days"
                                    type="number"
                                    min="1"
                                    value={formData.estimated_completion_days}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        handleInputChange('estimated_completion_days', isNaN(value) ? 0 : value);
                                    }}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expected_delivery_date">Expected Delivery Date *</Label>
                                <WorkOrderDatePicker
                                    date={formData.expected_delivery_date ? new Date(formData.expected_delivery_date + 'T00:00:00') : undefined}
                                    onDateChange={(date) => {
                                        if (date) {
                                            const year = date.getFullYear();
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const day = String(date.getDate()).padStart(2, '0');
                                            handleInputChange('expected_delivery_date', `${year}-${month}-${day}`);
                                        } else {
                                            handleInputChange('expected_delivery_date', '');
                                        }
                                    }}
                                    placeholder="Select delivery date"
                                    quotationDate={formData.quotation_id ? undefined : undefined} // No quotation date for new bills
                                    workOrderDate={undefined} // No work order date for new bills
                                    appointmentDate={formData.appointment_date}
                                    deliveryDate={formData.expected_delivery_date}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Financial Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="quoted_price">Quoted Price (₹) *</Label>
                                <Input
                                    id="quoted_price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.quoted_price}
                                    onChange={(e) => handleInputChange('quoted_price', parseFloat(e.target.value) || 0)}
                                    placeholder="Enter amount"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="booking_amount">Booking Amount (₹)</Label>
                                <Input
                                    id="booking_amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.booking_amount}
                                    onChange={(e) => handleInputChange('booking_amount', parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="is_test">Bill Type</Label>
                                <Select
                                    value={formData.is_test ? "test" : "production"}
                                    onValueChange={(value) => handleInputChange('is_test', value === "test")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="production">Production Bill</SelectItem>
                                        <SelectItem value="test">Test Bill</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Inventory Items Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Inventory Items
                            </span>
                            <Button size="sm" variant="outline" className="gap-1">
                                <Plus className="h-4 w-4" />
                                Add from Inventory
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground py-4 text-center">
                            Add products from your inventory to this bill. This will help track stock levels and ensure accurate billing.
                        </div>
                    </CardContent>
                </Card>

                {/* Additional Work Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Additional Work
                            </span>
                            <Dialog open={addWorkDialogOpen} onOpenChange={setAddWorkDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-1">
                                        <Plus className="h-4 w-4" />
                                        Add Work
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Add Additional Work</DialogTitle>
                                        <DialogDescription>
                                            Add additional work (existing catalog or custom) with quantity & unit price.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-1">
                                        <div className="flex items-center gap-4 text-xs">
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="h-3 w-3"
                                                    checked={addWorkExisting}
                                                    onChange={() => setAddWorkExisting(true)}
                                                />
                                                Existing
                                            </label>
                                            <label className="flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="h-3 w-3"
                                                    checked={!addWorkExisting}
                                                    onChange={() => setAddWorkExisting(false)}
                                                />
                                                Custom
                                            </label>
                                        </div>

                                        {addWorkExisting ? (
                                            <div className="grid gap-3">
                                                <div className="grid gap-1">
                                                    <Label>Selected Feature</Label>
                                                    <div className="p-2 bg-gray-50 rounded text-sm">
                                                        {(() => {
                                                            if (selectedFeatureType) {
                                                                const ft = featureTypes.find(f => f.id === selectedFeatureType);
                                                                return ft ? ft.name : 'No feature selected';
                                                            } else if (selectedChildCategoryId) {
                                                                const cat = childCategories.find(c => c.id === selectedChildCategoryId);
                                                                return cat ? cat.name : 'No category selected';
                                                            }
                                                            return 'No selection made';
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label>Parent Category</Label>
                                                    <select
                                                        aria-label="Parent Category"
                                                        className="border rounded px-2 py-1 text-sm"
                                                        value={selectedParentCategoryId ?? ''}
                                                        onChange={e => {
                                                            const v = e.target.value ? Number(e.target.value) : null;
                                                            setSelectedParentCategoryId(v);
                                                        }}
                                                    >
                                                        <option value="">-- Select Parent --</option>
                                                        {parentCategories.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label>Category</Label>
                                                    <select
                                                        aria-label="Child Category"
                                                        className="border rounded px-2 py-1 text-sm"
                                                        disabled={!selectedParentCategoryId}
                                                        value={selectedChildCategoryId ?? ''}
                                                        onChange={e => {
                                                            const v = e.target.value ? Number(e.target.value) : null;
                                                            setSelectedChildCategoryId(v);
                                                            setSelectedFeatureType(null);
                                                        }}
                                                    >
                                                        <option value="">
                                                            {selectedParentCategoryId ? '-- Select Category --' : 'Select parent first'}
                                                        </option>
                                                        {childCategories.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label>Feature Type (optional)</Label>
                                                    <select
                                                        aria-label="Feature Type"
                                                        className="border rounded px-2 py-1 text-sm"
                                                        disabled={!selectedChildCategoryId || featureTypes.length === 0}
                                                        value={selectedFeatureType ?? ''}
                                                        onChange={e => {
                                                            const v = e.target.value ? Number(e.target.value) : null;
                                                            setSelectedFeatureType(v);
                                                        }}
                                                    >
                                                        <option value="">
                                                            {selectedChildCategoryId ?
                                                                (featureTypes.length ? '-- Select Feature Type --' : 'No types available') :
                                                                'Select category first'
                                                            }
                                                        </option>
                                                        {featureTypes.map(ft => (
                                                            <option key={ft.id} value={ft.id}>{ft.name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-muted-foreground">Leave blank for category level line.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid gap-1">
                                                <Label>Name</Label>
                                                <Input
                                                    value={addWorkForm.feature_name}
                                                    onChange={e => setAddWorkForm(p => ({ ...p, feature_name: e.target.value }))}
                                                    placeholder="Custom work name"
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="grid gap-1">
                                                <Label>Qty</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={addWorkForm.quantity}
                                                    onChange={e => setAddWorkForm(p => ({ ...p, quantity: e.target.value }))}
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label>
                                                    Unit Price (₹)
                                                    {autoUnitPrice != null && (
                                                        <span className="ml-1 text-[10px] text-muted-foreground">
                                                            Suggested: ₹{autoUnitPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                        </span>
                                                    )}
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={addWorkForm.unit_price}
                                                    onChange={e => setAddWorkForm(p => ({ ...p, unit_price: e.target.value }))}
                                                    placeholder={autoUnitPrice != null ? String(autoUnitPrice) : 'e.g. 2500'}
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label>Total (₹)</Label>
                                                <Input value={addWorkForm.cost} disabled />
                                            </div>
                                        </div>

                                        <div className="grid gap-1">
                                            <Label>Notes</Label>
                                            <Textarea
                                                value={addWorkForm.notes}
                                                onChange={e => setAddWorkForm(p => ({ ...p, notes: e.target.value }))}
                                                placeholder="Optional notes / specs"
                                            />
                                        </div>

                                        <p className="text-[10px] text-muted-foreground">
                                            Total auto-calculated. Discounts update financial summary after save.
                                        </p>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setAddWorkDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAddWork}
                                            disabled={!addWorkForm.cost || (!addWorkExisting && !addWorkForm.feature_name.trim())}
                                        >
                                            Add
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {additionalWork.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-4 text-center">
                                No additional work added yet. Click "Add Work" to get started.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {additionalWork.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="font-medium">{item.feature_name}</div>
                                            {item.notes && (
                                                <div className="text-sm text-muted-foreground">{item.notes}</div>
                                            )}
                                            <div className="text-sm text-muted-foreground">
                                                Qty: {item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')} = ₹{item.cost.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRemoveWork(item.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="pt-2 border-t">
                                    <div className="flex justify-between items-center font-medium">
                                        <span>Total Additional Work:</span>
                                        <span>₹{getTotalAdditionalWorkCost().toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Additional Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Add any additional notes or special instructions..."
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            rows={3}
                        />
                    </CardContent>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                    <Link to="/bills">
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        disabled={createBillMutation.isPending}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {createBillMutation.isPending ? "Creating..." : "Create Bill"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
