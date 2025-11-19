import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Home, Users, FileSpreadsheet, BarChart3, Settings, Moon, Sun, LogOut, Layers, IndianRupee, Tags, Car, Factory, User as UserIcon, Laptop, Clock, Play, CheckCircle, X, ChevronDown, ChevronRight, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeMode, useTheme } from "@/hooks/useTheme";
import { getTokens, workOrdersApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavItem[];
  count?: number;
};

const group2: NavItem[] = [
  { title: "Feature Categories", url: "/features/categories", icon: Tags },
  { title: "Feature Types", url: "/features/types", icon: Layers },
  { title: "Feature Images", url: "/features/images", icon: Tags },
];

const group3: NavItem[] = [
  { title: "Vehicle Types", url: "/vehicles/types", icon: Layers },
  { title: "Vehicle Makers", url: "/vehicles/makers", icon: Factory },
  { title: "Vehicle Models", url: "/vehicles/models", icon: Car },
];

const group4: NavItem[] = [
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { setTheme, theme, isDark } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(["Work Orders"]));
  const themeBtnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Auto-expand Work Orders if we're on a work order page
  useEffect(() => {
    if (location.pathname.includes('/work-orders')) {
      setExpandedMenus(prev => new Set([...prev, "Work Orders"]));
    }
  }, [location.pathname]);

  // ROOT CAUSE FIX: Use lightweight counts endpoint instead of fetching all work orders
  // This reduces API response size by ~99% and database load significantly
  // Only fetches counts, not full work order records
  const { data: workOrderCounts } = useQuery({
    queryKey: ["work-order-counts"],
    queryFn: () => workOrdersApi.counts(),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 300000, // Consider data fresh for 5 minutes
  });

  // Provide default values if counts are not loaded yet
  const counts = workOrderCounts || {
    total: 0,
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };

  const group1: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Quotations", url: "/quotations", icon: FileSpreadsheet },
    {
      title: "Work Orders",
      url: "/work-orders",
      icon: Layers,
      subItems: [
        { title: "All Orders", url: "/work-orders", icon: Layers, count: counts.total },
        { title: "Upcoming Orders", url: "/work-orders?status=upcoming", icon: Clock, count: counts.scheduled },
        { title: "Inprocess Orders", url: "/work-orders?status=inprocess", icon: Play, count: counts.in_progress },
        { title: "Completed Orders", url: "/work-orders?status=completed", icon: CheckCircle, count: counts.completed },
        { title: "Cancelled Orders", url: "/work-orders?status=cancelled", icon: X, count: counts.cancelled },
      ]
    },
    { title: "Bills", url: "/bills", icon: FileText },
    { title: "Customers", url: "/dashboard/customers", icon: Users },
    { title: "Feature Prices", url: "/features/prices", icon: IndianRupee },
  ];

  // Inject minimal CSS for popover positioning once
  useEffect(() => {
    const id = "nk-theme-popover-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `.nk-theme-popover{position:fixed;top:var(--nk-theme-popover-top,0px);left:var(--nk-theme-popover-left,0px);}`;
    document.head.appendChild(style);
  }, []);

  const updatePosition = () => {
    const btn = themeBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 8;
    const estimatedWidth = 224; // ~ w-56
    // Position below the button (like 90% zoom) instead of to the right
    let left = rect.left;
    let top = rect.bottom + gap;

    // Ensure popup stays within viewport
    if (left + estimatedWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - estimatedWidth - 8);
    }

    document.documentElement.style.setProperty("--nk-theme-popover-top", `${top}px`);
    document.documentElement.style.setProperty("--nk-theme-popover-left", `${left}px`);
  };

  useEffect(() => {
    if (!themeOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current && !popRef.current.contains(t) && themeBtnRef.current && !themeBtnRef.current.contains(t)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [themeOpen]);

  useLayoutEffect(() => {
    if (!themeOpen) return;
    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [themeOpen]);

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    (isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
      : "hover:bg-sidebar-accent/50") +
    " h-8 text-[13px]";

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const renderGroup = (items: NavItem[]) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isExpanded = expandedMenus.has(item.title);
        const hasSubItems = item.subItems && item.subItems.length > 0;

        return (
          <div key={item.title}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                {hasSubItems ? (
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={`w-full flex items-center justify-between ${getNavCls({ isActive: location.pathname === item.url && !location.search })}`}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                ) : (
                  <NavLink to={item.url} end className={getNavCls}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Render sub-items if expanded */}
            {hasSubItems && isExpanded && (
              <div className="ml-6 mt-1 space-y-0.5">
                {item.subItems!.map((subItem) => {
                  const isSubActive = location.pathname === '/work-orders' &&
                    ((subItem.url === '/work-orders' && !location.search) ||
                      (location.search && location.search.includes(subItem.url.split('status=')[1])));

                  return (
                    <SidebarMenuItem key={subItem.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={subItem.url}
                          className={cn(
                            "h-8 text-[12px] pl-2 flex items-center",
                            isSubActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                          )}
                        >
                          <subItem.icon className="mr-2 h-3 w-3" />
                          <span>{subItem.title}</span>
                          {subItem.count !== undefined && (
                            <span className="ml-auto text-xs bg-sidebar-accent rounded-full px-1.5 py-0.5">
                              {subItem.count}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const themeLabel = theme === "dark" ? "Dark Mode" : theme === "system" ? "System" : "Light Mode";

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 px-2 py-2 space-y-3 overflow-y-auto pr-1">
        {/* Group 1 */}
        <div>{renderGroup(group1)}</div>
        <div className="border-t border-sidebar-border" />

        {/* Group 2 */}
        <div>{renderGroup(group2)}</div>
        <div className="border-t border-sidebar-border" />

        {/* Group 3 */}
        <div>{renderGroup(group3)}</div>
        <div className="border-t border-sidebar-border" />

        {/* Group 4 */}
        <div>{renderGroup(group4)}</div>
      </div>

      {/* Bottom panel: User, Theme (with popover), Logout */}
      <div className="p-3 border-t border-sidebar-border space-y-2 shrink-0">
        {/* User section (no heading) */}
        <button className="w-full flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-3 py-2 text-left text-sm hover:bg-sidebar-accent/50" disabled>
          <UserIcon className="w-4 h-4" />
          <span>User</span>
        </button>

        {/* Theme row with popover */}
        <div className="relative">
          <button
            ref={themeBtnRef}
            className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent/50"
            onClick={() => setThemeOpen(v => !v)}
            aria-haspopup="menu"
          >
            <span className="flex items-center gap-2 text-sm"><Sun className="w-4 h-4" /> Theme</span>
            <span className="text-sidebar-foreground/70">•••</span>
          </button>
          {themeOpen && createPortal(
            <div ref={popRef} role="menu" aria-label="Select Theme" className="nk-theme-popover z-50 w-56 rounded-md border border-border bg-popover shadow-md">
              <div className="px-3 py-2 text-sm font-medium">Select Theme</div>
              <div
                role="menuitem"
                tabIndex={0}
                onClick={() => { setTheme("light"); setThemeOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTheme("light"); setThemeOpen(false); } }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${theme === "light" ? "bg-accent" : ""}`}
              >
                <span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Light</span>
                {theme === "light" && <span>✓</span>}
              </div>
              <div
                role="menuitem"
                tabIndex={0}
                onClick={() => { setTheme("dark"); setThemeOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTheme("dark"); setThemeOpen(false); } }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${theme === "dark" ? "bg-accent" : ""}`}
              >
                <span className="flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</span>
                {theme === "dark" && <span>✓</span>}
              </div>
              <div
                role="menuitem"
                tabIndex={0}
                onClick={() => { setTheme("system"); setThemeOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTheme("system"); setThemeOpen(false); } }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${theme === "system" ? "bg-accent" : ""}`}
              >
                <span className="flex items-center gap-2"><Laptop className="w-4 h-4" /> System</span>
                {theme === "system" && <span>✓</span>}
              </div>
            </div>,
            document.body
          )}
        </div>

        <div className="border-t border-sidebar-border" />
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
