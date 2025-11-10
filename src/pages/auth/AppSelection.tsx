import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Calculator, ShoppingCart, ArrowLeft, Package, LogOut, Search, Loader2, Warehouse, Database } from "lucide-react";
import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AppSelection() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
    };

    const handleAppSelection = (app: string) => {
        switch (app) {
            case 'manufacturing':
                navigate('/dashboard');
                break;
            case 'finance':
                navigate('/finance/dashboard');
                break;
            case 'purchase':
                navigate('/purchase/dashboard');
                break;
            case 'shop-admin':
                navigate('/user-admin');
                break;
            case 'inventory':
                navigate('/inventory');
                break;
            case 'search-parts':
                navigate('/search-parts');
                break;
            case 'data':
                navigate('/user-admin/export-history');
                break;
            default:
                break;
        }
    };

    const apps = [
        {
            id: 'manufacturing',
            name: 'Manufacturing',
            icon: Building2,
            color: 'blue',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600',
            hoverBg: 'hover:bg-blue-100'
        },
        {
            id: 'finance',
            name: 'Finance',
            icon: Calculator,
            color: 'green',
            bgColor: 'bg-green-50',
            iconColor: 'text-green-600',
            hoverBg: 'hover:bg-green-100'
        },
        {
            id: 'purchase',
            name: 'Purchase',
            icon: Package,
            color: 'orange',
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-600',
            hoverBg: 'hover:bg-orange-100'
        },
        {
            id: 'shop-admin',
            name: 'Shop Admin',
            icon: ShoppingCart,
            color: 'indigo',
            bgColor: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            hoverBg: 'hover:bg-indigo-100'
        },
        {
            id: 'inventory',
            name: 'Inventory',
            icon: Warehouse,
            color: 'purple',
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600',
            hoverBg: 'hover:bg-purple-100'
        },
        {
            id: 'search-parts',
            name: 'Search Parts',
            icon: Search,
            color: 'indigo',
            bgColor: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            hoverBg: 'hover:bg-indigo-100'
        },
        {
            id: 'data',
            name: 'Data',
            icon: Database,
            color: 'teal',
            bgColor: 'bg-teal-50',
            iconColor: 'text-teal-600',
            hoverBg: 'hover:bg-teal-100'
        }
    ];

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="w-full max-w-5xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-6">
                        <img
                            src="https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/favicon.ico"
                            alt="Nathkrupa Logo"
                            className="h-28 w-44 rounded-lg shadow-lg"
                        />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Nathkrupa Body Builders
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        & Auto Accessories
                    </p>
                    <h2 className="text-2xl font-semibold text-gray-800">
                        Select Application
                    </h2>
                </div>

                {/* App Selection Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8 mb-12">
                    {apps.map((app) => {
                        const IconComponent = app.icon;
                        return (
                            <Card
                                key={app.id}
                                className={`${app.bgColor} ${app.hoverBg} hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg`}
                                onClick={() => handleAppSelection(app.id)}
                            >
                                <CardContent className="p-8 text-center">
                                    <div className="flex justify-center mb-6">
                                        <div className={`p-6 rounded-2xl ${app.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                                            <IconComponent className={`h-12 w-12 ${app.iconColor}`} />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
                                        {app.name}
                                    </h3>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Logout Button */}
                <div className="text-center">
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="flex items-center gap-3 mx-auto px-8 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-all duration-300"
                    >
                        <LogOut className="h-5 w-5" />
                        Logout
                    </Button>
                </div>
            </div>
        </main>
    );
}
