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
const LazyPurchaseVendorPrices = React.lazy(() => import("./pages/purchase/VendorPrices"));
const LazyPurchaseBills = React.lazy(() => import("./pages/purchase/Bills"));
const LazyPurchaseBillDetail = React.lazy(() => import("./pages/purchase/BillDetail"));
const LazyPurchaseNewBill = React.lazy(() => import("./pages/purchase/NewBill"));
const LazyPurchasePayments = React.lazy(() => import("./pages/purchase/Payments"));
const LazyVendorPayments = React.lazy(() => import("./pages/purchase/VendorPayments"));
const LazyPurchaseReports = React.lazy(() => import("./pages/purchase/Reports"));
const LazyPurchaseSettings = React.lazy(() => import("./pages/purchase/Settings"));
const LazySearchParts = React.lazy(() => import("./pages/search-parts/SearchParts"));

// Inventory routes
const LazyInventoryLayout = React.lazy(() => import("./components/layout/InventoryLayout"));
const LazyInventoryDashboard = React.lazy(() => import("./pages/inventory/Dashboard"));
const LazyInventoryWarehouses = React.lazy(() => import("./pages/inventory/Warehouses"));
const LazyInventoryEntries = React.lazy(() => import("./pages/inventory/Entries"));
const LazyInventoryUnits = React.lazy(() => import("./pages/inventory/Units"));
const LazyInventoryRacks = React.lazy(() => import("./pages/inventory/Racks"));
const LazyInventoryReports = React.lazy(() => import("./pages/inventory/Reports"));
const LazyInventoryLowStock = React.lazy(() => import("./pages/inventory/LowStock"));

// User Admin (Shop Management) routes
const LazyUserAdminDashboard = React.lazy(() => import("./pages/user-admin/UserAdminDashboard"));
const LazyProductList = React.lazy(() => import("./pages/user-admin/ProductList"));
const LazyAddProduct = React.lazy(() => import("./pages/user-admin/AddProduct"));
const LazyCategoryList = React.lazy(() => import("./pages/user-admin/CategoryList"));
const LazyOrderList = React.lazy(() => import("./pages/user-admin/OrderList"));
const LazyBrandList = React.lazy(() => import("./pages/user-admin/BrandList"));
const LazyCarMakerList = React.lazy(() => import("./pages/user-admin/CarMakerList"));
const LazyCarModelList = React.lazy(() => import("./pages/user-admin/CarModelList"));
const LazyCarVariantList = React.lazy(() => import("./pages/user-admin/CarVariantList"));
const LazyTagList = React.lazy(() => import("./pages/user-admin/TagList"));
const LazySellerList = React.lazy(() => import("./pages/user-admin/SellerList"));
const LazyAddressList = React.lazy(() => import("./pages/user-admin/AddressList"));
const LazyReviewList = React.lazy(() => import("./pages/user-admin/ReviewList"));
const LazyWishlistList = React.lazy(() => import("./pages/user-admin/WishlistList"));
const LazyQuotationList = React.lazy(() => import("./pages/user-admin/QuotationList"));
const LazySeoEntryList = React.lazy(() => import("./pages/user-admin/SeoEntryList"));
const LazyGarageVehicleList = React.lazy(() => import("./pages/user-admin/GarageVehicleList"));
const LazyVehicleCompatibilityList = React.lazy(() => import("./pages/user-admin/VehicleCompatibilityList"));
const LazyCustomerList = React.lazy(() => import("./pages/user-admin/CustomerList"));
const LazyCustomerGroups = React.lazy(() => import("./pages/user-admin/CustomerGroups"));
const LazyCustomerPrices = React.lazy(() => import("./pages/user-admin/CustomerPrices"));
const LazyCreateQuote = React.lazy(() => import("./pages/user-admin/CreateQuote"));
const LazyShopAdminLayout = React.lazy(() => import("./components/layout/ShopAdminLayout"));

// Wrapper component for ShopAdminLayout
const ShopAdminWrapper = () => {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <LazyShopAdminLayout />
    </React.Suspense>
  );
};




const queryClient = new QueryClient();

const HomeRedirect = () => {
  const tokens = getTokens();
  console.log("HomeRedirect: tokens =", tokens);
  console.log("HomeRedirect: redirecting to", tokens ? "/app-selection" : "/login");
  return <Navigate to={tokens ? "/app-selection" : "/login"} replace />;
};


