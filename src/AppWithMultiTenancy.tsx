import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { getTokens } from "@/lib/api";
import { AuthProvider } from "@/context/AuthContext";
import { SessionTimeoutNotification } from "@/components/SessionTimeoutNotification";
import { TitleManager } from "@/components/TitleManager";
import { OrganizationRouter } from "@/components/OrganizationRouter";
import { OrganizationHeader } from "@/components/layout/OrganizationHeader";

// Lazy route chunks for faster initial load
const LazyMainLayout = React.lazy(() => import("./components/layout/MainLayout"));
const LazyDashboard = React.lazy(() => import("./pages/dashboard/Dashboard"));
const LazyCustomers = React.lazy(() => import("./pages/dashboard/Customers"));
const LazyCustomerDetail = React.lazy(() => import("./pages/dashboard/CustomerDetail"));
const LazyQuotationGenerate = React.lazy(() => import("./pages/quotations/Generate"));
const LazyQuotationsList = React.lazy(() => import("./pages/quotations/List"));
const LazyQuotationDetails = React.lazy(() => import("./pages/quotations/Details"));
const LazyBillDetails = React.lazy(() => import("./pages/bills/Details"));
const LazyWorkOrdersList = React.lazy(() => import("./pages/workorders/List"));
const LazyWorkOrderDetails = React.lazy(() => import("./pages/workorders/Details"));
const LazyConvertToBills = React.lazy(() => import("./pages/workorders/ConvertToBills"));
const LazyBillsList = React.lazy(() => import("./pages/bills/List"));
const LazyCreateBill = React.lazy(() => import("./pages/bills/CreateBill"));
const LazyTestModeManagement = React.lazy(() => import("./pages/bills/TestModeManagement"));
const LazyReports = React.lazy(() => import("./pages/reports/Reports"));
const LazyPreferences = React.lazy(() => import("./pages/settings/Preferences"));
const LazyLogin = React.lazy(() => import("./pages/auth/Login"));
const LazyRegister = React.lazy(() => import("./pages/auth/Register"));
const LazyAppSelection = React.lazy(() => import("./pages/auth/AppSelection"));
const LazyFinanceLayout = React.lazy(() => import("./components/layout/FinanceLayout"));
const LazyFinanceDashboard = React.lazy(() => import("./pages/finance/Dashboard"));
const LazyFinanceAccounts = React.lazy(() => import("./pages/finance/Accounts"));
const LazyFinanceTransactions = React.lazy(() => import("./pages/finance/Transactions"));
const LazyFinanceReports = React.lazy(() => import("./pages/finance/Reports"));
const LazyAccountDetail = React.lazy(() => import("./pages/finance/AccountDetail"));
const LazyTransactionDetail = React.lazy(() => import("./pages/finance/TransactionDetail"));
const LazyFeatureTypes = React.lazy(() => import("@/pages/features/Types"));
const LazyFeaturePrices = React.lazy(() => import("@/pages/features/Prices"));
const LazyFeatureCategories = React.lazy(() => import("@/pages/features/Categories"));
const LazyFeatureImages = React.lazy(() => import("@/pages/features/Images"));
const LazyVehicleTypes = React.lazy(() => import("@/pages/vehicles/Types"));
const LazyVehicleMakers = React.lazy(() => import("@/pages/vehicles/Makers"));
const LazyVehicleModels = React.lazy(() => import("@/pages/vehicles/Models"));
const LazyPurchaseLayout = React.lazy(() => import("./components/layout/PurchaseLayout"));
const LazyPurchaseDashboard = React.lazy(() => import("./pages/purchase/Dashboard"));
const LazyPurchaseVendors = React.lazy(() => import("./pages/purchase/Vendors"));
const LazyPurchaseVendorDetail = React.lazy(() => import("./pages/purchase/VendorDetail"));
const LazyVendorPayments = React.lazy(() => import("./pages/purchase/VendorPayments"));
const LazyPurchaseBills = React.lazy(() => import("./pages/purchase/Bills"));
const LazyPurchaseNewBill = React.lazy(() => import("./pages/purchase/NewBill"));
const LazyPurchaseBillDetail = React.lazy(() => import("./pages/purchase/BillDetail"));
const LazyPurchasePayments = React.lazy(() => import("./pages/purchase/Payments"));
const LazyPurchaseReports = React.lazy(() => import("./pages/purchase/Reports"));
const LazyPurchaseSettings = React.lazy(() => import("./pages/purchase/Settings"));
const LazyInventoryLayout = React.lazy(() => import("./components/layout/InventoryLayout"));
const LazyInventoryDashboard = React.lazy(() => import("./pages/inventory/Dashboard"));
const LazyInventoryWarehouses = React.lazy(() => import("./pages/inventory/Warehouses"));
const LazyInventoryEntries = React.lazy(() => import("./pages/inventory/Entries"));
const LazyInventoryUnits = React.lazy(() => import("./pages/inventory/Units"));
const LazyInventoryRacks = React.lazy(() => import("./pages/inventory/Racks"));
const LazyInventoryReports = React.lazy(() => import("./pages/inventory/Reports"));
const LazyInventoryLowStock = React.lazy(() => import("./pages/inventory/LowStock"));

