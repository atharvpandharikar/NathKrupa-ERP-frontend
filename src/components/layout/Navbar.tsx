import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";

export function Navbar() {
  const location = useLocation();
  const { organizationName } = useOrganization();

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

  const breadcrumb = useMemo(() => {
    const path = location.pathname || '/';
    if (path === '/' || path === '') return 'Dashboard';
    const segments = path.split('/').filter(Boolean);
    const map: Record<string, string> = {
      quotations: 'Quotations',
      generate: 'Generate Quote',
      bills: 'Bills',
      dashboard: 'Dashboard',
      settings: 'Settings',
      features: 'Features',
      reports: 'Reports',
      vehicles: 'Vehicles',
      'user-admin': 'Shop Admin',
      products: 'Products',
      categories: 'Categories',
      orders: 'Orders',
      brands: 'Brands',
      tags: 'Tags',
      'car-makers': 'Car Makers',
      'car-models': 'Car Models',
      'car-variants': 'Car Variants',
      'vehicle-compatibility': 'Vehicle Compatibility',
      addresses: 'Addresses',
      reviews: 'Reviews',
      wishlists: 'Wishlists',
      seo: 'SEO Entries',
      'garage-vehicles': 'Garage Vehicles',
      add: 'Add',
      edit: 'Edit',
      view: 'View'
    };
    return segments.map((seg, i) => {
      if (/^\d+$/.test(seg)) return `#${seg}`; // numeric id
      return map[seg] || (seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '));
    }).join(' / ');
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 h-12 border-b bg-background/95 backdrop-blur flex items-center justify-between px-3">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger />
        <Link to="/app-selection" className="font-semibold flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
          <img
            src="https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/favicon.ico"
            alt="Nathkrupa"
            className="h-8 w-12"
          />
          <span className="text-black">{organizationName}</span>
        </Link>
        <div className="text-xs sm:text-sm text-muted-foreground truncate">
          / <Link to="/app-selection" className="hover:underline">{breadcrumb.split(' / ')[0]}</Link>
          {breadcrumb.split(' / ').slice(1).map((crumb, i) => (
            <span key={i}> / {crumb}</span>
          ))}
        </div>
      </div>
      <nav className="flex items-center gap-3 text-sm">
        <Link to="/quotations/generate" className="hover:underline whitespace-nowrap">Generate Quote</Link>
      </nav>
    </header>
  );
}
