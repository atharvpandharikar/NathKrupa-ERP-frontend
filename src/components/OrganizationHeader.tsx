import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Building2 } from 'lucide-react';
import { Organization } from '@/lib/api';

const OrganizationHeader: React.FC = () => {
    const auth = useAuth();

    // Check if auth context has the required properties
    if (!auth || typeof auth.isAuthenticated === 'undefined') {
        return null;
    }

    const { currentOrganization, userOrganizations, isAuthenticated } = auth;
    const isSuperuser = auth.isSuperuser || false;

    const handleOrganizationSwitch = (org: Organization) => {
        // Navigate to organization URL
        const orgSlug = org.name.toLowerCase().replace(/\s/g, '-');
        window.location.href = `${window.location.origin}?org=${orgSlug}`;
    };

    // Don't show anything if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // If superuser and no current organization, show superuser mode
    if (isSuperuser && !currentOrganization) {
        return (
            <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Superuser Mode</span>
            </div>
        );
    }

    // If no current organization, don't show anything
    if (!currentOrganization) {
        return null;
    }

    // If user only has one organization, just show the name
    if (userOrganizations.length <= 1) {
        return (
            <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{currentOrganization.name}</span>
            </div>
        );
    }

    // If user has multiple organizations, show dropdown
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{currentOrganization.name}</span>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userOrganizations.map(org => (
                    <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleOrganizationSwitch(org)}
                        disabled={org.id === currentOrganization.id}
                    >
                        {org.name} {org.id === currentOrganization.id && '(Current)'}
                    </DropdownMenuItem>
                ))}
                {isSuperuser && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.location.href = '/admin'}>
                            Admin Panel
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default OrganizationHeader;

