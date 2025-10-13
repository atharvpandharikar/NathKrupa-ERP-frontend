import React from 'react';
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Package,
    ShoppingCart,
    Users,
    BarChart3,
    Settings,
    FileText,
    Car,
    Tag,
    Star,
    MapPin,
    Heart,
    Quote,
    Search,
    Building2,
    TrendingUpIcon,
    TrendingDownIcon
} from "lucide-react";

export default function UserAdminDashboard() {
    const navigate = useNavigate();

    const handleNavigation = (path: string) => {
        navigate(path);
    };

    const adminSections = [
        {
            id: 'products',
            title: 'Product Management',
            description: 'Manage products, inventory, and pricing',
            icon: Package,
            color: 'blue',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600',
            hoverBg: 'hover:bg-blue-100',
            path: '/user-admin/products',
            stats: { value: '1,234', change: '+12.5%', trend: 'up' }
        },
        {
            id: 'categories',
            title: 'Category Management',
            description: 'Organize products by categories',
            icon: FileText,
            color: 'green',
            bgColor: 'bg-green-50',
            iconColor: 'text-green-600',
            hoverBg: 'hover:bg-green-100',
            path: '/user-admin/categories',
            stats: { value: '45', change: '+5.2%', trend: 'up' }
        },
        {
            id: 'orders',
            title: 'Order Management',
            description: 'Track and manage customer orders',
            icon: ShoppingCart,
            color: 'purple',
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600',
            hoverBg: 'hover:bg-purple-100',
            path: '/user-admin/orders',
            stats: { value: '567', change: '-2.1%', trend: 'down' }
        },
        {
            id: 'customers',
            title: 'Customer Management',
            description: 'Manage customer accounts and data',
            icon: Users,
            color: 'orange',
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-600',
            hoverBg: 'hover:bg-orange-100',
            path: '/user-admin/customers',
            stats: { value: '2,890', change: '+8.3%', trend: 'up' }
        },
        {
            id: 'brands',
            title: 'Brand Management',
            description: 'Manage product brands and manufacturers',
            icon: Building2,
            color: 'indigo',
            bgColor: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            hoverBg: 'hover:bg-indigo-100',
            path: '/user-admin/brands',
            stats: { value: '78', change: '+3.1%', trend: 'up' }
        },
        {
            id: 'vehicles',
            title: 'Vehicle Management',
            description: 'Manage car makers, models, and variants',
            icon: Car,
            color: 'teal',
            bgColor: 'bg-teal-50',
            iconColor: 'text-teal-600',
            hoverBg: 'hover:bg-teal-100',
            path: '/user-admin/vehicles',
            stats: { value: '156', change: '+1.8%', trend: 'up' }
        },
        {
            id: 'tags',
            title: 'Tag Management',
            description: 'Organize products with tags',
            icon: Tag,
            color: 'pink',
            bgColor: 'bg-pink-50',
            iconColor: 'text-pink-600',
            hoverBg: 'hover:bg-pink-100',
            path: '/user-admin/tags',
            stats: { value: '234', change: '+6.7%', trend: 'up' }
        },
        {
            id: 'reviews',
            title: 'Review Management',
            description: 'Manage customer reviews and ratings',
            icon: Star,
            color: 'yellow',
            bgColor: 'bg-yellow-50',
            iconColor: 'text-yellow-600',
            hoverBg: 'hover:bg-yellow-100',
            path: '/user-admin/reviews',
            stats: { value: '4.8', change: '+0.3%', trend: 'up' }
        },
        {
            id: 'quotations',
            title: 'Quotation Management',
            description: 'Create and manage quotations',
            icon: Quote,
            color: 'cyan',
            bgColor: 'bg-cyan-50',
            iconColor: 'text-cyan-600',
            hoverBg: 'hover:bg-cyan-100',
            path: '/user-admin/quotations',
            stats: { value: '89', change: '+15.2%', trend: 'up' }
        },
        {
            id: 'analytics',
            title: 'Analytics & Reports',
            description: 'View sales analytics and reports',
            icon: BarChart3,
            color: 'emerald',
            bgColor: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            hoverBg: 'hover:bg-emerald-100',
            path: '/user-admin/analytics',
            stats: { value: '₹12.5L', change: '+12.5%', trend: 'up' }
        }
    ];

    return (
        <div className="w-full max-w-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                            Shop Admin Dashboard
                        </h1>
                        <p className="text-base md:text-lg lg:text-xl text-muted-foreground">
                            Manage your e-commerce operations
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="px-3 py-1.5 md:px-4 md:py-2">
                            <TrendingUpIcon className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                            Live Dashboard
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-blue-700 text-xs md:text-sm">Total Revenue</CardDescription>
                        <CardTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-900">₹12,53,430</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUpIcon className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span className="text-xs md:text-sm text-green-600 font-medium">+12.5%</span>
                            <span className="text-xs md:text-sm text-muted-foreground">from last month</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-green-700 text-xs md:text-sm">Total Orders</CardDescription>
                        <CardTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-green-900">1,234</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUpIcon className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span className="text-xs md:text-sm text-green-600 font-medium">+8.3%</span>
                            <span className="text-xs md:text-sm text-muted-foreground">from last month</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-purple-700 text-xs md:text-sm">Active Products</CardDescription>
                        <CardTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-purple-900">2,890</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUpIcon className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span className="text-xs md:text-sm text-green-600 font-medium">+5.2%</span>
                            <span className="text-xs md:text-sm text-muted-foreground">from last month</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-orange-700 text-xs md:text-sm">Customer Rating</CardDescription>
                        <CardTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-orange-900">4.8</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUpIcon className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            <span className="text-xs md:text-sm text-green-600 font-medium">+0.3</span>
                            <span className="text-xs md:text-sm text-muted-foreground">from last month</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin Sections Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {adminSections.map((section) => {
                    const IconComponent = section.icon;
                    return (
                        <Card
                            key={section.id}
                            className={`${section.bgColor} ${section.hoverBg} hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg`}
                            onClick={() => handleNavigation(section.path)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className={`p-3 rounded-xl ${section.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                                        <IconComponent className={`h-8 w-8 ${section.iconColor}`} />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-gray-900">
                                            {section.stats.value}
                                        </div>
                                        <div className="flex items-center gap-1 text-sm">
                                            {section.stats.trend === 'up' ? (
                                                <TrendingUpIcon className="w-3 h-3 text-green-600" />
                                            ) : (
                                                <TrendingDownIcon className="w-3 h-3 text-red-600" />
                                            )}
                                            <span className={section.stats.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                                                {section.stats.change}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-gray-900 transition-colors mb-2">
                                    {section.title}
                                </h3>
                                <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                                    {section.description}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="mt-6">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <Card
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleNavigation('/user-admin/products/add')}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <Package className="h-8 w-8 text-blue-600" />
                                <div>
                                    <h3 className="font-semibold">Add New Product</h3>
                                    <p className="text-sm text-gray-600">Create a new product listing</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleNavigation('/user-admin/categories/add')}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <FileText className="h-8 w-8 text-green-600" />
                                <div>
                                    <h3 className="font-semibold">Add New Category</h3>
                                    <p className="text-sm text-gray-600">Create a new product category</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleNavigation('/user-admin/quotations/create')}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <Quote className="h-8 w-8 text-purple-600" />
                                <div>
                                    <h3 className="font-semibold">Create Quotation</h3>
                                    <p className="text-sm text-gray-600">Generate a new quotation</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