const App = () => {
  console.log("App component rendering");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <TitleManager />
            <Toaster />
            <Sonner />
            <SessionTimeoutNotification />
            <React.Suspense fallback={
              <div className="p-6 min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-semibold">Loading...</div>
                  <div className="text-sm text-muted-foreground mt-2">Please wait while we load the application</div>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />

                {/* Auth */}
                <Route path="/login" element={<LazyLogin />} />
                <Route path="/register" element={<LazyRegister />} />
                <Route path="/app-selection" element={<LazyAppSelection />} />
                <Route path="/search-parts" element={<LazySearchParts />} />

                {/* User Admin (Shop Management) routes */}
                <Route path="/user-admin" element={<ProtectedRoute><ShopAdminWrapper /></ProtectedRoute>}>
                  <Route index element={<LazyUserAdminDashboard />} />
                  <Route path="products" element={<LazyProductList />} />
                  <Route path="products/add" element={<LazyAddProduct />} />
                  <Route path="products/edit/:id" element={<LazyProductList />} />
                  <Route path="products/view/:id" element={<LazyProductList />} />
                  <Route path="categories" element={<LazyCategoryList />} />
                  <Route path="categories/add" element={<LazyCategoryList />} />
                  <Route path="categories/edit/:id" element={<LazyCategoryList />} />
                  <Route path="categories/view/:id" element={<LazyCategoryList />} />
                  <Route path="orders" element={<LazyOrderList />} />
                  <Route path="orders/view/:id" element={<LazyOrderList />} />
                  <Route path="brands" element={<LazyBrandList />} />
                  <Route path="brands/add" element={<LazyBrandList />} />
                  <Route path="brands/edit/:id" element={<LazyBrandList />} />
                  <Route path="vehicles" element={<LazyCarMakerList />} />
                  <Route path="car-makers" element={<LazyCarMakerList />} />
                  <Route path="car-makers/add" element={<LazyCarMakerList />} />
                  <Route path="car-makers/edit/:id" element={<LazyCarMakerList />} />
                  <Route path="car-models" element={<LazyCarModelList />} />
                  <Route path="car-models/add" element={<LazyCarModelList />} />
                  <Route path="car-models/edit/:id" element={<LazyCarModelList />} />
                  <Route path="car-variants" element={<LazyCarVariantList />} />
                  <Route path="car-variants/add" element={<LazyCarVariantList />} />
                  <Route path="car-variants/edit/:id" element={<LazyCarVariantList />} />
                  <Route path="tags" element={<LazyTagList />} />
                  <Route path="tags/add" element={<LazyTagList />} />
                  <Route path="tags/edit/:id" element={<LazyTagList />} />
                  <Route path="sellers" element={<LazySellerList />} />
                  <Route path="sellers/add" element={<LazySellerList />} />
                  <Route path="sellers/edit/:id" element={<LazySellerList />} />
                  <Route path="customers" element={<LazyCustomerList />} />
                  <Route path="customer-groups" element={<LazyCustomerGroups />} />
                  <Route path="customer-prices" element={<LazyCustomerPrices />} />
                  <Route path="addresses" element={<LazyAddressList />} />
                  <Route path="reviews" element={<LazyReviewList />} />
                  <Route path="wishlists" element={<LazyWishlistList />} />
                  <Route path="quotations" element={<LazyQuotationList />} />
                  <Route path="create-quote" element={<LazyCreateQuote />} />
                  <Route path="quotations/create" element={<LazyCreateQuote />} />
                  <Route path="quotations/edit/:id" element={<LazyQuotationList />} />
                  <Route path="seo" element={<LazySeoEntryList />} />
                  <Route path="garage-vehicles" element={<LazyGarageVehicleList />} />
                  <Route path="vehicle-compatibility" element={<LazyVehicleCompatibilityList />} />
                </Route>

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
                  <Route path="/work-orders/convert-to-bills" element={<LazyConvertToBills />} />
                  <Route path="/bills" element={<LazyBillsList />} />
                  <Route path="/bills/create" element={<LazyCreateBill />} />
                  <Route path="/bills/test-mode" element={<LazyTestModeManagement />} />
                  <Route path="/bills/:id" element={<LazyBillDetails />} />
                  <Route path="/reports" element={<LazyReports />} />
                  <Route path="/settings" element={<LazyPreferences />} />
                </Route>

                {/* Finance routes use the finance layout and require auth */}
                <Route element={<ProtectedRoute><LazyFinanceLayout /></ProtectedRoute>}>
                  <Route path="/finance/dashboard" element={<LazyFinanceDashboard />} />
                  <Route path="/finance/accounts" element={<LazyFinanceAccounts />} />
                  <Route path="/finance/accounts/:id" element={<LazyAccountDetail />} />
                  <Route path="/finance/transactions" element={<LazyFinanceTransactions />} />
                  <Route path="/finance/transactions/new" element={<LazyFinanceTransactions />} />
                  <Route path="/finance/transactions/:id" element={<LazyTransactionDetail />} />
                  <Route path="/finance/reports" element={<LazyFinanceReports />} />
                </Route>

                {/* Purchase routes use the purchase layout and require auth */}
                <Route element={<ProtectedRoute><LazyPurchaseLayout /></ProtectedRoute>}>
                  <Route path="/purchase" element={<Navigate to="/purchase/dashboard" replace />} />
                  <Route path="/purchase/dashboard" element={<LazyPurchaseDashboard />} />
                  <Route path="/purchase/vendors" element={<LazyPurchaseVendors />} />
                  <Route path="/purchase/vendors/:id" element={<LazyPurchaseVendorDetail />} />
                  <Route path="/purchase/vendors/:id/payments" element={<LazyVendorPayments />} />
                  <Route path="/purchase/vendor-prices" element={<LazyPurchaseVendorPrices />} />
                  <Route path="/purchase/bills" element={<LazyPurchaseBills />} />
                  <Route path="/purchase/bills/new" element={<LazyPurchaseNewBill />} />
                  <Route path="/purchase/bills/:id" element={<LazyPurchaseBillDetail />} />
                  <Route path="/purchase/payments" element={<LazyPurchasePayments />} />
                  <Route path="/purchase/vendor-payments" element={<LazyVendorPayments />} />
                  <Route path="/purchase/reports" element={<LazyPurchaseReports />} />
                  <Route path="/purchase/settings" element={<LazyPurchaseSettings />} />
                </Route>

                {/* Inventory routes use the inventory layout and require auth */}
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

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </React.Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
