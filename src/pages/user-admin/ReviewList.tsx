import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Star,
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    Filter,
    User,
    ShoppingBag,
    CheckCircle,
    XCircle
} from "lucide-react";

interface Review {
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
    rating: number;
    comment?: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
}

export default function ReviewList() {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);

    useEffect(() => {
        loadReviews();
    }, []);

    useEffect(() => {
        const filtered = reviews.filter(review =>
            review.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.comment?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredReviews(filtered);
    }, [reviews, searchTerm]);

    const loadReviews = async () => {
        try {
            setLoading(true);
            // Mock data for now - replace with actual API call
            const mockData: Review[] = [
                {
                    id: '1',
                    customer: { id: '1', name: 'John Doe', email: 'john@example.com' },
                    product: { id: '1', name: 'Premium Car Parts', price: 299.99, image: '/placeholder.jpg' },
                    rating: 5,
                    comment: 'Excellent quality and fast shipping!',
                    is_verified: true,
                    created_at: '2024-01-15T10:30:00Z',
                    updated_at: '2024-01-15T10:30:00Z'
                },
                {
                    id: '2',
                    customer: { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
                    product: { id: '2', name: 'Engine Oil Filter', price: 45.99, image: '/placeholder.jpg' },
                    rating: 4,
                    comment: 'Good product, works as expected.',
                    is_verified: false,
                    created_at: '2024-01-14T14:20:00Z',
                    updated_at: '2024-01-14T14:20:00Z'
                }
            ];
            setReviews(mockData);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (reviewId: string) => {
        navigate(`/user-admin/reviews/view/${reviewId}`);
    };

    const handleDelete = async (reviewId: string) => {
        if (window.confirm('Are you sure you want to delete this review?')) {
            try {
                // Mock delete - replace with actual API call
                setReviews(prev => prev.filter(review => review.id !== reviewId));
            } catch (error) {
                console.error('Error deleting review:', error);
            }
        }
    };

    const handleToggleVerification = async (reviewId: string) => {
        try {
            setReviews(prev => prev.map(review =>
                review.id === reviewId
                    ? { ...review, is_verified: !review.is_verified }
                    : review
            ));
        } catch (error) {
            console.error('Error toggling verification:', error);
        }
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
            />
        ));
    };

    const getRatingBadge = (rating: number) => {
        if (rating >= 4) return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>;
        if (rating >= 3) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Good</Badge>;
        if (rating >= 2) return <Badge variant="default" className="bg-orange-100 text-orange-800">Fair</Badge>;
        return <Badge variant="destructive">Poor</Badge>;
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
                    <h1 className="text-3xl font-bold text-gray-900">Review Management</h1>
                    <p className="text-gray-600">Manage customer reviews and ratings</p>
                </div>
                <Button
                    onClick={() => navigate('/user-admin/reviews/add')}
                    className="bg-amber-600 hover:bg-amber-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Review
                </Button>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search reviews..."
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

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReviews.map((review) => (
                    <Card key={review.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg line-clamp-2">{review.product.name}</CardTitle>
                                    <CardDescription className="mt-1">
                                        ${review.product.price.toFixed(2)}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getRatingBadge(review.rating)}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                {/* Product Image */}
                                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                    {review.product.image ? (
                                        <img
                                            src={review.product.image}
                                            alt={review.product.name}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                    ) : (
                                        <ShoppingBag className="w-12 h-12 text-gray-400" />
                                    )}
                                </div>

                                {/* Rating */}
                                <div className="flex items-center gap-2">
                                    <div className="flex">
                                        {renderStars(review.rating)}
                                    </div>
                                    <span className="text-sm text-gray-600">({review.rating}/5)</span>
                                </div>

                                {/* Review Comment */}
                                {review.comment && (
                                    <div className="text-sm text-gray-700 line-clamp-3">
                                        "{review.comment}"
                                    </div>
                                )}

                                {/* Customer Details */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-700">{review.customer.name}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {review.customer.email}
                                    </div>
                                </div>

                                {/* Verification Status */}
                                <div className="flex items-center gap-2">
                                    {review.is_verified ? (
                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-500">
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Unverified
                                        </Badge>
                                    )}
                                </div>

                                {/* Review Details */}
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500">
                                        Posted: {new Date(review.created_at).toLocaleDateString()}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleView(review.id)}
                                        className="flex-1"
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleToggleVerification(review.id)}
                                        className="flex-1"
                                    >
                                        {review.is_verified ? (
                                            <>
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Unverify
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Verify
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(review.id)}
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
            {filteredReviews.length === 0 && !loading && (
                <Card className="text-center py-12">
                    <CardContent>
                        <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm ? 'No reviews match your search criteria.' : 'No customers have left reviews yet.'}
                        </p>
                        <Button
                            onClick={() => navigate('/user-admin/reviews/add')}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Review
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-amber-600">{reviews.length}</div>
                        <div className="text-sm text-gray-600">Total Reviews</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                            {reviews.filter(r => r.is_verified).length}
                        </div>
                        <div className="text-sm text-gray-600">Verified Reviews</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">
                            {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}
                        </div>
                        <div className="text-sm text-gray-600">Average Rating</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">
                            {new Set(reviews.map(r => r.customer.id)).size}
                        </div>
                        <div className="text-sm text-gray-600">Unique Customers</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}