// Create a query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
        },
    },
});

// Main App component with multi-tenancy support
const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <BrowserRouter>
                    <AuthProvider>
                        <OrganizationRouter>
                            <div className="min-h-screen bg-gray-50">
                                {/* Organization Header - shows current organization and switcher */}
                                <OrganizationHeader />

                                {/* Session timeout notification */}
                                <SessionTimeoutNotification />

                                {/* Title manager for dynamic page titles */}
                                <TitleManager />

                                {/* Main application routes */}
                                <React.Suspense fallback={
                                    <div className="min-h-screen flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                            <p className="text-muted-foreground">Loading...</p>
                                        </div>
                                    </div>
                                }>
                                    <Routes>
                                        {/* Public routes */}
                                        <Route path="/login" element={<LazyLogin />} />
                                        <Route path="/register" element={<LazyRegister />} />
                                        <Route path="/app-selection" element={<LazyAppSelection />} />

                                        {/* Main application routes with organization context */}
                                        <Route element={<ProtectedRoute><LazyMainLayout /></ProtectedRoute>}>
                                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                            <Route path="/dashboard" element={<LazyDashboard />} />
                                            <Route path="/customers" element={<LazyCustomers />} />
                                            <Route path="/customers/:id" element={<LazyCustomerDetail />} />
                                            <Route path="/quotations" element={<LazyQuotationsList />} />
                                            <Route path="/quotations/generate" element={<LazyQuotationGenerate />} />
                                            <Route path="/quotations/:id" element={<LazyQuotationDetails />} />
                                            <Route path="/work-orders" element={<LazyWorkOrdersList />} />
                                            <Route path="/work-orders/:id" element={<LazyWorkOrderDetails />} />
                                            <Route path="/work-orders/convert-to-bills" element={<LazyConvertToBills />} />
                                            <Route path="/bills" element={<LazyBillsList />} />
                                            <Route path="/bills/create" element={<LazyCreateBill />} />
                                            <Route path="/bills/test-mode" element={<LazyTestModeManagement />} />
                                            <Route path="/bills/:id" element={<LazyBillDetails />} />
                                            <Route path="/reports" element={<LazyReports />} />
                                            <Route path="/settings" element={<LazyPreferences />} />
                                        </Route>

                                        {/* Finance routes with organization context */}
                                        <Route element={<ProtectedRoute><LazyFinanceLayout /></ProtectedRoute>}>
                                            <Route path="/finance/dashboard" element={<LazyFinanceDashboard />} />
                                            <Route path="/finance/accounts" element={<LazyFinanceAccounts />} />
                                            <Route path="/finance/accounts/:id" element={<LazyAccountDetail />} />
                                            <Route path="/finance/transactions" element={<LazyFinanceTransactions />} />
                                            <Route path="/finance/transactions/new" element={<LazyFinanceTransactions />} />
                                            <Route path="/finance/transactions/:id" element={<LazyTransactionDetail />} />
                                            <Route path="/finance/reports" element={<LazyFinanceReports />} />
                                        </Route>

                                        {/* Purchase routes with organization context */}
                                        <Route element={<ProtectedRoute><LazyPurchaseLayout /></ProtectedRoute>}>
                                            <Route path="/purchase" element={<Navigate to="/purchase/dashboard" replace />} />
                                            <Route path="/purchase/dashboard" element={<LazyPurchaseDashboard />} />
                                            <Route path="/purchase/vendors" element={<LazyPurchaseVendors />} />
                                            <Route path="/purchase/vendors/:id" element={<LazyPurchaseVendorDetail />} />
                                            <Route path="/purchase/vendors/:id/payments" element={<LazyVendorPayments />} />
                                            <Route path="/purchase/bills" element={<LazyPurchaseBills />} />
                                            <Route path="/purchase/bills/new" element={<LazyPurchaseNewBill />} />
                                            <Route path="/purchase/bills/:id" element={<LazyPurchaseBillDetail />} />
                                            <Route path="/purchase/payments" element={<LazyPurchasePayments />} />
                                            <Route path="/purchase/vendor-payments" element={<LazyVendorPayments />} />
                                            <Route path="/purchase/reports" element={<LazyPurchaseReports />} />
                                            <Route path="/purchase/settings" element={<LazyPurchaseSettings />} />
                                        </Route>

                                        {/* Inventory routes with organization context */}
                                        <Route element={<ProtectedRoute><LazyInventoryLayout /></ProtectedRoute>}>
                                            <Route path="/inventory" element={<LazyInventoryDashboard />} />
                                            <Route path="/inventory/warehouses" element={<LazyInventoryWarehouses />} />
                                            <Route path="/inventory/warehouses/new" element={<LazyInventoryWarehouses />} />
                                            <Route path="/inventory/entries" element={<LazyInventoryEntries />} />
                                            <Route path="/inventory/entries/new" element={<LazyInventoryEntries />} />
                                            <Route path="/inventory/entries/:id" element={<LazyInventoryEntries />} />
                                            <Route path="/inventory/units" element={<LazyInventoryUnits />} />
                                            <Route path="/inventory/racks" element={<LazyInventoryRacks />} />
                                            <Route path="/inventory/racks/new" element={<LazyInventoryRacks />} />
                                            <Route path="/inventory/reports" element={<LazyInventoryReports />} />
                                            <Route path="/inventory/low-stock" element={<LazyInventoryLowStock />} />
                                        </Route>

                                        {/* Feature management routes with organization context */}
                                        <Route element={<ProtectedRoute><LazyMainLayout /></ProtectedRoute>}>
                                            <Route path="/features/types" element={<LazyFeatureTypes />} />
                                            <Route path="/features/prices" element={<LazyFeaturePrices />} />
                                            <Route path="/features/categories" element={<LazyFeatureCategories />} />
                                            <Route path="/features/images" element={<LazyFeatureImages />} />
                                        </Route>

                                        {/* Vehicle management routes with organization context */}
                                        <Route element={<ProtectedRoute><LazyMainLayout /></ProtectedRoute>}>
                                            <Route path="/vehicles/types" element={<LazyVehicleTypes />} />
                                            <Route path="/vehicles/makers" element={<LazyVehicleMakers />} />
                                            <Route path="/vehicles/models" element={<LazyVehicleModels />} />
                                        </Route>

                                        {/* Catch-all route */}
                                        <Route path="*" element={<NotFound />} />
                                    </Routes>
                                </React.Suspense>
                            </div>
                        </OrganizationRouter>
                    </AuthProvider>
                </BrowserRouter>

                {/* Global UI components */}
                <Toaster />
                <Sonner />
            </TooltipProvider>
        </QueryClientProvider>
    );
};

export default App;
