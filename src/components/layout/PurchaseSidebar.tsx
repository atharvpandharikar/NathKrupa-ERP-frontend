import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Home, Users, FileText, CreditCard, BarChart3, Settings, Moon, Sun, LogOut, User as UserIcon, Laptop, ShoppingCart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeMode, useTheme } from "@/hooks/useTheme";
import { authApi, getTokens } from "@/lib/api";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NavItem = {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
};

const purchaseNavItems: NavItem[] = [
    { title: "Dashboard", url: "/purchase/dashboard", icon: Home },
    { title: "Vendors", url: "/purchase/vendors", icon: Users },
    { title: "Purchase Bills", url: "/purchase/bills", icon: FileText },
    { title: "Vendor Payments", url: "/purchase/vendor-payments", icon: CreditCard },
    { title: "Payments", url: "/purchase/payments", icon: FileText },
    { title: "Reports", url: "/purchase/reports", icon: BarChart3 },
    { title: "Settings", url: "/purchase/settings", icon: Settings },
];

export function PurchaseSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setTheme, theme, isDark } = useTheme();
    const [themeOpen, setThemeOpen] = useState(false);
    const themeBtnRef = useRef<HTMLButtonElement | null>(null);
    const popRef = useRef<HTMLDivElement | null>(null);

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

    const renderNavItems = (items: NavItem[]) => (
        <div className="space-y-0.5">
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
    );

    const themeLabel = theme === "dark" ? "Dark Mode" : theme === "system" ? "System" : "Light Mode";

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 min-h-0 px-2 py-2 space-y-3 overflow-y-auto pr-1">
                {/* Purchase Navigation */}
                <div>{renderNavItems(purchaseNavItems)}</div>
                <div className="border-t border-sidebar-border" />
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
                    onClick={() => { if (getTokens()) { authApi.logout(); navigate('/app-selection', { replace: true }); } }}
                    className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-sidebar-accent/50"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                </button>
            </div>
        </div>
    );
}
