import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { getTokens } from "@/lib/api";

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
const LazyReports = React.lazy(() => import("./pages/reports/Reports"));
const LazyPreferences = React.lazy(() => import("./pages/settings/Preferences"));
const LazyLogin = React.lazy(() => import("./pages/auth/Login"));
const LazyRegister = React.lazy(() => import("./pages/auth/Register"));
const LazyFeatureTypes = React.lazy(() => import("@/pages/features/Types"));
const LazyFeaturePrices = React.lazy(() => import("@/pages/features/Prices"));
const LazyFeatureCategories = React.lazy(() => import("@/pages/features/Categories"));
const LazyFeatureImages = React.lazy(() => import("@/pages/features/Images"));
const LazyVehicleTypes = React.lazy(() => import("@/pages/vehicles/Types"));
const LazyVehicleMakers = React.lazy(() => import("@/pages/vehicles/Makers"));
const LazyVehicleModels = React.lazy(() => import("@/pages/vehicles/Models"));


const queryClient = new QueryClient();

const HomeRedirect = () => {
  const tokens = getTokens();
  console.log("HomeRedirect: tokens =", tokens);
  console.log("HomeRedirect: redirecting to", tokens ? "/dashboard" : "/login");
  return <Navigate to={tokens ? "/dashboard" : "/login"} replace />;
};

const LazyPayments = React.lazy(() => import("./pages/payments/Payments"));

const App = () => {
  console.log("App component rendering");
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <React.Suspense fallback={<div className="p-6 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold">Loading...</div>
            <div className="text-sm text-muted-foreground mt-2">Please wait while we load the application</div>
          </div>
        </div>}>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />

          {/* Auth */}
          <Route path="/login" element={<LazyLogin />} />
          <Route path="/register" element={<LazyRegister />} />

          {/* Dashboard & feature routes use the main layout and require auth */}
          <Route element={<ProtectedRoute><LazyMainLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<LazyDashboard />} />
            <Route path="/dashboard/customers" element={<LazyCustomers />} />
            <Route path="/dashboard/customers/:id" element={<LazyCustomerDetail />} />
            <Route path="/features/types" element={<LazyFeatureTypes />} />
            <Route path="/features/prices" element={<LazyFeaturePrices />} />
            <Route path="/features/categories" element={<LazyFeatureCategories />} />
            <Route path="/features/images" element={<LazyFeatureImages />} />
            <Route path="/vehicles/types" element={<LazyVehicleTypes />} />
            <Route path="/vehicles/makers" element={<LazyVehicleMakers />} />
            <Route path="/vehicles/models" element={<LazyVehicleModels />} />
            <Route path="/quotations" element={<LazyQuotationsList />} />
            <Route path="/quotations/generate" element={<LazyQuotationGenerate />} />
            <Route path="/quotations/:id" element={<LazyQuotationDetails />} />
            <Route path="/work-orders" element={<LazyWorkOrdersList />} />
            <Route path="/work-orders/:id" element={<LazyWorkOrderDetails />} />
            <Route path="/bills/:id" element={<LazyBillDetails />} />
            <Route path="/reports" element={<LazyReports />} />
            <Route path="/settings" element={<LazyPreferences />} />
            <Route path="/payments" element={<LazyPayments />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </React.Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
