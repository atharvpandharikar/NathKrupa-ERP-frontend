/**
 * Organization utilities for multi-tenant frontend
 */

export interface OrganizationInfo {
    id: number;
    name: string;
    slug: string;
    address?: string;
    created_at?: string;
    updated_at?: string;
}

export interface OrganizationBranding {
    name: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    favicon?: string;
}

/**
 * Get organization information from subdomain
 */
export const getOrganizationFromSubdomain = (): OrganizationInfo | null => {
    if (typeof window === 'undefined') return null;

    const hostname = window.location.hostname;
    const port = window.location.port;

    // Handle localhost development (both 3000 and 8080 ports)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Check for organization in localStorage for development
        const orgId = localStorage.getItem('dev_organization_id');
        if (orgId) {
            const orgMap: Record<string, OrganizationInfo> = {
                '1': { id: 1, name: 'Tejas test org', slug: 'tej-org' },
                '2': { id: 2, name: 'nathkrupa-1', slug: 'nathkrupa' }
            };
            return orgMap[orgId] || null;
        }
        return null;
    }

    // Extract subdomain from hostname
    const parts = hostname.split('.');
    if (parts.length < 3) return null; // Not a subdomain

    const subdomain = parts[0];

    // Map subdomains to organization info
    const orgMap: Record<string, OrganizationInfo> = {
        'tej-org': { id: 1, name: 'Tejas test org', slug: 'tej-org' },
        'nathkrupa': { id: 2, name: 'nathkrupa-1', slug: 'nathkrupa' },
        'admin': { id: 0, name: 'Admin Panel', slug: 'admin' }
    };

    return orgMap[subdomain] || null;
};

/**
 * Get organization branding configuration
 */
export const getOrganizationBranding = (orgId: number): OrganizationBranding => {
    const branding: Record<number, OrganizationBranding> = {
        1: { // Tejas test org
            name: 'Tejas Body Builder',
            logo: '/logos/tej-org-logo.png',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            favicon: '/favicons/tej-org-favicon.ico'
        },
        2: { // nathkrupa-1
            name: 'Nathkrupa Body Builder',
            logo: '/logos/nathkrupa-logo.png',
            primaryColor: '#059669',
            secondaryColor: '#047857',
            favicon: '/favicons/nathkrupa-favicon.ico'
        },
        0: { // Admin
            name: 'Nathkrupa Admin',
            logo: '/logos/admin-logo.png',
            primaryColor: '#DC2626',
            secondaryColor: '#991B1B',
            favicon: '/favicons/admin-favicon.ico'
        }
    };

    return branding[orgId] || branding[1]; // Default to Tejas
};

/**
 * Check if current subdomain is valid for the user's organizations
 */
export const isValidOrganizationForUser = (
    organization: OrganizationInfo | null,
    userOrganizations: OrganizationInfo[]
): boolean => {
    if (!organization) return false;

    // Admin can access any organization
    if (organization.slug === 'admin') return true;

    // Check if user has access to this organization
    return userOrganizations.some(org => org.id === organization.id);
};

/**
 * Get organization URL for switching
 */
export const getOrganizationUrl = (organization: OrganizationInfo): string => {
    const protocol = window.location.protocol;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
        // For development, use query parameter
        return `${protocol}//${window.location.host}?org=${organization.slug}`;
    }

    // For production, use subdomain
    const baseDomain = window.location.hostname.split('.').slice(-2).join('.');
    return `${protocol}//${organization.slug}.${baseDomain}`;
};

/**
 * Switch to a different organization
 */
export const switchToOrganization = (organization: OrganizationInfo): void => {
    const url = getOrganizationUrl(organization);
    window.location.href = url;
};

/**
 * Get current organization context for API calls
 */
export const getCurrentOrganizationContext = (): { organization_id: number } | null => {
    const organization = getOrganizationFromSubdomain();
    if (!organization) return null;

    return { organization_id: organization.id };
};

/**
 * Check if user is accessing admin panel
 */
export const isAdminAccess = (): boolean => {
    const organization = getOrganizationFromSubdomain();
    return organization?.slug === 'admin' || false;
};

/**
 * Get organization display name
 */
export const getOrganizationDisplayName = (organization: OrganizationInfo | null): string => {
    if (!organization) return 'Unknown Organization';
    return organization.name;
};

/**
 * Get organization slug for URL generation
 */
export const getOrganizationSlug = (organization: OrganizationInfo | null): string => {
    if (!organization) return 'unknown';
    return organization.slug;
};

/**
 * Validate organization access
 */
export const validateOrganizationAccess = (
    organization: OrganizationInfo | null,
    userOrganizations: OrganizationInfo[],
    isSuperuser: boolean = false
): { hasAccess: boolean; reason?: string } => {
    if (!organization) {
        return { hasAccess: false, reason: 'No organization specified' };
    }

    // Superuser can access any organization
    if (isSuperuser) {
        return { hasAccess: true };
    }

    // Check if user has access to this organization
    const hasAccess = userOrganizations.some(org => org.id === organization.id);

    if (!hasAccess) {
        return {
            hasAccess: false,
            reason: `You don't have access to ${organization.name}`
        };
    }

    return { hasAccess: true };
};
