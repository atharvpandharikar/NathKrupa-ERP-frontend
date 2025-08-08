import { NavLink } from "react-router-dom";
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";
import { Home, Users, FileSpreadsheet, Receipt, BarChart3, Settings, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Quotations", url: "/quotations", icon: FileSpreadsheet },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const { toggle } = useTheme();
  const isDark = document.documentElement.classList.contains("dark");
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild>
              <NavLink to={item.url} end className={getNavCls}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-sidebar-foreground">Admin User</div>
              <div className="text-xs text-sidebar-foreground/70">Nathkrupa ERP</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="w-8 h-8 p-0"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
