import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ShoppingCart,
    Search,
    Eye,
    Filter,
    Package,
    User,
    Calendar,
    DollarSign
} from "lucide-react";
import { shopOrdersApi, ShopOrder } from '@/lib/shop-api';

export default function OrderList() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOrders, setFilteredOrders] = useState<ShopOrder[]>([]);

    useEffect(() => {
        loadOrders();
    }, []);

    useEffect(() => {
        const filtered = orders.filter(order =>
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOrders(filtered);
    }, [orders, searchTerm]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await shopOrdersApi.list();
            setOrders(data);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (orderId: string) => {
        navigate(`/user-admin/orders/view/${orderId}`);
    };

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        try {
            await shopOrdersApi.updateStatus(orderId, newStatus);
            await loadOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
            confirmed: { variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
            shipped: { variant: 'default' as const, color: 'bg-purple-100 text-purple-800' },
            delivered: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
            cancelled: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return <Badge variant={config.variant} className={config.color}>{status}</Badge>;
    };

    const getPaymentStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
            paid: { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
            failed: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
            refunded: { variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return <Badge variant={config.variant} className={config.color}>{status}</Badge>;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="bg-white rounded-lg p-6">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
                    <p className="text-gray-600">Track and manage customer orders</p>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search orders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.map((order) => (
                    <Card key={order.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Order #{order.order_number}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(order.status)}
                                            {getPaymentStatusBadge(order.payment_status)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{order.customer.name}</p>
                                                <p className="text-xs text-gray-600">{order.customer.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{order.items.length} items</p>
                                                <p className="text-xs text-gray-600">Total: ₹{order.total_amount.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Order Date</p>
                                                <p className="text-xs text-gray-600">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Items Preview */}
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-900 mb-2">Items:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {order.items.slice(0, 3).map((item) => (
                                                <Badge key={item.id} variant="outline" className="text-xs">
                                                    {item.product.title} (x{item.quantity})
                                                </Badge>
                                            ))}
                                            {order.items.length > 3 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{order.items.length - 3} more
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleView(order.id)}
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View Details
                                    </Button>

                                    {order.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            Confirm Order
                                        </Button>
                                    )}

                                    {order.status === 'confirmed' && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleStatusUpdate(order.id, 'shipped')}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            Mark Shipped
                                        </Button>
                                    )}

                                    {order.status === 'shipped' && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            Mark Delivered
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredOrders.length === 0 && !loading && (
                <Card className="text-center py-12">
                    <CardContent>
                        <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm ? 'No orders match your search criteria.' : 'No orders have been placed yet.'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
                        <div className="text-sm text-gray-600">Total Orders</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                            {orders.filter(o => o.status === 'delivered').length}
                        </div>
                        <div className="text-sm text-gray-600">Delivered</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-yellow-600">
                            {orders.filter(o => o.status === 'pending').length}
                        </div>
                        <div className="text-sm text-gray-600">Pending</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">
                            ₹{orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Total Revenue</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
