import { useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
export default function Landing() {
  const { organizationName } = useOrganization();
  useEffect(() => {
    document.title = "Nathkrupa ERP | Landing";
  }, [organizationName]);

  return (
    <main className="max-w-5xl mx-auto py-16">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Welcome to Nathkrupa Manufacturing ERP</h1>
      <p className="text-muted-foreground">Use the sidebar to navigate or start a new quotation.</p>
    </main>
  );
}
