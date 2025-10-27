import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getOrganizationFromSubdomain, isValidOrganizationForUser } from '@/lib/organization';
import { getOrganizationBranding, applyOrganizationBranding } from '@/lib/branding';
import { organizationsApi, Organization } from '@/lib/api';
import AppSelection from '@/pages/auth/AppSelection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Shield } from 'lucide-react';

interface OrganizationRouterProps {
    children: React.ReactNode;
}

export const OrganizationRouter: React.FC<OrganizationRouterProps> = ({ children }) => {
    const navigate = useNavigate();
    const { isAuthenticated, activeOrganizationId, currentUser } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeOrganization = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get organization from subdomain
                const subdomainOrg = getOrganizationFromSubdomain();

                // If not authenticated, just render children (login/register pages)
                if (!isAuthenticated) {
                    setLoading(false);
                    setOrganization(null);
                    return;
                }

                // Fetch user's organizations
                const orgs = await organizationsApi.list();
                setUserOrganizations(orgs);

                if (subdomainOrg) {
                    // Convert Organization[] to OrganizationInfo[] for validation
                    const orgInfos = orgs.map(org => ({
                        id: org.id,
                        name: org.name,
                        slug: org.name.toLowerCase().replace(/\s/g, '-')
                    }));

                    // Validate organization access
                    const hasAccess = isValidOrganizationForUser(subdomainOrg, orgInfos) || currentUser?.is_superuser || false;

                    if (!hasAccess) {
                        setError('Access denied to this organization');
                        setLoading(false);
                        return;
                    }

                    // Find the matching Organization object
                    const matchingOrg = orgs.find(org => org.id === subdomainOrg.id);
                    if (matchingOrg) {
                        setOrganization(matchingOrg);

                        // Apply organization branding
                        const branding = getOrganizationBranding(matchingOrg);
                        applyOrganizationBranding(branding);
                    }
                } else {
                    // No subdomain detected, show organization selection
                    setOrganization(null);
                }
            } catch (err) {
                console.error('Error initializing organization:', err);
                setError('Failed to load organization information');
            } finally {
                setLoading(false);
            }
        };

        initializeOrganization();
    }, [isAuthenticated, currentUser]);

    // Don't show loading state if not authenticated (login/register pages)
    if (loading && isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading organization...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-destructive" />
                            Access Denied
                        </CardTitle>
                        <CardDescription>
                            You don't have permission to access this organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        <div className="mt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    // Clear any organization context and redirect to login
                                    localStorage.removeItem('dev_organization_id');
                                    navigate('/login', { replace: true });
                                }}
                                className="w-full"
                            >
                                Switch Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // For now, don't force organization selection - just render the app
    // Organization context is optional for backward compatibility
    // Users can select organization via query parameter or subdomain when needed
    return <>{children}</>;
};

/**
 * Organization selection page component
 */
export const OrganizationSelectionPage: React.FC = () => {
    const navigate = useNavigate();
    const { userOrganizations, switchToOrganization } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrganizations = async () => {
            try {
                const orgs = await organizationsApi.list();
                setOrganizations(orgs);
            } catch (error) {
                console.error('Error fetching organizations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizations();
    }, []);

    const handleOrganizationSelect = (org: Organization) => {
        // Set organization in localStorage and navigate to dashboard
        localStorage.setItem('dev_organization_id', org.id.toString());
        switchToOrganization(org);
        navigate('/dashboard', { replace: true });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading organizations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                        <Building2 className="h-6 w-6" />
                        Select Organization
                    </CardTitle>
                    <CardDescription>
                        Choose the organization you want to access
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        {organizations.map((org) => (
                            <Card
                                key={org.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleOrganizationSelect(org)}
                            >
                                <CardContent className="p-6">
                                    <div className="text-center">
                                        <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                                        <h3 className="font-semibold text-lg">{org.name}</h3>
                                        {org.address && (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                {org.address}
                                            </p>
                                        )}
                                        <Button className="mt-4 w-full">
                                            Access {org.name}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {organizations.length === 0 && (
                        <div className="text-center py-8">
                            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                No organizations available. Please contact your administrator.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
