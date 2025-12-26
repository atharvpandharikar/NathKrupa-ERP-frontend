import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Building2, 
    Calculator, 
    ShoppingCart, 
    Package, 
    LogOut, 
    Search, 
    Warehouse, 
    Database,
    ArrowRight,
    LayoutGrid
} from "lucide-react";
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from "@/lib/utils";

interface AppOption {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string; // Tailwind text color class
    bgColor: string; // Tailwind bg color class
    path: string;
}

export default function AppSelection() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
    };

    const handleAppSelection = (path: string) => {
        navigate(path);
    };

    const apps: AppOption[] = [
        {
            id: 'manufacturing',
            name: 'Manufacturing',
            description: 'Manage production, work orders & bills',
            icon: Building2,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100/50',
            path: '/dashboard'
        },
        {
            id: 'shop-admin',
            name: 'Shop Admin',
            description: 'Product catalog, customers & orders',
            icon: ShoppingCart,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100/50',
            path: '/user-admin'
        },
        {
            id: 'inventory',
            name: 'Inventory',
            description: 'Stock levels, warehouses & transfers',
            icon: Warehouse,
            color: 'text-violet-600',
            bgColor: 'bg-violet-100/50',
            path: '/inventory'
        },
        {
            id: 'finance',
            name: 'Finance',
            description: 'Accounts, transactions & ledgers',
            icon: Calculator,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100/50',
            path: '/finance/dashboard'
        },
        {
            id: 'purchase',
            name: 'Purchase',
            description: 'Vendor management & purchase bills',
            icon: Package,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100/50',
            path: '/purchase/dashboard'
        },
        {
            id: 'search-parts',
            name: 'Search Parts',
            description: 'Find vehicle parts quickly',
            icon: Search,
            color: 'text-pink-600',
            bgColor: 'bg-pink-100/50',
            path: '/search-parts'
        },
        {
            id: 'data',
            name: 'Data Management',
            description: 'Export history & analytics',
            icon: Database,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-100/50',
            path: '/user-admin/export-history'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-900">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <img
                        src="https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/favicon.ico"
                        alt="Nathkrupa Logo"
                        className="h-10 w-16 object-contain"
                    />
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 leading-tight">Nathkrupa ERP</h1>
                        <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Enterprise Suite</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        System Operational
                    </div>
                    <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleLogout}
                        className="text-slate-600 hover:text-red-600 hover:bg-red-50 gap-2 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-6 py-8 md:py-12 max-w-7xl">
                
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-500 mt-2 text-lg">Select a module to continue your work.</p>
                    </div>
                    <div className="hidden md:block">
                        <Button variant="outline" className="gap-2 cursor-default text-slate-500 hover:bg-transparent">
                            <LayoutGrid className="h-4 w-4" />
                             {apps.length} Modules Available
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {apps.map((app) => {
                        const IconComponent = app.icon;
                        return (
                            <div 
                                key={app.id} 
                                onClick={() => handleAppSelection(app.path)}
                                className="group relative bg-white rounded-xl border border-slate-200 p-6 cursor-pointer hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 ease-in-out flex flex-col justify-between h-48"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={cn("p-3 rounded-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", app.bgColor)}>
                                            <IconComponent className={cn("h-6 w-6", app.color)} />
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 -mr-2 -mt-2">
                                            <div className="bg-slate-50 p-1.5 rounded-full text-slate-400">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-primary transition-colors">
                                        {app.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                        {app.description}
                                    </p>
                                </div>

                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-slate-400 text-sm">
                <p>&copy; {new Date().getFullYear()} Nathkrupa Body Builders & Auto Accessories. All rights reserved.</p>
            </footer>
        </div>
    );
}
