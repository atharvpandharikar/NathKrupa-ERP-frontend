import { shopProductsApi, SHOP_API_ROOT, getTokens } from '@/lib/shop-api';

export interface ExportJob {
    taskId: string;
    format: 'excel' | 'pdf';
    status: 'PENDING' | 'PROGRESS' | 'SUCCESS' | 'FAILURE';
    progress?: { current: number; total: number };
    filePath?: string;
    fileName?: string;
    createdAt: number;
    completedAt?: number;
}

class ExportService {
    private jobs: Map<string, ExportJob> = new Map();
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private listeners: Set<(job: ExportJob) => void> = new Set();

    /**
     * Request browser notification permission
     */
    async requestNotificationPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    /**
     * Show browser notification
     */
    private showNotification(title: string, body: string, tag?: string) {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: '/favicon.ico',
                tag: tag || 'export-notification',
            });

            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            // Handle click to focus window
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    /**
     * Start monitoring an export job
     */
    async startExport(
        params: {
            format: 'excel' | 'pdf';
            vendor_id?: string;
            category_id?: string;
            start_date?: string;
            end_date?: string;
        }
    ): Promise<string> {
        // Request notification permission
        await this.requestNotificationPermission();

        // Start export
        const response = await shopProductsApi.exportProducts(params);

        if (response.error) {
            throw new Error(response.message || response.error || 'Failed to start export');
        }

        // Handle async task (when Redis is available)
        if (response.task_id) {
            const job: ExportJob = {
                taskId: response.task_id,
                format: params.format,
                status: 'PENDING',
                createdAt: Date.now(),
            };

            this.jobs.set(response.task_id, job);
            this.startPolling(response.task_id);
            this.notifyListeners(job);

            this.showNotification(
                'Export Started',
                `Your ${params.format.toUpperCase()} export has started processing. You'll be notified when it's ready.`,
                `export-${response.task_id}`
            );

            return response.task_id;
        }
        // Handle synchronous result (when Redis is not available)
        else if (response.file_path) {
            // For sync exports, create a fake task ID and mark as complete
            const taskId = `sync-${Date.now()}`;
            const job: ExportJob = {
                taskId,
                format: params.format,
                status: 'SUCCESS',
                filePath: response.file_path,
                createdAt: Date.now(),
                completedAt: Date.now(),
            };

            this.jobs.set(taskId, job);
            this.notifyListeners(job);

            this.showNotification(
                'Export Ready',
                `Your ${params.format.toUpperCase()} export is ready for download.`,
                `export-${taskId}`
            );

            return taskId;
        } else {
            throw new Error('Unexpected response format');
        }
    }

    /**
     * Start polling for export status
     */
    private startPolling(taskId: string) {
        // Clear any existing interval
        if (this.intervals.has(taskId)) {
            clearInterval(this.intervals.get(taskId)!);
        }

        const interval = setInterval(async () => {
            try {
                const status = await shopProductsApi.getExportStatus(taskId);
                const job = this.jobs.get(taskId);

                if (!job) {
                    clearInterval(interval);
                    this.intervals.delete(taskId);
                    return;
                }

                // Update job status
                job.status = status.status;
                if (status.info?.current && status.info?.total) {
                    job.progress = {
                        current: status.info.current,
                        total: status.info.total,
                    };
                }

                if (status.status === 'SUCCESS' && status.result?.file_path) {
                    // Extract filename from file path
                    let fileUrl = status.result.file_path;
                    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
                        fileUrl = `${SHOP_API_ROOT}${fileUrl}`;
                    }
                    const urlParts = fileUrl.split('/');
                    const fileName = urlParts[urlParts.length - 1] || `products_export.${job.format === 'excel' ? 'xlsx' : 'pdf'}`;

                    job.status = 'SUCCESS';
                    job.filePath = status.result.file_path;
                    job.fileName = fileName;
                    job.completedAt = Date.now();

                    clearInterval(interval);
                    this.intervals.delete(taskId);

                    this.notifyListeners(job);

                    this.showNotification(
                        'Export Complete',
                        `Your ${job.format.toUpperCase()} export is ready for download.`,
                        `export-${taskId}`
                    );
                } else if (status.status === 'FAILURE') {
                    job.status = 'FAILURE';
                    job.completedAt = Date.now();

                    clearInterval(interval);
                    this.intervals.delete(taskId);

                    this.notifyListeners(job);

                    this.showNotification(
                        'Export Failed',
                        'Your export failed. Please try again.',
                        `export-${taskId}`
                    );
                } else {
                    // Still in progress
                    this.notifyListeners(job);
                }
            } catch (error) {
                console.error('Error checking export status:', error);
                const job = this.jobs.get(taskId);
                if (job) {
                    job.status = 'FAILURE';
                    job.completedAt = Date.now();
                    this.notifyListeners(job);
                }
                clearInterval(interval);
                this.intervals.delete(taskId);
            }
        }, 2000); // Poll every 2 seconds

        this.intervals.set(taskId, interval);
    }

    /**
     * Get a job by task ID
     */
    getJob(taskId: string): ExportJob | undefined {
        return this.jobs.get(taskId);
    }

    /**
     * Get all jobs
     */
    getAllJobs(): ExportJob[] {
        return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Subscribe to job updates
     */
    subscribe(listener: (job: ExportJob) => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(job: ExportJob) {
        this.listeners.forEach(listener => {
            try {
                listener(job);
            } catch (error) {
                console.error('Error in export listener:', error);
            }
        });
    }

    /**
     * Download a file with authentication
     */
    async downloadFile(filePath: string, fileName: string): Promise<void> {
        try {
            const tokens = getTokens();

            if (!tokens?.access) {
                throw new Error('Authentication required. Please log in again.');
            }

            // Construct full URL if needed
            let fileUrl = filePath;
            if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
                fileUrl = `${SHOP_API_ROOT}${fileUrl}`;
            }

            const response = await fetch(fileUrl, {
                headers: {
                    'Authorization': `Bearer ${tokens.access}`,
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Session expired. Please log in again.');
                } else if (response.status === 404) {
                    throw new Error('File not found. The report may have expired.');
                } else {
                    throw new Error(`Failed to download: ${response.statusText}`);
                }
            }

            // Get filename from Content-Disposition header or use provided
            const contentDisposition = response.headers.get('Content-Disposition');
            let finalFileName = fileName;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    finalFileName = filenameMatch[1];
                }
            }

            // Download the file
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = finalFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }

    /**
     * Stop polling for a job (cleanup)
     */
    stopPolling(taskId: string) {
        const interval = this.intervals.get(taskId);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(taskId);
        }
    }

    /**
     * Clean up old jobs (older than 1 hour)
     */
    cleanupOldJobs() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        for (const [taskId, job] of this.jobs.entries()) {
            if (job.createdAt < oneHourAgo && job.status !== 'PROGRESS' && job.status !== 'PENDING') {
                this.jobs.delete(taskId);
                this.stopPolling(taskId);
            }
        }
    }
}

// Export singleton instance
export const exportService = new ExportService();

// Cleanup old jobs every 10 minutes
setInterval(() => {
    exportService.cleanupOldJobs();
}, 10 * 60 * 1000);

