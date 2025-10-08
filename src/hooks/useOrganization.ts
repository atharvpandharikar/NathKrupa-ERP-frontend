import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { organizationsApi, Organization } from '@/lib/api';

export const useOrganization = () => {
    const { activeOrganizationId } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrganization = async () => {
            if (!activeOrganizationId) {
                setOrganization(null);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Fetch all organizations and find the one with matching ID
                const organizations = await organizationsApi.list();
                const activeOrg = organizations.find(org => org.id === activeOrganizationId);

                if (activeOrg) {
                    setOrganization(activeOrg);
                } else {
                    setError('Organization not found');
                }
            } catch (err) {
                console.error('Error fetching organization:', err);
                setError('Failed to fetch organization');
            } finally {
                setLoading(false);
            }
        };

        fetchOrganization();
    }, [activeOrganizationId]);

    return {
        organization,
        organizationName: organization?.name || 'Nathkrupa ERP', // Fallback to default
        loading,
        error
    };
};
