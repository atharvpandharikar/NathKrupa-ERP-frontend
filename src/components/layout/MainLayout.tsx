import { Outlet } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Navbar } from "./Navbar";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function MainLayout() {
  const [open, setOpen] = useLocalStorage<boolean>("nk:sidebar-open", true);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <div className="flex w-full min-h-screen">
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

        <SidebarInset>
          <Navbar />
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
