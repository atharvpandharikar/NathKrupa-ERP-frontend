import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy route chunks for faster initial load
const LazyMainLayout = React.lazy(() => import("./components/layout/MainLayout"));
const LazyDashboard = React.lazy(() => import("./pages/dashboard/Dashboard"));
const LazyCustomers = React.lazy(() => import("./pages/dashboard/Customers"));
const LazyQuotationGenerate = React.lazy(() => import("./pages/quotations/Generate"));
const LazyQuotationsList = React.lazy(() => import("./pages/quotations/List"));
const LazyQuotationDetails = React.lazy(() => import("./pages/quotations/Details"));
const LazyBillDetails = React.lazy(() => import("./pages/bills/Details"));
const LazyReports = React.lazy(() => import("./pages/reports/Reports"));
const LazyPreferences = React.lazy(() => import("./pages/settings/Preferences"));
const LazyLogin = React.lazy(() => import("./pages/auth/Login"));
const LazyRegister = React.lazy(() => import("./pages/auth/Register"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <React.Suspense fallback={<div className="p-6">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Auth */}
          <Route path="/login" element={<LazyLogin />} />
          <Route path="/register" element={<LazyRegister />} />

          {/* Dashboard & feature routes use the main layout */}
          <Route element={<LazyMainLayout />}>
            <Route path="/dashboard" element={<LazyDashboard />} />
            <Route path="/dashboard/customers" element={<LazyCustomers />} />
            <Route path="/quotations" element={<LazyQuotationsList />} />
            <Route path="/quotations/generate" element={<LazyQuotationGenerate />} />
            <Route path="/quotations/:id" element={<LazyQuotationDetails />} />
            <Route path="/bills/:id" element={<LazyBillDetails />} />
            <Route path="/reports" element={<LazyReports />} />
            <Route path="/settings" element={<LazyPreferences />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </React.Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
