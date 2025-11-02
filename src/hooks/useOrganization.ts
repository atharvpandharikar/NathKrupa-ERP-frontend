// Simplified useOrganization hook for single-organization setup
export const useOrganization = () => {
    return {
        organization: null,
        organizationName: 'Nathkrupa ERP', // Default organization name
        loading: false,
        error: null
    };
};

