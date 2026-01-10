import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Calendar, User, Car, DollarSign, Search, FileText, Loader2 } from "lucide-react";
import { workOrdersApi, quotationApi, type QuotationData } from "@/lib/api";

interface WorkOrderFormData {
  quotation_id: number | null;
  work_order_date: string;
  appointment_date: string;
  estimated_completion_days: number;
  booking_amount: number;
}

export default function CreateWorkOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<WorkOrderFormData>({
    quotation_id: null,
    work_order_date: new Date().toISOString().split('T')[0],
    appointment_date: new Date().toISOString().split('T')[0],
    estimated_completion_days: 7,
    booking_amount: 0,
  });

  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [quotationSearchTerm, setQuotationSearchTerm] = useState("");
  const [isSearchingQuotations, setIsSearchingQuotations] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(true);
  const [quotationError, setQuotationError] = useState<string | null>(null);

  // Calculate expected delivery date
  const expectedDeliveryDate = selectedQuotation && formData.appointment_date && formData.estimated_completion_days
    ? new Date(new Date(formData.appointment_date).getTime() + formData.estimated_completion_days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
    : '';

  // Load all quotations on mount and when search term changes
  useEffect(() => {
    const loadQuotations = async () => {
      setIsLoadingQuotations(true);
      setQuotationError(null);
      
      try {
        let response: any;
        let results: QuotationData[] = [];
        
        if (quotationSearchTerm.length >= 2) {
          // Use search API if search term is provided
          setIsSearchingQuotations(true);
          response = await quotationApi.search(quotationSearchTerm);
          // Search API returns { count, results, search_time_ms }
          if (Array.isArray(response)) {
            results = response;
          } else if (response && response.results) {
            results = response.results;
          } else if (response && Array.isArray(response.data)) {
            results = response.data;
          }
          setQuotations(results);
          setIsSearchingQuotations(false);
        } else {
          // Load all quotations if no search term
          response = await quotationApi.list();
          // List API can return array or paginated { results, count, next, previous }
          if (Array.isArray(response)) {
            results = response;
          } else if (response && response.results) {
            results = response.results;
          } else if (response && Array.isArray(response.data)) {
            results = response.data;
          }
          // Show all quotations, not filtering by status
          // Users can see all quotations and select any that hasn't been converted
          setQuotations(results.slice(0, 100)); // Show first 100
        }
        
        console.log('Loaded quotations:', results.length, results);
      } catch (error: any) {
        console.error('Error loading quotations:', error);
        setQuotationError(error?.message || 'Failed to load quotations');
        setQuotations([]);
        toast({
          title: "Error",
          description: error?.message || "Failed to load quotations. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingQuotations(false);
        setIsSearchingQuotations(false);
      }
    };

    const timeoutId = setTimeout(loadQuotations, quotationSearchTerm.length >= 2 ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [quotationSearchTerm, toast]);

  // Handle quotation selection
  const handleQuotationSelect = (quotationId: string) => {
    const quotation = quotations.find(q => q.id === parseInt(quotationId));
    if (quotation) {
      setSelectedQuotation(quotation);
      setFormData(prev => ({
        ...prev,
        quotation_id: quotation.id,
        booking_amount: prev.booking_amount || 0,
      }));
      // Auto-fill quoted price if available
      if (quotation.final_total || quotation.suggested_total) {
        const quotedPrice = parseFloat(quotation.final_total || quotation.suggested_total || '0');
        // You might want to set a default booking amount based on quoted price
        if (formData.booking_amount === 0 && quotedPrice > 0) {
          setFormData(prev => ({
            ...prev,
            booking_amount: Math.round(quotedPrice * 0.2), // 20% default booking
          }));
        }
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.quotation_id) {
      toast({
        title: "Validation Error",
        description: "Please select a quotation",
        variant: "destructive",
      });
      return;
    }

    if (!formData.work_order_date || !formData.appointment_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required dates",
        variant: "destructive",
      });
      return;
    }

    if (formData.estimated_completion_days <= 0) {
      toast({
        title: "Validation Error",
        description: "Estimated completion days must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: {
        quotation_id: number;
        work_order_date: string;
        appointment_date: string;
        estimated_completion_days: number;
        booking_amount?: number;
      } = {
        quotation_id: formData.quotation_id!,
        work_order_date: formData.work_order_date,
        appointment_date: formData.appointment_date,
        estimated_completion_days: formData.estimated_completion_days,
      };

      if (formData.booking_amount > 0) {
        payload.booking_amount = formData.booking_amount;
      }

      const createdWorkOrder = await workOrdersApi.create(payload);
      
      toast({
        title: "Success",
        description: `Work order ${createdWorkOrder.work_order_number} created successfully`,
      });

      navigate(`/work-orders/${createdWorkOrder.id}`);
    } catch (error: any) {
      console.error('Error creating work order:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create work order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/work-orders')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Work Order</h1>
          <p className="text-muted-foreground">Create a new work order from a quotation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Quotation Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Quotation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="quotation_search">Search Quotation (Optional)</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="quotation_search"
                    type="text"
                    placeholder="Search by quotation number, customer name, or vehicle..."
                    value={quotationSearchTerm}
                    onChange={(e) => setQuotationSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {(isSearchingQuotations || isLoadingQuotations) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {isLoadingQuotations ? "Loading quotations..." : "Searching..."}
                  </p>
                )}
                {quotationError && (
                  <p className="text-sm text-destructive mt-1">{quotationError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="quotation_id">Quotation *</Label>
                <Select
                  value={formData.quotation_id?.toString() || ""}
                  onValueChange={handleQuotationSelect}
                  required
                  disabled={isLoadingQuotations}
                >
                  <SelectTrigger id="quotation_id">
                    <SelectValue placeholder={
                      isLoadingQuotations 
                        ? "Loading quotations..." 
                        : quotations.length === 0 
                          ? "No quotations available" 
                          : "Select a quotation"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingQuotations ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Loading quotations...
                      </div>
                    ) : quotations.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {quotationSearchTerm.length >= 2 
                          ? "No quotations found matching your search" 
                          : "No quotations available. Please create a quotation first."}
                      </div>
                    ) : (
                      quotations.map((quotation) => (
                        <SelectItem key={quotation.id} value={quotation.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {quotation.quotation_number || `QTN-${quotation.id}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {quotation.customer_name || quotation.customer?.name || 'N/A'} - {quotation.vehicle_model_name || quotation.vehicle_model?.name || 'N/A'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ₹{parseFloat(quotation.final_total || quotation.suggested_total || '0').toLocaleString('en-IN')}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!isLoadingQuotations && quotations.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Showing {quotations.length} quotation{quotations.length !== 1 ? 's' : ''}
                    {quotationSearchTerm && ` matching "${quotationSearchTerm}"`}
                  </p>
                )}
              </div>

              {selectedQuotation && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Customer:</span>{" "}
                      {selectedQuotation.customer_name || selectedQuotation.customer?.name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Vehicle:</span>{" "}
                      {selectedQuotation.vehicle_model_name || selectedQuotation.vehicle_model?.name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Quoted Price:</span>{" "}
                      ₹{parseFloat(selectedQuotation.final_total || selectedQuotation.suggested_total || '0').toLocaleString('en-IN')}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      {selectedQuotation.status}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Work Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="work_order_date">Work Order Date *</Label>
                  <Input
                    id="work_order_date"
                    type="date"
                    value={formData.work_order_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, work_order_date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="appointment_date">Appointment Date *</Label>
                  <Input
                    id="appointment_date"
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="estimated_completion_days">Estimated Completion Days *</Label>
                  <Input
                    id="estimated_completion_days"
                    type="number"
                    min="1"
                    value={formData.estimated_completion_days}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      estimated_completion_days: parseInt(e.target.value) || 0 
                    }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                  <Input
                    id="expected_delivery_date"
                    type="date"
                    value={expectedDeliveryDate}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Calculated from appointment date + completion days
                  </p>
                </div>

                <div>
                  <Label htmlFor="booking_amount">Booking Amount</Label>
                  <Input
                    id="booking_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.booking_amount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      booking_amount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/work-orders')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Work Order
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
