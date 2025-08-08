import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Navbar } from "./Navbar";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function MainLayout() {
  const location = useLocation();
  const [open, setOpen] = useLocalStorage<boolean>("nk:sidebar-open", true);
  
  // Hide sidebar for quote generation page
  const shouldHideSidebar = location.pathname === '/quotations/generate';
  const sidebarOpen = shouldHideSidebar ? false : open;

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={shouldHideSidebar ? undefined : setOpen}>
      <div className="flex w-full min-h-screen">
        {!shouldHideSidebar && (
          <Sidebar collapsible="icon" variant="inset">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Nathkrupa ERP</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <AppSidebar />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        )}

        <SidebarInset className={shouldHideSidebar ? "w-full" : ""}>
          {!shouldHideSidebar && <Navbar />}
          <div className={shouldHideSidebar ? "p-4 md:p-6 w-full" : "p-4 md:p-6"}>
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
