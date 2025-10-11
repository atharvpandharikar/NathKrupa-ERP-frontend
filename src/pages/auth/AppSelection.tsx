import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Calculator, ShoppingCart, ArrowLeft, Package, LogOut, Search, Loader2, PlusCircle } from "lucide-react";
import React, { useEffect, useState } from 'react';
import { organizationsApi, Organization } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const OrganizationSchema = z.object({
    name: z.string().min(1, "Organization name is required"),
    address: z.string().optional(),
});

export default function AppSelection() {
    const navigate = useNavigate();
    const { activeOrganizationId, setActiveOrganizationId, logout } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loadingOrganizations, setLoadingOrganizations] = useState(true);
    const [errorOrganizations, setErrorOrganizations] = useState<string | null>(null);
    const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);

    const form = useForm<z.infer<typeof OrganizationSchema>>({
        resolver: zodResolver(OrganizationSchema),
        defaultValues: {
            name: "",
            address: "",
        },
    });

    useEffect(() => {
        const fetchOrganizations = async () => {
            try {
                setLoadingOrganizations(true);
                const fetchedOrganizations = await organizationsApi.list();
                setOrganizations(fetchedOrganizations);
                if (fetchedOrganizations.length === 0) {
                    setIsCreatingOrganization(true);
                } else if (!activeOrganizationId && fetchedOrganizations.length > 0) {
                    // If no active organization is set but organizations exist, prompt user to select
                    // For now, let's just make the first one active for demonstration
                    setActiveOrganizationId(fetchedOrganizations[0].id);
                }
            } catch (error) {
                console.error("Error fetching organizations:", error);
                setErrorOrganizations("Failed to load organizations. Please try again.");
            } finally {
                setLoadingOrganizations(false);
            }
        };

        fetchOrganizations();
    }, [activeOrganizationId, setActiveOrganizationId]);

    const handleOrganizationSelection = async (organization: Organization) => {
        try {
            // In a real application, this would involve sending the selected organization_id to the backend
            // to set it in the user's session or JWT token.
            // For this example, we'll directly set it in the AuthContext.
            setActiveOrganizationId(organization.id);
            navigate('/dashboard'); // Redirect to dashboard or appropriate page after selection
        } catch (error) {
            console.error("Error selecting organization:", error);
            setErrorOrganizations("Failed to select organization. Please try again.");
        }
    };

    const handleCreateOrganization = form.handleSubmit(async (values) => {
        try {
            setLoadingOrganizations(true);
            const newOrg = await organizationsApi.create({
                name: values.name,
                address: values.address || undefined,
            });
            // Set the newly created organization as active
            setActiveOrganizationId(newOrg.id);
            navigate('/dashboard'); // Redirect after creation
        } catch (error) {
            console.error("Error creating organization:", error);
            setErrorOrganizations("Failed to create organization. Please try again.");
        } finally {
            setLoadingOrganizations(false);
        }
    });

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
            case 'search-parts':
                navigate('/search-parts');
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
            id: 'search-parts',
            name: 'Search Parts',
            icon: Search,
            color: 'indigo',
            bgColor: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            hoverBg: 'hover:bg-indigo-100'
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
                        {activeOrganizationId ? "Select Application" : "Select or Create Organization"}
                    </h2>
                </div>

                {loadingOrganizations ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
                        <p className="ml-3 text-gray-600">Loading organizations...</p>
                    </div>
                ) : errorOrganizations ? (
                    <div className="text-center text-red-600 text-lg mb-8">{errorOrganizations}</div>
                ) : isCreatingOrganization || organizations.length === 0 ? (
                    // Create New Organization Form
                    <Card className="mx-auto max-w-lg p-6 shadow-lg">
                        <CardContent>
                            <h3 className="text-2xl font-semibold text-center mb-6">Create New Organization</h3>
                            <Form {...form}>
                                <form onSubmit={handleCreateOrganization} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Organization Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g., My Awesome Org" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="123 Main St" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || loadingOrganizations}>
                                        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Create Organization
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                ) : (
                    // Display Organizations or Apps
                    <>
                        {!activeOrganizationId ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                                {organizations.map((org) => (
                                    <Card
                                        key={org.id}
                                        className="bg-gray-50 hover:bg-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg"
                                        onClick={() => handleOrganizationSelection(org)}
                                    >
                                        <CardContent className="p-8 text-center">
                                            <div className="flex justify-center mb-6">
                                                <div className="p-6 rounded-2xl bg-gray-100 group-hover:scale-110 transition-transform duration-300">
                                                    <Building2 className="h-12 w-12 text-gray-600" />
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
                                                {org.name}
                                            </h3>
                                            {org.address && <p className="text-gray-500 text-sm mt-2">{org.address}</p>}
                                        </CardContent>
                                    </Card>
                                ))}
                                <Card
                                    className="bg-gray-50 hover:bg-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg flex items-center justify-center"
                                    onClick={() => setIsCreatingOrganization(true)}
                                >
                                    <CardContent className="p-8 text-center">
                                        <div className="flex justify-center mb-6">
                                            <div className="p-6 rounded-2xl bg-gray-100 group-hover:scale-110 transition-transform duration-300">
                                                <PlusCircle className="h-12 w-12 text-gray-600" />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
                                            Add New Organization
                                        </h3>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            // Existing App Selection Cards
                            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
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
                        )}
                    </>
                )}

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
