import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Navbar } from "./Navbar";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useOrganization } from "@/hooks/useOrganization";

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useLocalStorage<boolean>("nk:sidebar-open", true);
  const { organizationName } = useOrganization();

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
                  <button
                    onClick={() => navigate('/app-selection')}
                    className="inline-flex items-center gap-2 hover:bg-sidebar-accent/50 rounded-md px-2 py-1 transition-colors cursor-pointer"
                  >
                    <img
                      src="https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/favicon.ico"
                      alt="Nathkrupa"
                      className="h-8 w-12"
                    />
                    <span className="text-black">{organizationName}</span>
                  </button>
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
