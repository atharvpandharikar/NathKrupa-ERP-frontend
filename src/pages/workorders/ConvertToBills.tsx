import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workOrdersApi, type Bill } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkOrderDatePicker } from "@/components/ui/work-order-date-picker";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    RefreshCw,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    Plus,
    Trash2
} from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    painting: "bg-orange-100 text-orange-800",
    workdone: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    painting: "Painting",
    workdone: "Work Done",
    completed: "Completed",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

interface WorkOrderWithBill {
    id: number;
    work_order_number: string;
    quotation: {
        customer: {
            name: string;
            phone_number: string;
        };
        quotation_number: string;
    };
    status: string;
    work_order_date: string;
    appointment_date: string;
    expected_delivery_date: string;
    quoted_price: number;
    total_added_features_cost: number;
    remaining_balance: number;
    has_bill: boolean;
    bill_number?: string;
}

export default function ConvertToBills() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedWorkOrders, setSelectedWorkOrders] = useState<number[]>([]);
    const [forceConvert, setForceConvert] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Fetch work orders that can be converted to bills
    const { data: workOrders = [], isLoading, refetch } = useQuery({
        queryKey: ["work-orders-for-conversion"],
        queryFn: async () => {
            // Get all work orders and check which ones can be converted
            const response = await workOrdersApi.list();
            const allWorkOrders = Array.isArray(response) ? response : response.results || [];

            // Filter and enhance work orders with conversion status
            return allWorkOrders.map((wo: any) => ({
                ...wo,
                work_order_number: wo.work_order_number || wo.bill_number,
                has_bill: wo.has_bill || false,
                bill_number: wo.bill_number
            })) as WorkOrderWithBill[];
        }
    });

    // Filter work orders based on search term
    const filteredWorkOrders = workOrders.filter(wo =>
        wo.work_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.quotation?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.quotation?.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Individual conversion mutation
    const convertMutation = useMutation({
        mutationFn: ({ workOrderId, force }: { workOrderId: number; force: boolean }) =>
            workOrdersApi.convertToBill(workOrderId, force, billDate),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["work-orders-for-conversion"] });
            queryClient.invalidateQueries({ queryKey: ["work-orders"] });
            toast({
                title: "Work order converted to bill",
                description: `Bill ${data.bill_number} created successfully`
            });
        },
        onError: (error: any) => {
            toast({
                title: "Conversion failed",
                description: error?.response?.data?.error || "Failed to convert work order to bill",
                variant: "destructive"
            });
        }
    });

    // Bulk conversion mutation
    const bulkConvertMutation = useMutation({
        mutationFn: ({ workOrderIds, force }: { workOrderIds: number[]; force: boolean }) =>
            workOrdersApi.bulkConvertToBills(workOrderIds, force, billDate),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["work-orders-for-conversion"] });
            queryClient.invalidateQueries({ queryKey: ["work-orders"] });

            if (data.success_count > 0) {
                toast({
                    title: "Bulk conversion completed",
                    description: `${data.success_count} work orders converted to bills successfully`
                });
            }

            if (data.error_count > 0) {
                toast({
                    title: "Some conversions failed",
                    description: `${data.error_count} work orders could not be converted`,
                    variant: "destructive"
                });
            }

            setSelectedWorkOrders([]);
        },
        onError: (error: any) => {
            toast({
                title: "Bulk conversion failed",
                description: error?.response?.data?.error || "Failed to convert work orders to bills",
                variant: "destructive"
            });
        }
    });

    const handleSelectWorkOrder = (workOrderId: number, checked: boolean) => {
        if (checked) {
            setSelectedWorkOrders(prev => [...prev, workOrderId]);
        } else {
            setSelectedWorkOrders(prev => prev.filter(id => id !== workOrderId));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const convertibleIds = filteredWorkOrders
                .filter(wo => !wo.has_bill)
                .map(wo => wo.id);
            setSelectedWorkOrders(convertibleIds);
        } else {
            setSelectedWorkOrders([]);
        }
    };

    const handleConvertSingle = (workOrderId: number) => {
        convertMutation.mutate({ workOrderId, force: forceConvert });
    };

    const handleBulkConvert = () => {
        if (selectedWorkOrders.length === 0) {
            toast({
                title: "No work orders selected",
                description: "Please select work orders to convert",
                variant: "destructive"
            });
            return;
        }

        bulkConvertMutation.mutate({ workOrderIds: selectedWorkOrders, force: forceConvert });
    };

    const convertibleWorkOrders = filteredWorkOrders.filter(wo => !wo.has_bill);
    const allSelected = convertibleWorkOrders.length > 0 &&
        convertibleWorkOrders.every(wo => selectedWorkOrders.includes(wo.id));

    return (
        <div className="container mx-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/work-orders">
                        <Button size="sm" variant="outline" className="gap-1">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Work Orders
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold">Convert Work Orders to Bills</h1>
                        <p className="text-muted-foreground">Convert individual work orders to bills for flexible billing</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="gap-1"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Input
                        placeholder="Search work orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="bill-date" className="text-sm whitespace-nowrap">
                        Bill Date:
                    </Label>
                    <WorkOrderDatePicker
                        date={billDate ? new Date(billDate + 'T00:00:00') : undefined}
                        onDateChange={(date) => {
                            if (date) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                setBillDate(`${year}-${month}-${day}`);
                            } else {
                                setBillDate('');
                            }
                        }}
                        placeholder="Select bill date"
                        className="w-40"
                        quotationDate={workOrders.length > 0 ? (workOrders[0] as any)?.quotation?.quotation_date : undefined}
                        workOrderDate={workOrders.length > 0 ? workOrders[0]?.work_order_date : undefined}
                        appointmentDate={workOrders.length > 0 ? workOrders[0]?.appointment_date : undefined}
                        deliveryDate={workOrders.length > 0 ? workOrders[0]?.expected_delivery_date : undefined}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="force-convert"
                        checked={forceConvert}
                        onCheckedChange={(checked) => setForceConvert(checked as boolean)}
                    />
                    <Label htmlFor="force-convert" className="text-sm">
                        Force convert (ignore status restrictions)
                    </Label>
                </div>
            </div>

            {/* Bulk Actions */}
            {convertibleWorkOrders.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Bulk Actions</CardTitle>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={handleSelectAll}
                                />
                                <Label className="text-sm">Select All ({convertibleWorkOrders.length})</Label>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleBulkConvert}
                                disabled={selectedWorkOrders.length === 0 || bulkConvertMutation.isPending}
                                className="gap-1"
                            >
                                <Plus className="h-4 w-4" />
                                Convert Selected ({selectedWorkOrders.length})
                            </Button>
                            {selectedWorkOrders.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedWorkOrders([])}
                                    className="gap-1"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Clear Selection
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Work Orders List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading work orders...</p>
                    </div>
                ) : filteredWorkOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            {searchTerm ? "No work orders found matching your search." : "No work orders found."}
                        </p>
                    </div>
                ) : (
                    filteredWorkOrders.map((workOrder) => {
                        const totalAmount = Number(workOrder.quoted_price) + Number(workOrder.total_added_features_cost || 0);
                        const canConvert = !workOrder.has_bill && (
                            forceConvert ||
                            ['completed', 'delivered'].includes(workOrder.status)
                        );
                        const isSelected = selectedWorkOrders.includes(workOrder.id);

                        return (
                            <Card key={workOrder.id} className={cn(
                                "transition-colors",
                                isSelected && "ring-2 ring-blue-500 bg-blue-50/50"
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {canConvert && (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleSelectWorkOrder(workOrder.id, checked as boolean)}
                                                />
                                            )}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="font-semibold text-lg">
                                                        {workOrder.work_order_number}
                                                    </div>
                                                    <Badge className={cn("text-xs", STATUS_COLORS[workOrder.status] || "bg-gray-100 text-gray-800")}>
                                                        {STATUS_LABELS[workOrder.status] || workOrder.status}
                                                    </Badge>
                                                    {workOrder.has_bill && (
                                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Bill: {workOrder.bill_number}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="text-sm text-muted-foreground">
                                                    <div className="font-medium text-foreground">
                                                        {workOrder.quotation?.customer?.name || 'N/A'}
                                                    </div>
                                                    <div className="flex gap-4 text-xs">
                                                        <span>Quote: {workOrder.quotation?.quotation_number || 'N/A'}</span>
                                                        <span>Work Order Date: {workOrder.work_order_date}</span>
                                                        <span>Delivery: {workOrder.expected_delivery_date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right space-y-2">
                                            <div className="font-semibold text-lg">
                                                ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Balance: ₹{Number(workOrder.remaining_balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {workOrder.has_bill ? (
                                                    <Badge variant="outline" className="text-green-600">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Converted
                                                    </Badge>
                                                ) : canConvert ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleConvertSingle(workOrder.id)}
                                                        disabled={convertMutation.isPending}
                                                        className="gap-1"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                        Convert to Bill
                                                    </Button>
                                                ) : (
                                                    <Badge variant="outline" className="text-orange-600">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        {workOrder.status === 'cancelled' ? 'Cancelled' : 'Not Ready'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Summary */}
            {filteredWorkOrders.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <div className="font-medium">Total Work Orders</div>
                                <div className="text-2xl font-semibold">{filteredWorkOrders.length}</div>
                            </div>
                            <div>
                                <div className="font-medium">Convertible</div>
                                <div className="text-2xl font-semibold text-blue-600">{convertibleWorkOrders.length}</div>
                            </div>
                            <div>
                                <div className="font-medium">Already Converted</div>
                                <div className="text-2xl font-semibold text-green-600">
                                    {filteredWorkOrders.filter(wo => wo.has_bill).length}
                                </div>
                            </div>
                            <div>
                                <div className="font-medium">Selected</div>
                                <div className="text-2xl font-semibold text-purple-600">{selectedWorkOrders.length}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
