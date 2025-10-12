import { Link, useSearchParams } from "react-router-dom";
import { workOrdersApi, type WorkOrder } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { RefreshCw, Search, Plus, Eye, Settings, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptimizedWorkOrders } from "@/hooks/useOptimizedData";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";

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

export default function WorkOrdersList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const statusFilter = searchParams.get("status") || "all";
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    workOrders,
    totalCount,
    loading,
    error,
  } = useOptimizedWorkOrders(page, pageSize, searchTerm);

  useEffect(() => {
    if (error) {
      toast({ title: 'Failed to load work orders', description: error, variant: 'destructive' });
    }
  }, [error]);

  const items: WorkOrder[] = workOrders;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Group by status (simplified to 4 main statuses)
  const groups: Record<string, WorkOrder[]> = {
    all: items,
    upcoming: items.filter(b => b.status === 'scheduled'),
    inprocess: items.filter(b => b.status === 'in_progress'),
    completed: items.filter(b => b.status === 'completed'),
    cancelled: items.filter(b => b.status === 'cancelled')
  };

  // Filter and search
  const filteredItems = useMemo(() => {
    let filtered = statusFilter === "all" ? items : groups[statusFilter] || [];

    // Search is now handled by the backend hook.
    // The searchTerm state is passed to the hook.
    // We only need to apply status filter on the client for the current page.
    return filtered;
  }, [items, statusFilter, groups]);

  const stats = useMemo(() => ({
    total: totalCount,
    // Note: these stats are for the current page, not all items.
    // For accurate global stats, the API would need to provide them.
    upcoming: groups.upcoming.length,
    inprocess: groups.inprocess.length,
    completed: groups.completed.length,
    cancelled: groups.cancelled.length,
    totalBalance: items.reduce((sum, b) => sum + (Number(b.remaining_balance) || 0), 0)
  }), [totalCount, items, groups]);


  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value) {
      searchParams.set("search", value);
    } else {
      searchParams.delete("search");
    }
    setSearchParams(searchParams);
  };

  const handleStatusFilter = (value: string) => {
    if (value !== "all") {
      searchParams.set("status", value);
    } else {
      searchParams.delete("status");
    }
    setSearchParams(searchParams);
  };

  const WorkOrderItem = ({ item }: { item: WorkOrder }) => {
    const totalVal = Number(item.quoted_price) + Number(item.total_added_features_cost || 0);

    return (
      <Link
        to={`/work-orders/${item.id}`}
        className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors"
      >
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-lg">{item.work_order_number}</div>
            <Badge className={cn("text-xs", STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800")}>
              {STATUS_LABELS[item.status] || item.status}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {item.quotation?.customer?.name && (
              <div className="font-medium text-foreground">{item.quotation.customer.name}</div>
            )}
            <div className="flex gap-4 text-xs">
              <span>Order ID: {item.quotation?.quotation_number || 'N/A'}</span>
              <span>Appointment: {item.appointment_date}</span>
              <span>Delivery: {item.expected_delivery_date}</span>
            </div>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="font-semibold text-lg">
            ₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-sm text-muted-foreground">
            Balance: ₹{Number(item.remaining_balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="text-xs">View Details</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {statusFilter === "all" ? "All Client Orders" :
              statusFilter === "upcoming" ? "Upcoming Orders" :
                statusFilter === "inprocess" ? "Inprocess Orders" :
                  statusFilter === "completed" ? "Completed Orders" :
                    statusFilter === "cancelled" ? "Cancelled Orders" : "All Client Orders"}
          </h1>
          <p className="text-muted-foreground">Manage your work orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Link to="/work-orders/convert-to-bills">
            <Button variant="outline" size="sm" className="gap-1">
              <FileText className="h-4 w-4" />
              Convert to Bills
            </Button>
          </Link>
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search All Client orders..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1">
          <Search className="h-4 w-4" />
          Search
        </Button>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="inprocess">In Process</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { /* The hook will refetch on parameter change */ }}
          className="gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? <Skeleton className="h-6 w-10" /> : stats.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">In Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.inprocess}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Outstanding (₹)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {stats.totalBalance.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Orders List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "No work orders found matching your criteria."
                : "No work orders found."
              }
            </p>
          </div>
        ) : (
          filteredItems.map(item => (
            <WorkOrderItem key={item.id} item={item} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((old) => Math.max(old - 1, 1));
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(i + 1);
                  }}
                  isActive={page === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((old) => Math.min(old + 1, totalPages));
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
