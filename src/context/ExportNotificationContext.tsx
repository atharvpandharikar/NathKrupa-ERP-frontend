import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportService, ExportJob } from '@/services/exportService';
import { useToast } from '@/hooks/use-toast';

interface ExportNotificationContextProps {
    trackJob: (taskId: string) => void;
}

const ExportNotificationContext = createContext<ExportNotificationContextProps | undefined>(undefined);

/**
 * Global Export Notification Provider
 * This provider listens to export service updates and shows notifications globally
 * regardless of which page the user is on.
 */
export const ExportNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const trackedJobsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Subscribe to all export job updates
        const unsubscribe = exportService.subscribe((job: ExportJob) => {
            // Only show notifications for jobs we're tracking
            if (!trackedJobsRef.current.has(job.taskId)) {
                return;
            }

            // Show success notification
            if (job.status === 'SUCCESS' && job.filePath && job.fileName) {
                toast({
                    title: 'Export Complete! 🎉',
                    description: `Your ${job.format.toUpperCase()} export is ready for download. Click the button below to view it in export history or download it directly.`,
                    variant: 'success',
                    duration: 8000,
                    action: (
                        <button
                            onClick={() => navigate('/user-admin/export-history')}
                            className="mt-2 inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                        >
                            View Export History
                        </button>
                    ),
                });
                trackedJobsRef.current.delete(job.taskId);
            }
            // Show failure notification
            else if (job.status === 'FAILURE') {
                toast({
                    title: 'Export Failed',
                    description: 'Your export request failed. Please check your filters and try again. If the problem persists, contact support.',
                    variant: 'error',
                    duration: 6000,
                });
                trackedJobsRef.current.delete(job.taskId);
            }
        });

        return unsubscribe;
    }, [toast, navigate]);

    // Method to track a new export job (can be called from components)
    const trackJob = (taskId: string) => {
        trackedJobsRef.current.add(taskId);
    };

    const contextValue: ExportNotificationContextProps = {
        trackJob,
    };

    return (
        <ExportNotificationContext.Provider value={contextValue}>
            {children}
        </ExportNotificationContext.Provider>
    );
};

/**
 * Hook to access export notification context
 */
export const useExportNotifications = () => {
    const context = useContext(ExportNotificationContext);
    if (!context) {
        throw new Error('useExportNotifications must be used within ExportNotificationProvider');
    }
    return context;
};

