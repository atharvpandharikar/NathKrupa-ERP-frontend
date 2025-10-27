import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getOrganizationFromSubdomain, getOrganizationBranding } from '@/lib/organization';
import { organizationsApi, Organization } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    ChevronDown,
    Users,
    Settings,
    LogOut,
    Shield,
    Globe
} from 'lucide-react';

export const OrganizationHeader: React.FC = () => {
    const { currentUser, logout, activeOrganizationId } = useAuth();
    const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
    const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeOrganization = async () => {
            try {
                // Get organization from subdomain
                const subdomainOrg = getOrganizationFromSubdomain();

                if (subdomainOrg) {
                    setCurrentOrganization(subdomainOrg);

                    // Apply branding
                    const branding = getOrganizationBranding(subdomainOrg.id);
                    // Branding is applied in OrganizationRouter
                }

                // Fetch user's organizations for switching
                const orgs = await organizationsApi.list();
                setUserOrganizations(orgs);
            } catch (error) {
                console.error('Error loading organization:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeOrganization();
    }, []);

    const handleOrganizationSwitch = (org: Organization) => {
        // Redirect to the organization's subdomain
        const protocol = window.location.protocol;
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (isLocalhost) {
            // For development, use query parameter
            window.location.href = `${protocol}//${window.location.host}?org=${org.name.toLowerCase().replace(/\s+/g, '-')}`;
        } else {
            // For production, use subdomain
            const baseDomain = window.location.hostname.split('.').slice(-2).join('.');
            const orgSlug = org.name.toLowerCase().replace(/\s+/g, '-');
            window.location.href = `${protocol}//${orgSlug}.${baseDomain}`;
        }
    };

    const handleLogout = () => {
        logout();
    };

    if (loading) {
        return (
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    if (!currentOrganization) {
        return null;
    }

    const branding = getOrganizationBranding(currentOrganization.id);
    const isAdmin = currentOrganization.slug === 'admin';
    const isSuperuser = currentUser?.is_superuser || false;

    return (
        <div
            className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6"
            style={{
                borderBottomColor: branding.primaryColor + '20',
                backgroundColor: branding.primaryColor + '05'
            }}
        >
            {/* Left side - Organization info */}
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                    <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: branding.primaryColor }}
                    >
                        {isAdmin ? (
                            <Shield className="h-5 w-5" />
                        ) : (
                            <Building2 className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <h1 className="font-semibold text-gray-900 text-lg">
                            {branding.name}
                        </h1>
                        <div className="flex items-center space-x-2">
                            <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                    backgroundColor: branding.secondaryColor + '20',
                                    color: branding.secondaryColor
                                }}
                            >
                                {currentOrganization.slug}
                            </Badge>
                            {isAdmin && (
                                <Badge variant="destructive" className="text-xs">
                                    Admin
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - User menu and organization switcher */}
            <div className="flex items-center space-x-4">
                {/* Organization Switcher */}
                {userOrganizations.length > 1 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center space-x-2">
                                <Globe className="h-4 w-4" />
                                <span>Switch Org</span>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <div className="px-2 py-1.5 text-sm font-medium text-gray-900">
                                Available Organizations
                            </div>
                            <DropdownMenuSeparator />
                            {userOrganizations.map((org) => (
                                <DropdownMenuItem
                                    key={org.id}
                                    onClick={() => handleOrganizationSwitch(org)}
                                    className="flex items-center space-x-2"
                                >
                                    <Building2 className="h-4 w-4" />
                                    <div>
                                        <div className="font-medium">{org.name}</div>
                                        {org.address && (
                                            <div className="text-xs text-gray-500">{org.address}</div>
                                        )}
                                    </div>
                                    {org.id === currentOrganization.id && (
                                        <Badge variant="secondary" className="ml-auto text-xs">
                                            Current
                                        </Badge>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium">{currentUser?.username || 'User'}</div>
                                <div className="text-xs text-gray-500">
                                    {isSuperuser ? 'Superuser' : 'User'}
                                </div>
                            </div>
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5 text-sm font-medium text-gray-900">
                            {currentUser?.username || 'User'}
                        </div>
                        <div className="px-2 py-1.5 text-xs text-gray-500">
                            {currentUser?.email || ''}
                        </div>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </DropdownMenuItem>

                        {isSuperuser && (
                            <DropdownMenuItem>
                                <Shield className="h-4 w-4 mr-2" />
                                Admin Panel
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-red-600 focus:text-red-600"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};
