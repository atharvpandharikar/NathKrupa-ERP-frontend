import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Heart,
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    Filter,
    User,
    ShoppingBag
} from "lucide-react";

interface WishlistItem {
    id: string;
    customer: {
        id: string;
        name: string;
        email: string;
    };
    product: {
        id: string;
        name: string;
        price: number;
        image?: string;
    };
    created_at: string;
    updated_at: string;
}

export default function WishlistList() {
    const navigate = useNavigate();
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState<WishlistItem[]>([]);

    useEffect(() => {
        loadWishlistItems();
    }, []);

    useEffect(() => {
        const filtered = wishlistItems.filter(item =>
            item.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredItems(filtered);
    }, [wishlistItems, searchTerm]);

    const loadWishlistItems = async () => {
        try {
            setLoading(true);
            // Mock data for now - replace with actual API call
            const mockData: WishlistItem[] = [
                {
                    id: '1',
                    customer: { id: '1', name: 'John Doe', email: 'john@example.com' },
                    product: { id: '1', name: 'Premium Car Parts', price: 299.99, image: '/placeholder.jpg' },
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z'
                },
                {
                    id: '2',
                    customer: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
                    product: { id: '2', name: 'Engine Oil Filter', price: 45.99, image: '/placeholder.jpg' },
                    created_at: '2024-01-14T14:20:00Z',
                    updated_at: '2024-01-14T14:20:00Z'
                }
            ];
            setWishlistItems(mockData);
        } catch (error) {
            console.error('Error loading wishlist items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (itemId: string) => {
        navigate(`/user-admin/wishlists/view/${itemId}`);
    };

    const handleDelete = async (itemId: string) => {
        if (window.confirm('Are you sure you want to remove this item from wishlist?')) {
            try {
                // Mock delete - replace with actual API call
                setWishlistItems(prev => prev.filter(item => item.id !== itemId));
            } catch (error) {
                console.error('Error deleting wishlist item:', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-lg p-6">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                            </div>
                        ))}
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
                    <h1 className="text-3xl font-bold text-gray-900">Wishlist Management</h1>
                    <p className="text-gray-600">Manage customer wishlists and saved items</p>
                </div>
                <Button
                    onClick={() => navigate('/user-admin/wishlists/add')}
                    className="bg-pink-600 hover:bg-pink-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Wishlist
                </Button>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search wishlist items..."
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

            {/* Wishlist Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                    <Card key={item.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg line-clamp-2">{item.product.name}</CardTitle>
                                    <CardDescription className="mt-1">
                                        ${item.product.price.toFixed(2)}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-pink-500" />
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                {/* Product Image */}
                                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                    {item.product.image ? (
                                        <img
                                            src={item.product.image}
                                            alt={item.product.name}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                    ) : (
                                        <ShoppingBag className="w-12 h-12 text-gray-400" />
                                    )}
                                </div>

                                {/* Customer Details */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-700">{item.customer.name}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {item.customer.email}
                                    </div>
                                </div>

                                {/* Wishlist Details */}
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500">
                                        Added: {new Date(item.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleView(item.id)}
                                        className="flex-1"
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(item.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 && !loading && (
                <Card className="text-center py-12">
                    <CardContent>
                        <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No wishlist items found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm ? 'No wishlist items match your search criteria.' : 'No customers have added items to their wishlists yet.'}
                        </p>
                        <Button
                            onClick={() => navigate('/user-admin/wishlists/add')}
                            className="bg-pink-600 hover:bg-pink-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add to Wishlist
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-pink-600">{wishlistItems.length}</div>
                        <div className="text-sm text-gray-600">Total Items</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                            {new Set(wishlistItems.map(item => item.customer.id)).size}
                        </div>
                        <div className="text-sm text-gray-600">Unique Customers</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">
                            {new Set(wishlistItems.map(item => item.product.id)).size}
                        </div>
                        <div className="text-sm text-gray-600">Unique Products</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">
                            ${wishlistItems.reduce((sum, item) => sum + item.product.price, 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Total Value</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}