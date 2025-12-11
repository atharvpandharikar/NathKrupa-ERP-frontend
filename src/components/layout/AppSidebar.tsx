import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Home, Users, FileSpreadsheet, BarChart3, Settings, Layers, IndianRupee, Tags, Car, Factory, Clock, Play, CheckCircle, X, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workOrdersApi } from "@/lib/api";
import { useEffect, useState } from "react";
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

  
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(["Work Orders"]));

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
    </div>
  );
}
