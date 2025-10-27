import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarInset } from "@/components/ui/sidebar";
import { Navbar } from "./Navbar";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useOrganization } from "@/hooks/useOrganization";
import { NavLink } from "react-router-dom";
import {
    Home,
    Warehouse,
    Package,
    MapPin,
    BarChart3,
    Settings,
    Moon,
    Sun,
    LogOut,
    User as UserIcon,
    Layers,
    TrendingUp,
    AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeMode, useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NavItem = {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
};

const inventoryNavItems: NavItem[] = [
    { title: "Dashboard", url: "/inventory", icon: Home },
    { title: "Warehouses", url: "/inventory/warehouses", icon: Warehouse },
    { title: "Racks", url: "/inventory/racks", icon: Layers },
    { title: "Inventory Entries", url: "/inventory/entries", icon: Package },
    { title: "Units", url: "/inventory/units", icon: MapPin },
    { title: "Low Stock Alert", url: "/inventory/low-stock", icon: AlertTriangle },
    { title: "Reports", url: "/inventory/reports", icon: BarChart3 },
];

const settingsItems: NavItem[] = [
    { title: "Settings", url: "/inventory/settings", icon: Settings },
];

export default function InventoryLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useLocalStorage<boolean>("nk:inventory-sidebar-open", true);
    const { organizationName } = useOrganization();
    const { logout } = useAuth();
    const { setTheme, theme } = useTheme();
    const [themeOpen, setThemeOpen] = useState(false);
    const themeBtnRef = useRef<HTMLButtonElement | null>(null);
    const popRef = useRef<HTMLDivElement | null>(null);

    // Inject minimal CSS for popover positioning
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
        const estimatedWidth = 224;
        let left = rect.left;
        let top = rect.bottom + gap;

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

    const renderGroup = (items: NavItem[]) => (
        <div className="space-y-0.5">
            {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                        <NavLink to={item.url} end={item.url === "/inventory"} className={getNavCls}>
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </NavLink>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </div>
    );

    return (
        <SidebarProvider open={open} onOpenChange={setOpen}>
            <div className="flex w-full min-h-screen">
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
                                    <div className="flex h-full flex-col">
                                        <div className="flex-1 min-h-0 px-2 py-2 space-y-3 overflow-y-auto pr-1">
                                            {/* Main Navigation */}
                                            <div>{renderGroup(inventoryNavItems)}</div>
                                            <div className="border-t border-sidebar-border" />

                                            {/* Settings */}
                                            <div>{renderGroup(settingsItems)}</div>
                                        </div>

                                        {/* Bottom panel: User, Theme, Logout */}
                                        <div className="p-3 border-t border-sidebar-border space-y-2 shrink-0">
                                            {/* User section */}
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
                                                            <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> System</span>
                                                            {theme === "system" && <span>✓</span>}
                                                        </div>
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>

                                            {/* Logout */}
                                            <button
                                                onClick={logout}
                                                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent/50 text-red-600 hover:bg-red-50"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    </div>
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

