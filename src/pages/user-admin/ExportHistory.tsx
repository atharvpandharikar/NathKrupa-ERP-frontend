import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Download,
    FileSpreadsheet,
    FileText,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    History,
    ArrowLeft
} from "lucide-react";
import { exportService, ExportJob } from '@/services/exportService';
import { shopProductsApi } from '@/lib/shop-api';
import { FINANCE_BASE, API_ROOT, getTokens } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ExportHistoryItem {
    id: string;
    task_id: string;
    user_name: string;
    user_email: string;
    user_first_name: string;
    user_last_name: string;
    export_type?: string;
    format: 'excel' | 'pdf';
    status: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';
    filters: any;
    file_path?: string;
    file_name?: string;
    file_size?: number;
    progress_current: number;
    progress_total: number;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    expires_at?: string;
    error_message?: string;
    download_count: number;
    last_downloaded_at?: string;
    is_expired: boolean;
    can_download: boolean;
}

export default function ExportHistory() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [jobs, setJobs] = useState<ExportHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const response = await shopProductsApi.getExportHistory({ limit: 100 });
            if (response.results) {
                setJobs(response.results);
            } else if (Array.isArray(response)) {
                setJobs(response);
            }
        } catch (error) {
            console.error('Error loading export history:', error);
            toast({
                title: 'Error',
                description: 'Failed to load export history.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();

        // Also subscribe to frontend service updates for real-time updates
        const unsubscribe = exportService.subscribe(() => {
            loadHistory(); // Reload when exports update
        });

        return unsubscribe;
    }, []);

    const handleDownload = async (job: ExportHistoryItem) => {
        if (!job.file_path || !job.file_name) {
            toast({
                title: 'Download Failed',
                description: 'File path not available.',
                variant: 'destructive',
            });
            return;
        }

        if (job.is_expired) {
            toast({
                title: 'Download Failed',
                description: 'This file has expired and is no longer available for download.',
                variant: 'destructive',
            });
            return;
        }

        try {
            // Handle finance exports differently
            if (job.export_type === 'transactions') {
                const tokens = getTokens();
                let fileUrl = job.file_path;
                if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
                    fileUrl = `${API_ROOT}${fileUrl}`;
                }

                const response = await fetch(fileUrl, {
                    headers: {
                        'Authorization': `Bearer ${tokens?.access || ''}`,
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const blob = await response.blob();
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = job.file_name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl);
            } else {
                // Use exportService for products and other exports
                await exportService.downloadFile(job.file_path, job.file_name);
            }

            toast({
                title: 'Download Started',
                description: 'Your file download has started.',
            });
            // Reload history to update download count
            loadHistory();
        } catch (error: any) {
            toast({
                title: 'Download Failed',
                description: error.message || 'Failed to download file. It may have expired.',
                variant: 'destructive',
            });
        }
    };

    const getStatusBadge = (status: ExportHistoryItem['status']) => {
        switch (status) {
            case 'SUCCESS':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Complete</Badge>;
            case 'FAILURE':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
            case 'PROGRESS':
                return <Badge className="bg-blue-100 text-blue-800"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
            case 'PENDING':
                return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const formatTime = (timestamp: string) => {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="bg-white rounded-lg p-6">
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>
                    <History className="w-6 h-6 text-indigo-600" />
                    <div>
                        <h1 className="text-lg font-bold">Export History</h1>
                        <p className="text-sm text-muted-foreground">View and download all your export files</p>
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <Card className="mb-4 bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                        <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">File Availability</p>
                            <p className="text-xs">
                                Export files are available for download for 30 minutes after completion.
                                After that, files expire and cannot be downloaded.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Export List */}
            {jobs.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No exports yet</h3>
                        <p className="text-gray-600 mb-4">
                            Your export history will appear here once you start exporting data.
                        </p>
                        <Button
                            onClick={() => navigate('/user-admin/products')}
                            className="bg-indigo-600 hover:bg-indigo-700 mr-2"
                        >
                            Go to Products
                        </Button>
                        <Button
                            onClick={() => navigate('/finance/transactions')}
                            variant="outline"
                        >
                            Go to Transactions
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {jobs.map((job) => {
                        return (
                            <Card key={job.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Format Icon */}
                                            <div className="flex-shrink-0">
                                                {job.format === 'excel' ? (
                                                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                                                ) : (
                                                    <FileText className="w-8 h-8 text-red-600" />
                                                )}
                                            </div>

                                            {/* Job Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-sm">
                                                        {job.export_type ? `${job.export_type.charAt(0).toUpperCase() + job.export_type.slice(1)} ` : ''}
                                                        {job.format === 'excel' ? 'Excel' : 'PDF'} Export
                                                    </h3>
                                                    {getStatusBadge(job.status)}
                                                </div>
                                                <div className="text-xs text-gray-600 space-y-1">
                                                    <p>
                                                        Requested by: <span className="font-medium">
                                                            {job.user_first_name} {job.user_last_name} ({job.user_email})
                                                        </span>
                                                    </p>
                                                    <p>Task ID: <span className="font-mono">{job.task_id}</span></p>
                                                    <p>Started: {formatTime(job.created_at)}</p>
                                                    {job.completed_at && (
                                                        <p>Completed: {formatTime(job.completed_at)}</p>
                                                    )}
                                                    {job.progress_total > 0 && (
                                                        <p>
                                                            Progress: {job.progress_current} / {job.progress_total} {job.export_type === 'transactions' ? 'transactions' : 'products'}
                                                        </p>
                                                    )}
                                                    {job.download_count > 0 && (
                                                        <p>Downloaded {job.download_count} time{job.download_count > 1 ? 's' : ''}</p>
                                                    )}
                                                    {job.is_expired && job.status === 'SUCCESS' && (
                                                        <p className="text-red-600 font-medium">
                                                            ⚠️ File expired (30 minutes limit)
                                                        </p>
                                                    )}
                                                    {job.error_message && (
                                                        <p className="text-red-600">Error: {job.error_message}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {job.can_download ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleDownload(job)}
                                                        className="bg-indigo-600 hover:bg-indigo-700"
                                                    >
                                                        <Download className="w-4 h-4 mr-1" />
                                                        Download
                                                    </Button>
                                                ) : job.status === 'PROGRESS' || job.status === 'PENDING' ? (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Processing...
                                                    </div>
                                                ) : job.is_expired ? (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Expired
                                                    </Badge>
                                                ) : job.status === 'FAILURE' ? (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Failed
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

