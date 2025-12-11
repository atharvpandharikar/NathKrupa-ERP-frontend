import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarInset } from "@/components/ui/sidebar";
import { FinanceSidebar } from "./FinanceSidebar";
import { Navbar } from "./Navbar";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function FinanceLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useLocalStorage<boolean>("nk:sidebar-open", true);

    return (
        <SidebarProvider open={open} onOpenChange={setOpen}>
            <div className="flex w-full min-h-screen">
                <Sidebar collapsible="icon" variant="inset">
                    <SidebarContent>
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
                                    <span className="text-black">Finance ERP</span>
                                </button>
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <FinanceSidebar />
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>

                <SidebarInset>
                    <Navbar />
                    <div className="pt-4 md:pt-6 px-4 md:px-6">
                        <Outlet />
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
