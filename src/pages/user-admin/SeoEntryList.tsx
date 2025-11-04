import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Loader2,
    Plus,
    FileText
} from 'lucide-react';
import { shopApi } from '@/lib/shop-api';

export interface SeoEntry {
    id: number;
    product?: number;
    category?: number;
    page_slug?: string;
    product_title?: string;
    category_title?: string;
    seo_general_canonical?: string;
    seoGeneralTitle?: string;
    seoGeneralDescription?: string;
    seoGeneralKeywords?: string;
    seoGeneralRobots?: string;
    seoGeneralCanonical?: string;
    seoGeneralPageTitle?: string;
    seoGeneralPageDescription?: string;
    seoGeneralPageKeywords?: string;
    seoCustomTitle?: string;
    seoCustomDescription?: string;
    seoCustomKeywords?: string;
    seoCustomPageTitle?: string;
    seoCustomPageDescription?: string;
    seoCustomPageKeywords?: string;
    vehicle_header?: string;
    vehicle_footer?: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export default function SeoEntryList() {
    const navigate = useNavigate();
    const [seoEntries, setSeoEntries] = useState<SeoEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<SeoEntry | null>(null);
    const [formErrors, setFormErrors] = useState<{ form?: string }>({});
    const [form, setForm] = useState<{
        product_id?: string;
        category_id?: string;
        page_slug?: string;
        seoGeneralTitle?: string;
        seoGeneralDescription?: string;
        seoGeneralKeywords?: string;
        seoGeneralRobots?: string;
        seoCustomTitle?: string;
        seoCustomDescription?: string;
        seoCustomKeywords?: string;
    }>({
        product_id: "",
        category_id: "",
        page_slug: "",
        seoGeneralTitle: "",
        seoGeneralDescription: "",
        seoGeneralKeywords: "",
        seoGeneralRobots: "",
        seoCustomTitle: "",
        seoCustomDescription: "",
        seoCustomKeywords: "",
    });

    useEffect(() => {
        fetchSeoEntries();
    }, []);

    const fetchSeoEntries = async () => {
        try {
            setLoading(true);
            const response = await shopApi.get<SeoEntry[] | { results: SeoEntry[]; data: SeoEntry[] }>('/shop/seo-entries/');
            // Handle different response formats
            let data: SeoEntry[] = [];
            if (Array.isArray(response)) {
                data = response;
            } else if (response?.results && Array.isArray(response.results)) {
                data = response.results;
            } else if (response?.data && Array.isArray(response.data)) {
                data = response.data;
            }
            setSeoEntries(data);
            setTotalPages(Math.ceil(data.length / pageSize));
        } catch (error: any) {
            console.error('Error loading SEO entries:', error);
            // If endpoint doesn't exist yet, show empty state
            if (error?.status === 404) {
                console.log('SEO entries API endpoint not yet implemented');
            }
            setSeoEntries([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchSeoEntries();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this SEO entry? This action cannot be undone.')) {
            return;
        }

        try {
            await shopApi.del(`/shop/seo-entries/${id}/`);
            await fetchSeoEntries();
        } catch (error: any) {
            console.error('Error deleting SEO entry:', error);
            if (error?.status !== 404) {
                alert('Failed to delete SEO entry. Please try again.');
            }
        }
    };

    const handleEdit = (entry: SeoEntry) => {
        setEditing(entry);
        setForm({
            product_id: entry.product?.toString() || "",
            category_id: entry.category?.toString() || "",
            page_slug: entry.page_slug || "",
            seoGeneralTitle: entry.seoGeneralTitle || "",
            seoGeneralDescription: entry.seoGeneralDescription || "",
            seoGeneralKeywords: entry.seoGeneralKeywords || "",
            seoGeneralRobots: entry.seoGeneralRobots || "",
            seoCustomTitle: entry.seoCustomTitle || "",
            seoCustomDescription: entry.seoCustomDescription || "",
            seoCustomKeywords: entry.seoCustomKeywords || "",
        });
        setFormErrors({});
        setOpen(true);
    };

    const handleCreate = () => {
        setEditing(null);
        setForm({
            product_id: "",
            category_id: "",
            page_slug: "",
            seoGeneralTitle: "",
            seoGeneralDescription: "",
            seoGeneralKeywords: "",
            seoGeneralRobots: "",
            seoCustomTitle: "",
            seoCustomDescription: "",
            seoCustomKeywords: "",
        });
        setFormErrors({});
        setOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = {};
            
            // Only include fields that have values
            if (form.product_id) payload.product = parseInt(form.product_id);
            if (form.category_id) payload.category = parseInt(form.category_id);
            if (form.page_slug) payload.page_slug = form.page_slug;
            if (form.seoGeneralTitle) payload.seoGeneralTitle = form.seoGeneralTitle;
            if (form.seoGeneralDescription) payload.seoGeneralDescription = form.seoGeneralDescription;
            if (form.seoGeneralKeywords) payload.seoGeneralKeywords = form.seoGeneralKeywords;
            if (form.seoGeneralRobots) payload.seoGeneralRobots = form.seoGeneralRobots;
            if (form.seoCustomTitle) payload.seoCustomTitle = form.seoCustomTitle;
            if (form.seoCustomDescription) payload.seoCustomDescription = form.seoCustomDescription;
            if (form.seoCustomKeywords) payload.seoCustomKeywords = form.seoCustomKeywords;

            if (editing) {
                await shopApi.put(`/shop/seo-entries/${editing.id}/`, payload);
            } else {
                await shopApi.post('/shop/seo-entries/', payload);
            }

            // Close dialog and reset form
            setOpen(false);
            setForm({
                product_id: "",
                category_id: "",
                page_slug: "",
                seoGeneralTitle: "",
                seoGeneralDescription: "",
                seoGeneralKeywords: "",
                seoGeneralRobots: "",
                seoCustomTitle: "",
                seoCustomDescription: "",
                seoCustomKeywords: "",
            });
            setFormErrors({});
            setEditing(null);

            // Refresh SEO entries list
            await fetchSeoEntries();
        } catch (e: any) {
            console.error('Save error:', e);
            let errorMessage = 'Save failed. Please try again.';

            if (e?.message) {
                errorMessage = e.message;
            } else if (typeof e === 'string') {
                errorMessage = e;
            } else if (e?.response?.data?.errors) {
                // Handle validation errors from backend
                const errors = e.response.data.errors;
                errorMessage = Object.values(errors).flat().join(', ');
            }

            setFormErrors({ form: errorMessage });
        } finally {
            setSaving(false);
        }
    };

    // Filter SEO entries for display
    const filteredSeoEntries = useMemo(() => {
        let filtered = seoEntries;
        if (searchTerm) {
            filtered = seoEntries.filter(entry =>
                entry.seoGeneralTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.seoCustomTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.product_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.category_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.page_slug?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filtered.slice(startIndex, endIndex);
    }, [seoEntries, searchTerm, currentPage, pageSize]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="text-muted-foreground animate-spin h-8 w-8" />
            </div>
        );
    }

    return (
        <>
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold mb-1">SEO Entries Management</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage SEO metadata for products, categories, and pages
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefresh}>
                            <Loader2 className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button onClick={handleCreate} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add SEO Entry
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search SEO entries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>General Title</TableHead>
                                    <TableHead>Custom Title</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSeoEntries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-muted-foreground">
                                                    {seoEntries.length === 0 && !loading
                                                        ? "No SEO entries found. The API endpoint may not be implemented yet."
                                                        : "No SEO entries found"}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                        filteredSeoEntries.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                {entry.product ? (
                                                    <Badge variant="outline" className="bg-blue-50">Product</Badge>
                                                ) : entry.category ? (
                                                    <Badge variant="outline" className="bg-green-50">Category</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-50">Page</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {entry.product_title || entry.category_title || entry.page_slug || 'Unknown'}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {entry.seoGeneralTitle || '-'}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {entry.seoCustomTitle || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(entry.updated_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(entry.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            {/* Add/Edit Dialog */}
            {open && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">
                                    {editing ? "Edit SEO Entry" : "Add SEO Entry"}
                                </h2>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formErrors.form && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-600">{formErrors.form}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Product ID (optional)</label>
                                        <input
                                            type="text"
                                            value={form.product_id}
                                            onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                                            placeholder="Product UUID"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Category ID (optional)</label>
                                        <input
                                            type="text"
                                            value={form.category_id}
                                            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                                            placeholder="Category UUID"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Page Slug (optional)</label>
                                    <input
                                        type="text"
                                        value={form.page_slug}
                                        onChange={e => setForm(f => ({ ...f, page_slug: e.target.value }))}
                                        placeholder="e.g., about-us"
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    />
                                    <p className="text-xs text-gray-500">Note: Specify product, category, or page slug (only one)</p>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-medium mb-3">General SEO</h3>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">General Title</label>
                                            <input
                                                type="text"
                                                value={form.seoGeneralTitle}
                                                onChange={e => setForm(f => ({ ...f, seoGeneralTitle: e.target.value }))}
                                                placeholder="SEO General Title"
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">General Description</label>
                                            <textarea
                                                value={form.seoGeneralDescription}
                                                onChange={e => setForm(f => ({ ...f, seoGeneralDescription: e.target.value }))}
                                                placeholder="SEO General Description"
                                                rows={3}
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">General Keywords</label>
                                            <input
                                                type="text"
                                                value={form.seoGeneralKeywords}
                                                onChange={e => setForm(f => ({ ...f, seoGeneralKeywords: e.target.value }))}
                                                placeholder="keyword1, keyword2, keyword3"
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">General Robots</label>
                                            <input
                                                type="text"
                                                value={form.seoGeneralRobots}
                                                onChange={e => setForm(f => ({ ...f, seoGeneralRobots: e.target.value }))}
                                                placeholder="index, follow"
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-medium mb-3">Custom SEO</h3>
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Custom Title</label>
                                            <input
                                                type="text"
                                                value={form.seoCustomTitle}
                                                onChange={e => setForm(f => ({ ...f, seoCustomTitle: e.target.value }))}
                                                placeholder="SEO Custom Title"
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Custom Description</label>
                                            <textarea
                                                value={form.seoCustomDescription}
                                                onChange={e => setForm(f => ({ ...f, seoCustomDescription: e.target.value }))}
                                                placeholder="SEO Custom Description"
                                                rows={3}
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Custom Keywords</label>
                                            <input
                                                type="text"
                                                value={form.seoCustomKeywords}
                                                onChange={e => setForm(f => ({ ...f, seoCustomKeywords: e.target.value }))}
                                                placeholder="keyword1, keyword2, keyword3"
                                                className="w-full p-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={saving}
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : (editing ? "Update" : "Create")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
