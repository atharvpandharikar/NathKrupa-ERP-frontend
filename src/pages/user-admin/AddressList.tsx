import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    MapPin,
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    Filter,
    User,
    Phone,
    Mail
} from "lucide-react";
import { shopAddressesApi, ShopAddress } from '@/lib/shop-api';

export default function AddressList() {
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState<ShopAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredAddresses, setFilteredAddresses] = useState<ShopAddress[]>([]);

    useEffect(() => {
        loadAddresses();
    }, []);

    useEffect(() => {
        const filtered = addresses.filter(address =>
            address.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            address.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            address.address_line_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            address.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            address.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            address.country?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredAddresses(filtered);
    }, [addresses, searchTerm]);

    const loadAddresses = async () => {
        try {
            setLoading(true);
            const data = await shopAddressesApi.list();
            setAddresses(data);
        } catch (error) {
            console.error('Error loading addresses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (addressId: string) => {
        navigate(`/user-admin/addresses/edit/${addressId}`);
    };

    const handleDelete = async (addressId: string) => {
        if (window.confirm('Are you sure you want to delete this address?')) {
            try {
                await shopAddressesApi.delete(addressId);
                await loadAddresses();
            } catch (error) {
                console.error('Error deleting address:', error);
            }
        }
    };

    const handleView = (addressId: string) => {
        navigate(`/user-admin/addresses/view/${addressId}`);
    };

    const getAddressTypeBadge = (address: ShopAddress) => {
        if (address.is_default) {
            return <Badge variant="default">Default</Badge>;
        }
        return <Badge variant="outline">Secondary</Badge>;
    };

    const formatAddress = (address: ShopAddress) => {
        const parts = [
            address.address_line_1,
            address.address_line_2,
            address.city,
            address.state,
            address.postal_code,
            address.country
        ].filter(Boolean);
        return parts.join(', ');
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
                    <h1 className="text-3xl font-bold text-gray-900">Address Management</h1>
                    <p className="text-gray-600">Manage customer addresses and delivery locations</p>
                </div>
                <Button
                    onClick={() => navigate('/user-admin/addresses/add')}
                    className="bg-rose-600 hover:bg-rose-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Address
                </Button>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search addresses..."
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

            {/* Addresses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAddresses.map((address) => (
                    <Card key={address.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg line-clamp-2">
                                        {address.first_name} {address.last_name}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {address.address_type || 'Home Address'}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getAddressTypeBadge(address)}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                {/* Address Details */}
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-700 line-clamp-3">
                                            {formatAddress(address)}
                                        </span>
                                    </div>

                                    {address.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">{address.phone}</span>
                                        </div>
                                    )}

                                    {address.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">{address.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Address Details */}
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500">
                                        Created: {address.created_at ? new Date(address.created_at).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleView(address.id)}
                                        className="flex-1"
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(address.id)}
                                        className="flex-1"
                                    >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(address.id)}
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
            {filteredAddresses.length === 0 && !loading && (
                <Card className="text-center py-12">
                    <CardContent>
                        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No addresses found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm ? 'No addresses match your search criteria.' : 'Get started by adding your first address.'}
                        </p>
                        <Button
                            onClick={() => navigate('/user-admin/addresses/add')}
                            className="bg-rose-600 hover:bg-rose-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Address
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-rose-600">{addresses.length}</div>
                        <div className="text-sm text-gray-600">Total Addresses</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                            {addresses.filter(a => a.is_default).length}
                        </div>
                        <div className="text-sm text-gray-600">Default Addresses</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">
                            {addresses.filter(a => a.phone).length}
                        </div>
                        <div className="text-sm text-gray-600">With Phone</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">
                            {addresses.filter(a => a.email).length}
                        </div>
                        <div className="text-sm text-gray-600">With Email</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
