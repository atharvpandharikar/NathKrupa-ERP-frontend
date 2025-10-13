import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import {
    Home,
    Grid3X3,
    ShoppingBag,
    List,
    Tag,
    Building2,
    ShoppingCart,
    FileText,
    Users,
    MapPin,
    Star,
    Heart,
    Quote,
    Search,
    Car,
    Moon,
    Sun,
    LogOut,
    User as UserIcon,
    Laptop,
    Settings,
    ChevronDown,
    ChevronRight
} from "lucide-react";
import { ThemeMode, useTheme } from "@/hooks/useTheme";
import { authApi, getTokens } from "@/lib/api";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type NavItem = {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    external?: boolean;
    comingSoon?: boolean;
};

type NavGroup = {
    title: string;
    items: NavItem[];
};

const navigationGroups: NavGroup[] = [
    {
        title: "Product Management",
        items: [
            { title: "Products", icon: List, url: "/user-admin/products" },
            { title: "Categories", icon: List, url: "/user-admin/categories" },
            { title: "Tags", icon: Tag, url: "/user-admin/tags" },
            { title: "Brands", icon: Building2, url: "/user-admin/brands" },
        ]
    },
    {
        title: "Order Management",
        items: [
            { title: "Orders", icon: ShoppingCart, url: "/user-admin/orders" },
            { title: "Payments", icon: FileText, url: "/user-admin/payments", comingSoon: true },
        ]
    },
    {
        title: "Customer Management",
        items: [
            { title: "Customers", icon: Users, url: "/user-admin/customers" },
            { title: "Addresses", icon: MapPin, url: "/user-admin/addresses" },
            { title: "Reviews", icon: Star, url: "/user-admin/reviews" },
            { title: "Wishlists", icon: Heart, url: "/user-admin/wishlists" },
        ]
    },
    {
        title: "Vehicle Management",
        items: [
            { title: "Car Makers", icon: Car, url: "/user-admin/car-makers" },
            { title: "Car Models", icon: Car, url: "/user-admin/car-models" },
            { title: "Car Variants", icon: Car, url: "/user-admin/car-variants" },
            { title: "Vehicle Compatibility", icon: Settings, url: "/user-admin/vehicle-compatibility" },
        ]
    },
    {
        title: "Other",
        items: [
            { title: "Quotations", icon: Quote, url: "/user-admin/quotations" },
            { title: "SEO Entries", icon: Search, url: "/user-admin/seo" },
            { title: "Garage Vehicles", icon: Car, url: "/user-admin/garage-vehicles" },
        ]
    }
];

export function ShopAdminSidebar() {
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
        // Position below the button
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

    const isActivePath = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const getNavCls = (path: string, external?: boolean, comingSoon?: boolean) => {
        const isActive = isActivePath(path);
        return cn(
            "h-8 text-[13px]",
            isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "hover:bg-sidebar-accent/50",
            comingSoon && "opacity-50 cursor-not-allowed"
        );
    };

    const handleNavigation = (path: string, external?: boolean) => {
        if (external) {
            window.open(path, '_blank');
        } else {
            navigate(path);
        }
    };

    const renderNavGroups = (groups: NavGroup[]) => (
        <div className="space-y-4">
            {groups.map((group, index) => (
                <div key={index}>
                    <div className="px-2 mb-2">
                        <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                            {group.title}
                        </h3>
                    </div>
                    <div className="space-y-0.5">
                        {group.items.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild disabled={item.comingSoon}>
                                    {item.external ? (
                                        <button
                                            onClick={() => handleNavigation(item.url, item.external)}
                                            className={getNavCls(item.url, item.external, item.comingSoon)}
                                        >
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span>{item.title}</span>
                                        </button>
                                    ) : (
                                        <NavLink
                                            to={item.url}
                                            end
                                            className={getNavCls(item.url, item.external, item.comingSoon)}
                                            onClick={(e) => {
                                                if (item.comingSoon) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        >
                                            <item.icon className="mr-2 h-4 w-4" />
                                            <span className="flex-1">{item.title}</span>
                                            {item.comingSoon && (
                                                <span className="text-[10px] text-sidebar-foreground/50 ml-1">
                                                    Soon
                                                </span>
                                            )}
                                        </NavLink>
                                    )}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </div>
                    {index < groups.length - 1 && (
                        <div className="border-t border-sidebar-border mt-3" />
                    )}
                </div>
            ))}
        </div>
    );

    // Render standalone Home item
    const renderHomeItem = () => (
        <div className="px-2 pb-2">
            <SidebarMenuItem>
                <SidebarMenuButton asChild>
                    <NavLink
                        to="/user-admin"
                        end
                        className={getNavCls("/user-admin", false, false)}
                    >
                        <Home className="mr-2 h-4 w-4" />
                        <span>Home</span>
                    </NavLink>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 min-h-0 px-2 py-2 space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent hover:scrollbar-thumb-sidebar-accent scroll-smooth">
                {renderHomeItem()}
                <div className="border-t border-sidebar-border" />
                {renderNavGroups(navigationGroups)}
            </div>

            {/* Bottom panel: User, Theme (with popover), Logout */}
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

