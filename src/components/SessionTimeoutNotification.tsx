import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const SessionTimeoutNotification: React.FC = () => {
    const { sessionExpired, logout, refreshToken } = useAuth();

    if (!sessionExpired) return null;

    const handleRefresh = async () => {
        try {
            await refreshToken();
        } catch (error) {
            logout();
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 max-w-md">
            <Alert className="border-orange-200 bg-orange-50">
                <Clock className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                    <div className="space-y-2">
                        <p className="font-medium">Session Expired</p>
                        <p className="text-sm">
                            Your session has expired. You will be automatically logged out in a few seconds.
                        </p>
                        <div className="flex gap-2 pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleRefresh}
                                className="text-orange-700 border-orange-300 hover:bg-orange-100"
                            >
                                Refresh Session
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={logout}
                                className="text-orange-700 border-orange-300 hover:bg-orange-100"
                            >
                                <LogOut className="h-3 w-3 mr-1" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    );
};
