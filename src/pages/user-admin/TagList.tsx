import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Tag,
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    Filter
} from "lucide-react";
import { shopTagsApi, ShopTag } from '@/lib/shop-api';

export default function TagList() {
    const navigate = useNavigate();
    const [tags, setTags] = useState<ShopTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTags, setFilteredTags] = useState<ShopTag[]>([]);

    useEffect(() => {
        loadTags();
    }, []);

    useEffect(() => {
        const filtered = tags.filter(tag =>
            tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredTags(filtered);
    }, [tags, searchTerm]);

    const loadTags = async () => {
        try {
            setLoading(true);
            const data = await shopTagsApi.list();
            setTags(data);
        } catch (error) {
            console.error('Error loading tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (tagId: string) => {
        navigate(`/user-admin/tags/edit/${tagId}`);
    };

    const handleDelete = async (tagId: string) => {
        if (window.confirm('Are you sure you want to delete this tag?')) {
            try {
                await shopTagsApi.delete(tagId);
                await loadTags();
            } catch (error) {
                console.error('Error deleting tag:', error);
            }
        }
    };

    const handleView = (tagId: string) => {
        navigate(`/user-admin/tags/view/${tagId}`);
    };

    const getStatusBadge = (tag: ShopTag) => {
        if (!tag.is_active) {
            return <Badge variant="destructive">Inactive</Badge>;
        }
        return <Badge variant="default">Active</Badge>;
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
                    <h1 className="text-3xl font-bold text-gray-900">Tag Management</h1>
                    <p className="text-gray-600">Manage product tags and labels</p>
                </div>
                <Button
                    onClick={() => navigate('/user-admin/tags/add')}
                    className="bg-emerald-600 hover:bg-emerald-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tag
                </Button>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search tags..."
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

            {/* Tags Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTags.map((tag) => (
                    <Card key={tag.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg line-clamp-2">{tag.name}</CardTitle>
                                    <CardDescription className="mt-1">
                                        {tag.description || 'No description'}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(tag)}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            <div className="space-y-3">
                                {/* Tag Color */}
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-6 h-6 rounded-full border-2 border-gray-200"
                                        style={{ backgroundColor: tag.color || '#6B7280' }}
                                    ></div>
                                    <span className="text-sm text-gray-600">
                                        {tag.color || '#6B7280'}
                                    </span>
                                </div>

                                {/* Tag Details */}
                                <div className="space-y-2">
                                    <div className="text-xs text-gray-500">
                                        Created: {tag.created_at ? new Date(tag.created_at).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 pt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleView(tag.id)}
                                        className="flex-1"
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(tag.id)}
                                        className="flex-1"
                                    >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(tag.id)}
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
            {filteredTags.length === 0 && !loading && (
                <Card className="text-center py-12">
                    <CardContent>
                        <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tags found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm ? 'No tags match your search criteria.' : 'Get started by adding your first tag.'}
                        </p>
                        <Button
                            onClick={() => navigate('/user-admin/tags/add')}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Tag
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-emerald-600">{tags.length}</div>
                        <div className="text-sm text-gray-600">Total Tags</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                            {tags.filter(t => t.is_active).length}
                        </div>
                        <div className="text-sm text-gray-600">Active Tags</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-orange-600">
                            {tags.filter(t => !t.is_active).length}
                        </div>
                        <div className="text-sm text-gray-600">Inactive Tags</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">
                            {tags.filter(t => t.color).length}
                        </div>
                        <div className="text-sm text-gray-600">With Colors</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
