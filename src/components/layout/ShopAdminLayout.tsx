import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from "@/components/ui/button";
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
    ChevronDown,
    Menu,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ShopAdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const navigationItems = [
        {
            title: "Platform",
            items: [
                { name: "Home", icon: Home, path: "/user-admin" },
                { name: "Add Category", icon: Grid3X3, path: "/user-admin/categories/add" },
                { name: "Visit Shop", icon: ShoppingBag, path: "/", external: true },
            ]
        },
        {
            title: "Product Management",
            items: [
                { name: "Products", icon: List, path: "/user-admin/products" },
                { name: "Categories", icon: List, path: "/user-admin/categories" },
                { name: "Tags", icon: Tag, path: "/user-admin/tags" },
                { name: "Brands", icon: Building2, path: "/user-admin/brands" },
            ]
        },
        {
            title: "Order Management",
            items: [
                { name: "Orders", icon: ShoppingCart, path: "/user-admin/orders" },
                { name: "Payments", icon: FileText, path: "/user-admin/payments", comingSoon: true },
            ]
        },
        {
            title: "Customer Management",
            items: [
                { name: "Customers", icon: Users, path: "/user-admin/customers", comingSoon: true },
                { name: "Addresses", icon: MapPin, path: "/user-admin/addresses" },
                { name: "Reviews", icon: Star, path: "/user-admin/reviews" },
                { name: "Wishlists", icon: Heart, path: "/user-admin/wishlists" },
            ]
        },
        {
            title: "Vehicle Management",
            items: [
                { name: "Car Makers", icon: Car, path: "/user-admin/car-makers" },
                { name: "Car Models", icon: Car, path: "/user-admin/car-models" },
                { name: "Car Variants", icon: Car, path: "/user-admin/car-variants" },
            ]
        },
        {
            title: "Other",
            items: [
                { name: "Quotations", icon: Quote, path: "/user-admin/quotations" },
                { name: "SEO Entries", icon: Search, path: "/user-admin/seo" },
                { name: "Garage Vehicles", icon: Car, path: "/user-admin/garage-vehicles" },
            ]
        }
    ];

    const handleNavigation = (path: string, external = false) => {
        if (external) {
            window.open(path, '_blank');
        } else {
            navigate(path);
        }
    };

    const isActivePath = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <div className={`h-screen flex ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
            {/* Mobile Header */}
            <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between absolute top-0 left-0 right-0 z-50">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Shop Nathkrupa Body</h1>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2"
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
            </div>

            {/* Sidebar */}
            <div className={cn(
                "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full",
                "lg:pt-0 pt-16" // Add top padding on mobile to account for header
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h1 className="text-sm font-bold text-gray-900 dark:text-white">Shop Nathkrupa Body</h1>
                    </div>

                    {/* Navigation - Scrollable */}
                    <nav className="flex-1 overflow-y-auto p-3 space-y-3">
                        {navigationItems.map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    {section.title}
                                </h3>
                                <ul className="space-y-0.5">
                                    {section.items.map((item, itemIndex) => (
                                        <li key={itemIndex}>
                                            <Button
                                                variant={isActivePath(item.path) ? "default" : "ghost"}
                                                className={cn(
                                                    "w-full justify-start text-left h-8 px-2 text-xs",
                                                    isActivePath(item.path)
                                                        ? "bg-purple-600 text-white hover:bg-purple-700"
                                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                )}
                                                onClick={() => handleNavigation(item.path, item.external)}
                                                disabled={item.comingSoon}
                                            >
                                                <item.icon className="w-3 h-3 mr-2" />
                                                <span className="flex-1">{item.name}</span>
                                                {item.comingSoon && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                                        Coming Soon
                                                    </span>
                                                )}
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>

                    {/* User Profile */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                N
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-gray-900 dark:text-white">Welcome Nathkrupa!</p>
                            </div>
                            <Button variant="ghost" size="sm" className="p-1">
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 lg:ml-0 ml-0">
                {/* Top Bar */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0 lg:block hidden">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Home &gt; {location.pathname.split('/').pop()?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard'}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2"
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>

                {/* Page Content - Scrollable */}
                <main className="flex-1 overflow-y-auto p-4 lg:pt-4 pt-20">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}
