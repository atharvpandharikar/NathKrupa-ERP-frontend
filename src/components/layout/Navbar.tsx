import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { useEffect } from "react";

export function Navbar() {
  useEffect(() => {
    // Ensure viewport meta exists
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.setAttribute('name', 'viewport');
      vp.setAttribute('content', 'width=device-width, initial-scale=1');
      document.head.appendChild(vp);
    }
  }, []);

  return (
    <header className="h-12 border-b bg-background flex items-center justify-between px-3">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Link to="/" className="font-semibold">Nathkrupa ERP</Link>
      </div>
      <nav className="text-sm">
        <Link to="/quotations/generate" className="hover:underline">Generate Quote</Link>
      </nav>
    </header>
  );
}
