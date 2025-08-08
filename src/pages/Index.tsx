import { Link } from "react-router-dom";

const Index = () => {
  // Basic SEO
  document.title = "Nathkrupa Manufacturing ERP | Landing";
  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = window.location.href;
  if (!document.querySelector('link[rel="canonical"]')) document.head.appendChild(canonical);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <section className="text-center space-y-6 p-8">
        <h1 className="text-3xl md:text-5xl font-bold">Nathkrupa Manufacturing ERP</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Streamlined quotations, billing and reports for vehicle manufacturing.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/dashboard" className="px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            Go to Dashboard
          </Link>
          <Link to="/quotations/generate" className="px-6 py-3 rounded-md border border-input bg-background hover:bg-accent">
            Generate Quotation
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Index;
