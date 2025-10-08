import { useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";

export const TitleManager = () => {
    const { organizationName } = useOrganization();

    useEffect(() => {
        // Set the base title when the app loads
        document.title = `${organizationName} | Manufacturing Management System`;
    }, [organizationName]);

    return null; // This component doesn't render anything
};
