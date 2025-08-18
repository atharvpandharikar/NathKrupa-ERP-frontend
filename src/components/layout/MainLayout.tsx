import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Navbar } from "./Navbar";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function MainLayout() {
  const location = useLocation();
  const [open, setOpen] = useLocalStorage<boolean>("nk:sidebar-open", true);
  
  // Hide sidebar for quote generation page, but keep navbar
  const shouldHideSidebar = location.pathname === '/quotations/generate';
  const sidebarOpen = shouldHideSidebar ? false : open;

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={shouldHideSidebar ? undefined : setOpen}>
      <div className="flex w-full min-h-screen">
        {!shouldHideSidebar && (
          <Sidebar collapsible="icon" variant="inset">
            <SidebarContent className="overflow-visible">
              <SidebarGroup>
                <SidebarGroupLabel>
                  <span className="inline-flex items-center gap-2">
                    <img
                      src="https://shop-nathkrupabody.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder+(1).ico"
                      alt="Nathkrupa"
                      className="h-4 w-4"
                    />
                    <span>Nathkrupa ERP</span>
                  </span>
                </SidebarGroupLabel>
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
          <Navbar />
          <div className={shouldHideSidebar ? "pt-4 md:pt-6 px-4 md:px-6 w-full" : "pt-4 md:pt-6 px-4 md:px-6"}>
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
