/**
 * Organization branding utilities
 */

import { OrganizationBranding } from './organization';
import { Organization } from './api';

/**
 * Get organization branding configuration
 */
export function getOrganizationBranding(organization: Organization | null): OrganizationBranding {
    if (!organization) {
        return {
            name: 'Default Organization',
            logo: '/logos/default-logo.png',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            favicon: '/favicons/default-favicon.ico'
        };
    }

    const lowerName = organization.name.toLowerCase();

    if (lowerName.includes('tejas test org')) {
        return {
            name: 'Tejas Body Builder',
            logo: '/logos/tej-org-logo.png',
            primaryColor: '#3B82F6',
            secondaryColor: '#1E40AF',
            favicon: '/favicons/tej-org-favicon.ico'
        };
    } else if (lowerName.includes('nathkrupa-1')) {
        return {
            name: 'Nathkrupa Body Builder',
            logo: '/logos/nathkrupa-logo.png',
            primaryColor: '#059669',
            secondaryColor: '#047857',
            favicon: '/favicons/nathkrupa-favicon.ico'
        };
    }

    // Default branding if no specific match
    return {
        name: organization.name,
        logo: '/logos/default-logo.png',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        favicon: '/favicons/default-favicon.ico'
    };
}

/**
 * Apply organization branding to the document
 */
export const applyOrganizationBranding = (branding: OrganizationBranding): void => {
    if (typeof document === 'undefined') return;

    // Update document title
    document.title = `${branding.name} - ERP System`;

    // Update favicon
    if (branding.favicon) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
            favicon.href = branding.favicon;
        } else {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'icon';
            newFavicon.href = branding.favicon;
            document.head.appendChild(newFavicon);
        }
    }

    // Update CSS custom properties for theming
    const root = document.documentElement;
    root.style.setProperty('--org-primary-color', branding.primaryColor);
    root.style.setProperty('--org-secondary-color', branding.secondaryColor);
    root.style.setProperty('--org-name', `"${branding.name}"`);

    // Add organization class to body for CSS targeting
    document.body.className = document.body.className
        .replace(/org-\w+/g, '') // Remove existing org classes
        .trim();
    document.body.classList.add(`org-${branding.name.toLowerCase().replace(/\s+/g, '-')}`);
};

/**
 * Get CSS variables for organization branding
 */
export const getOrganizationCSSVariables = (branding: OrganizationBranding): Record<string, string> => {
    return {
        '--org-primary-color': branding.primaryColor,
        '--org-secondary-color': branding.secondaryColor,
        '--org-name': `"${branding.name}"`,
        '--org-logo': `url("${branding.logo}")`
    };
};

/**
 * Generate organization-specific theme configuration
 */
export const generateOrganizationTheme = (branding: OrganizationBranding) => {
    return {
        colors: {
            primary: {
                50: lightenColor(branding.primaryColor, 0.9),
                100: lightenColor(branding.primaryColor, 0.8),
                200: lightenColor(branding.primaryColor, 0.6),
                300: lightenColor(branding.primaryColor, 0.4),
                400: lightenColor(branding.primaryColor, 0.2),
                500: branding.primaryColor,
                600: darkenColor(branding.primaryColor, 0.2),
                700: darkenColor(branding.primaryColor, 0.4),
                800: darkenColor(branding.primaryColor, 0.6),
                900: darkenColor(branding.primaryColor, 0.8),
            },
            secondary: {
                50: lightenColor(branding.secondaryColor, 0.9),
                100: lightenColor(branding.secondaryColor, 0.8),
                200: lightenColor(branding.secondaryColor, 0.6),
                300: lightenColor(branding.secondaryColor, 0.4),
                400: lightenColor(branding.secondaryColor, 0.2),
                500: branding.secondaryColor,
                600: darkenColor(branding.secondaryColor, 0.2),
                700: darkenColor(branding.secondaryColor, 0.4),
                800: darkenColor(branding.secondaryColor, 0.6),
                900: darkenColor(branding.secondaryColor, 0.8),
            }
        },
        branding: {
            name: branding.name,
            logo: branding.logo,
            favicon: branding.favicon
        }
    };
};

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
        (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
        (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
}

/**
 * Get organization-specific meta tags
 */
export const getOrganizationMetaTags = (branding: OrganizationBranding) => {
    return {
        title: `${branding.name} - ERP System`,
        description: `Professional ERP system for ${branding.name}`,
        keywords: `ERP, ${branding.name}, business management, manufacturing`,
        ogTitle: `${branding.name} - ERP System`,
        ogDescription: `Professional ERP system for ${branding.name}`,
        ogImage: branding.logo,
        twitterCard: 'summary_large_image',
        twitterTitle: `${branding.name} - ERP System`,
        twitterDescription: `Professional ERP system for ${branding.name}`,
        twitterImage: branding.logo
    };
};

/**
 * Update meta tags for organization branding
 */
export const updateOrganizationMetaTags = (branding: OrganizationBranding): void => {
    if (typeof document === 'undefined') return;

    const metaTags = getOrganizationMetaTags(branding);

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: string) => {
        const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
        let meta = document.querySelector(selector) as HTMLMetaElement;

        if (!meta) {
            meta = document.createElement('meta');
            if (property) {
                meta.setAttribute('property', property);
            } else {
                meta.setAttribute('name', name);
            }
            document.head.appendChild(meta);
        }

        meta.setAttribute('content', content);
    };

    // Update standard meta tags
    updateMetaTag('description', metaTags.description);
    updateMetaTag('keywords', metaTags.keywords);

    // Update Open Graph tags
    updateMetaTag('', metaTags.ogTitle, 'og:title');
    updateMetaTag('', metaTags.ogDescription, 'og:description');
    updateMetaTag('', metaTags.ogImage, 'og:image');

    // Update Twitter Card tags
    updateMetaTag('', metaTags.twitterCard, 'twitter:card');
    updateMetaTag('', metaTags.twitterTitle, 'twitter:title');
    updateMetaTag('', metaTags.twitterDescription, 'twitter:description');
    updateMetaTag('', metaTags.twitterImage, 'twitter:image');
};
