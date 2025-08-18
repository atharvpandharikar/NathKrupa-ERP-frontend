import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { workOrdersApi, paymentsApi, addedFeaturesApi, type Bill, type Payment, type AddedFeature } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarDays, 
  Clock, 
  DollarSign, 
  Package, 
  CheckCircle, 
  Truck, 
  Printer, 
  ArrowLeft,
  User,
  Car,
  MapPin,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Plus,
  Edit,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800", 
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress", 
  completed: "Completed",
  cancelled: "Cancelled",
};

function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_type: "partial",
    notes: "",
    payment_date: new Date().toISOString().split('T')[0]
  });

  // Queries
  const numericId = id && /^\d+$/.test(id) ? Number(id) : null;
  
  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ["work-order", numericId],
    queryFn: () => workOrdersApi.getById(numericId!),
    enabled: numericId !== null
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", numericId],
    queryFn: () => paymentsApi.list({ bill: Number(numericId!) }),
    enabled: numericId !== null
  });

  const { data: addedFeatures = [] } = useQuery({
    queryKey: ["added-features", numericId],
    queryFn: () => addedFeaturesApi.list({ bill: Number(numericId!) }),
    enabled: numericId !== null
  });

  // Mutations
  const addPaymentMutation = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", numericId] });
      queryClient.invalidateQueries({ queryKey: ["work-order", numericId] });
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: "", payment_type: "partial", notes: "", payment_date: new Date().toISOString().split('T')[0] });
      toast({ title: "Payment added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding payment", description: error.message, variant: "destructive" });
    }
  });

  const handleAddPayment = () => {
    if (!workOrder || !paymentForm.amount) return;
    
    addPaymentMutation.mutate({
      bill: workOrder.id,
      amount: paymentForm.amount,
      payment_type: paymentForm.payment_type as any,
      notes: paymentForm.notes,
      payment_date: paymentForm.payment_date
    });
  };

  // Early returns
  if (isLoading) return <div className="p-6">Loading work order...</div>;
  if (numericId === null) return <div className="p-6">Invalid work order id</div>;
  if (error) return <div className="p-6">Error loading work order: {(error as any).message}</div>;
  if (!workOrder) return <div className="p-6">Work order not found</div>;

  const totalAmount = Number(workOrder.quoted_price) + Number(workOrder.total_added_features_cost || 0);
  const paidAmount = Number(workOrder.total_payments || 0);
  const balanceAmount = Number(workOrder.remaining_balance || 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/work-orders')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{workOrder.bill_number}</h1>
            <p className="text-muted-foreground">Work Order Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-sm", STATUS_COLORS[workOrder.status] || "bg-gray-100 text-gray-800")}>
            {STATUS_LABELS[workOrder.status] || workOrder.status}
          </Badge>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer & Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workOrder.quotation?.customer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Customer Name</Label>
                    <p className="text-lg font-semibold">{workOrder.quotation.customer.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                    <p className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {workOrder.quotation.customer.phone_number}
                    </p>
                  </div>
                  {workOrder.quotation.customer.email && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {workOrder.quotation.customer.email}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Quotation Number</Label>
                    <p className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {workOrder.quotation.quotation_number}
                    </p>
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Vehicle Make</Label>
                  <p className="flex items-center gap-1">
                    <Car className="h-4 w-4" />
                    {workOrder.quotation?.vehicle_maker?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Vehicle Model</Label>
                  <p>{workOrder.quotation?.vehicle_model?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Vehicle Number</Label>
                  <p>{workOrder.quotation?.vehicle_number || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Project Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Appointment Date</Label>
                  <p className="text-lg font-semibold">{workOrder.appointment_date}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Estimated Days</Label>
                  <p className="text-lg font-semibold">{workOrder.estimated_completion_days} days</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Expected Delivery</Label>
                  <p className="text-lg font-semibold">{workOrder.expected_delivery_date}</p>
                </div>
              </div>
              {workOrder.actual_delivery_date && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Actual Delivery</Label>
                  <p className="text-lg font-semibold text-green-600">{workOrder.actual_delivery_date}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features & Work Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Work Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="original" className="w-full">
                <TabsList>
                  <TabsTrigger value="original">Original Features</TabsTrigger>
                  <TabsTrigger value="additional">Additional Work</TabsTrigger>
                </TabsList>
                
                <TabsContent value="original" className="space-y-3">
                  {workOrder.quotation?.features && workOrder.quotation.features.length > 0 ? (
                    workOrder.quotation.features.map((feature: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {feature.custom_name || feature.feature_type?.name || 'Feature'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No original features listed</p>
                  )}
                </TabsContent>
                
                <TabsContent value="additional" className="space-y-3">
                  {addedFeatures.length > 0 ? (
                    addedFeatures.map((feature: AddedFeature) => (
                      <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{feature.feature_name}</p>
                          {feature.notes && (
                            <p className="text-sm text-muted-foreground">{feature.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ₹{Number(feature.cost).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No additional work added</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quoted Price:</span>
                  <span className="font-semibold">₹{Number(workOrder.quoted_price).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional Work:</span>
                  <span className="font-semibold">₹{Number(workOrder.total_added_features_cost || 0).toLocaleString('en-IN')}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid Amount:</span>
                  <span className="font-semibold">₹{paidAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Balance Due:</span>
                  <span className="font-bold">₹{balanceAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="sm">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Payment</DialogTitle>
                    <DialogDescription>
                      Record a new payment for this work order
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_type">Payment Type</Label>
                      <Select value={paymentForm.payment_type} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="booking">Booking</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="drop_off">Drop Off</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="payment_date">Payment Date</Label>
                      <Input
                        id="payment_date"
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Payment notes (optional)"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPayment} disabled={addPaymentMutation.isPending}>
                      {addPaymentMutation.isPending ? "Adding..." : "Add Payment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.length > 0 ? (
                  payments.map((payment: Payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">₹{Number(payment.amount).toLocaleString('en-IN')}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {payment.payment_type} • {payment.payment_date}
                        </p>
                      </div>
                      <Badge variant="outline">{payment.payment_type}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No payments recorded</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Eye className="h-4 w-4 mr-2" />
                View Quotation
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Add Work Item
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Truck className="h-4 w-4 mr-2" />
                Mark as Delivered
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default WorkOrderDetails;
