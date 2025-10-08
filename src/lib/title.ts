import React from "react";
import { useOrganization } from "@/hooks/useOrganization";

export const useDocumentTitle = (pageTitle: string) => {
    const { organizationName } = useOrganization();

    // Update document title when organization name or page title changes
    React.useEffect(() => {
        document.title = `${pageTitle} | ${organizationName}`;
    }, [pageTitle, organizationName]);
};

// Utility function to set title without hook
export const setDocumentTitle = (pageTitle: string, organizationName: string = 'Nathkrupa ERP') => {
    document.title = `${pageTitle} | ${organizationName}`;
};
