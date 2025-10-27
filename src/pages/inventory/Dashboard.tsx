import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Warehouse,
    Package,
    MapPin,
    AlertTriangle,
    TrendingUp,
    Plus,
    Search,
    Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { inventoryApiFunctions, type Warehouse as WarehouseType, type InventoryEntry } from "@/lib/api";

export default function InventoryDashboard() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);

    // Fetch warehouses
    const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
        queryKey: ['inventory', 'warehouses'],
        queryFn: inventoryApiFunctions.warehouses.list,
    });

    // Fetch inventory summary
    const { data: inventorySummary, isLoading: summaryLoading } = useQuery({
        queryKey: ['inventory', 'summary', selectedWarehouse],
        queryFn: () => inventoryApiFunctions.inventory.byWarehouse(selectedWarehouse || undefined),
        enabled: true,
    });

    // Fetch low stock items
    const { data: lowStockItems = [], isLoading: lowStockLoading } = useQuery({
        queryKey: ['inventory', 'low-stock'],
        queryFn: () => inventoryApiFunctions.inventory.lowStock(10),
    });

    // Calculate totals
    const totalWarehouses = warehouses.length;
    const totalProducts = inventorySummary?.length || 0;
    const totalQuantity = inventorySummary?.reduce((sum, item) => sum + item.total_quantity, 0) || 0;
    const lowStockCount = lowStockItems.length;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inventory Management</h1>
                    <p className="text-muted-foreground">Track and manage your warehouse inventory</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link to="/inventory/warehouses/new">
                            <Plus className="h-4 w-4 mr-2" />
                            New Warehouse
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link to="/inventory/entries/new">
                            <Package className="h-4 w-4 mr-2" />
                            Add Inventory
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalWarehouses}</div>
                        <p className="text-xs text-muted-foreground">
                            Active warehouses
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Products</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProducts}</div>
                        <p className="text-xs text-muted-foreground">
                            Unique products in stock
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Total items across all warehouses
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Products below threshold
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Warehouse className="h-5 w-5" />
                            Warehouses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Manage your warehouses and storage locations
                        </p>
                        <div className="flex gap-2">
                            <Button asChild size="sm">
                                <Link to="/inventory/warehouses">View All</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link to="/inventory/warehouses/new">Add New</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Inventory Entries
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Track products by location and quantity
                        </p>
                        <div className="flex gap-2">
                            <Button asChild size="sm">
                                <Link to="/inventory/entries">View All</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link to="/inventory/entries/new">Add New</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Racks & Locations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Organize storage with racks and grid positions
                        </p>
                        <div className="flex gap-2">
                            <Button asChild size="sm">
                                <Link to="/inventory/racks">View All</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                                <Link to="/inventory/racks/new">Add New</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity & Low Stock */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Low Stock Alert */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Low Stock Alert
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lowStockLoading ? (
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : lowStockItems.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No low stock items</div>
                        ) : (
                            <div className="space-y-2">
                                {lowStockItems.slice(0, 5).map((item) => (
                                    <div key={item.product_id} className="flex items-center justify-between p-2 border rounded">
                                        <div>
                                            <div className="font-medium text-sm">{item.product__title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Stock: {item.total_quantity}
                                            </div>
                                        </div>
                                        <Badge variant="destructive" className="text-xs">
                                            Low Stock
                                        </Badge>
                                    </div>
                                ))}
                                {lowStockItems.length > 5 && (
                                    <div className="text-xs text-muted-foreground text-center">
                                        +{lowStockItems.length - 5} more items
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Warehouse Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Warehouse className="h-5 w-5" />
                            Warehouse Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {warehousesLoading ? (
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : (
                            <div className="space-y-2">
                                {warehouses.slice(0, 5).map((warehouse) => (
                                    <div key={warehouse.id} className="flex items-center justify-between p-2 border rounded">
                                        <div>
                                            <div className="font-medium text-sm">{warehouse.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {warehouse.city}, {warehouse.state}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">
                                                {warehouse.total_racks || 0} racks
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {warehouse.total_inventory_items || 0} items
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {warehouses.length > 5 && (
                                    <div className="text-xs text-muted-foreground text-center">
                                        +{warehouses.length - 5} more warehouses
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


