import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { billsApi, type Bill, API_ROOT, getTokens } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, TestTube } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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

export default function BillDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  // GST mode removed - now handled by backend based on context
  const numericId = id && /^\d+$/.test(id) ? Number(id) : null;

  const { data: bill, isLoading, error } = useQuery({
    queryKey: ["bill", numericId],
    queryFn: () => billsApi.getById(numericId!),
    enabled: numericId !== null,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <h1 className="text-2xl font-semibold">Bill Not Found</h1>
        </div>
        <p className="text-muted-foreground">The bill you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const totalAmount = Number(bill.quoted_price) + Number(bill.total_added_features_cost || 0);
  const paidAmount = Number(bill.total_payments || 0);
  const remainingAmount = totalAmount - paidAmount;

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-1">
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Bill #{bill.bill_number}</h1>
          {bill.is_test && (
            <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">
              <TestTube className="h-4 w-4" />
              Test Bill
            </div>
          )}
        </div>
        <Badge className={STATUS_COLORS[bill.status] || "bg-gray-100 text-gray-800"}>
          {STATUS_LABELS[bill.status] || bill.status}
        </Badge>
      </div>

      {/* Bill Print Button */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={async () => {
            try {
              const url = `${API_ROOT}/api/manufacturing/bills/${bill.id}/bill_print/`;
              const tokens = getTokens();
              const res = await fetch(url, { headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {} });
              if (!res.ok) {
                const t = await res.text();
                toast({ title: 'Print failed', description: t || `HTTP ${res.status}`, variant: 'destructive' });
                return;
              }
              const blob = await res.blob();
              const blobUrl = URL.createObjectURL(blob);
              window.open(blobUrl, '_blank', 'noopener');
            } catch (e: any) {
              console.error(e);
              toast({ title: 'Print error', description: e?.message || 'Unexpected error', variant: 'destructive' });
            }
          }}
        >
          <Printer className="h-4 w-4" />
          Bill Print
        </Button>
      </div>

      {/* Bill Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Name:</span> {bill.work_order?.quotation?.customer?.name || bill.quotation?.customer?.name || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {bill.work_order?.quotation?.customer?.phone_number || bill.quotation?.customer?.phone_number || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Email:</span> {bill.work_order?.quotation?.customer?.email || bill.quotation?.customer?.email || 'N/A'}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="font-medium">Make:</span> {bill.work_order?.quotation?.vehicle_maker?.name || bill.quotation?.vehicle_maker?.name || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Model:</span> {bill.work_order?.quotation?.vehicle_model?.name || bill.quotation?.vehicle_model?.name || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Number:</span> {bill.work_order?.quotation?.vehicle_number || bill.quotation?.vehicle_number || 'N/A'}
            </div>
          </CardContent>
        </Card>

        {/* Work Order Information */}
        {bill.work_order && (
          <Card>
            <CardHeader>
              <CardTitle>Work Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Work Order:</span>
                <Link to={`/work-orders/${bill.work_order.id}`} className="ml-2 text-blue-600 hover:underline">
                  {bill.work_order.work_order_number}
                </Link>
              </div>
              <div>
                <span className="font-medium">Bill Date:</span> {new Date(bill.bill_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </div>
              <div>
                <span className="font-medium">Appointment Date:</span> {bill.appointment_date}
              </div>
              <div>
                <span className="font-medium">Expected Delivery:</span> {bill.expected_delivery_date}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Quoted Price:</span>
              <span>₹{Number(bill.quoted_price).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Added Features:</span>
              <span>₹{Number(bill.total_added_features_cost || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total Amount:</span>
              <span>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid Amount:</span>
              <span>₹{paidAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-orange-600 font-semibold">
              <span>Remaining Balance:</span>
              <span>₹{remainingAmount.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      {((bill.work_order?.quotation?.features && bill.work_order.quotation.features.length > 0) ||
        (bill.quotation?.features && bill.quotation.features.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle>Quotation Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(bill.work_order?.quotation?.features || bill.quotation?.features || []).map((feature, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span>{feature.custom_name || feature.feature_type?.name || 'Custom Feature'}</span>
                    <span className="font-medium">₹{Number(feature.unit_price || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Additional Work (Added Features) */}
      {bill.added_features && bill.added_features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bill.added_features.map((feature, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div>
                    <span className="font-medium">{feature.feature_name}</span>
                    {feature.notes && (
                      <div className="text-sm text-muted-foreground mt-1">{feature.notes}</div>
                    )}
                  </div>
                  <span className="font-medium">₹{Number(feature.cost || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
