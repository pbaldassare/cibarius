import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import RestaurantGuard from "./components/RestaurantGuard";
import MobileLayout from "./components/MobileLayout";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// User pages
import Index from "./pages/Index";
import ScanPage from "./pages/ScanPage";
import UserProductsPage from "./pages/UserProductsPage";
import UserFreezerPage from "./pages/UserFreezerPage";
import UserPantryPage from "./pages/UserPantryPage";
import PastiPage from "./pages/PastiPage";
import MealsTargetsPage from "./pages/MealsTargetsPage";
import ProfiloPage from "./pages/ProfiloPage";

// Admin pages
import AdminPage from "./pages/admin/AdminPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

// Restaurant app pages
import RestaurantOnboardingPage from "./pages/restaurant/RestaurantOnboardingPage";
import RestaurantPage from "./pages/restaurant/RestaurantPage";
import RestaurantProductsPage from "./pages/restaurant/RestaurantProductsPage";
import RestaurantRecipesPage from "./pages/restaurant/RestaurantRecipesPage";
import RestaurantSettingsPage from "./pages/restaurant/RestaurantSettingsPage";

// Restaurant admin pages
import RestaurantAdminPage from "./pages/restaurant-admin/RestaurantAdminPage";
import RestaurantAdminSettingsPage from "./pages/restaurant-admin/RestaurantAdminSettingsPage";
import RestaurantAdminStaffPage from "./pages/restaurant-admin/RestaurantAdminStaffPage";
import RestaurantAdminReportsPage from "./pages/restaurant-admin/RestaurantAdminReportsPage";

// Pro pages
import ProPage from "./pages/pro/ProPage";
import ProClientsPage from "./pages/pro/ProClientsPage";
import ProReportsPage from "./pages/pro/ProReportsPage";
import ProNotesPage from "./pages/pro/ProNotesPage";

// Supplier pages
import SupplierPage from "./pages/supplier/SupplierPage";
import SupplierRestaurantsPage from "./pages/supplier/SupplierRestaurantsPage";
import SupplierCatalogPage from "./pages/supplier/SupplierCatalogPage";
import SupplierReportsPage from "./pages/supplier/SupplierReportsPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RG = ({ roles, children }: { roles: string[]; children: React.ReactNode }) => (
  <RoleGuard allowedRoles={roles as any}>{children}</RoleGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public auth routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>

              {/* Mobile layout routes */}
              <Route element={<MobileLayout />}>
                {/* User */}
                <Route path="/" element={<Index />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/products" element={<UserProductsPage />} />
                <Route path="/freezer" element={<UserFreezerPage />} />
                <Route path="/pantry" element={<UserPantryPage />} />
                <Route path="/meals" element={<PastiPage />} />
                <Route path="/meals/targets" element={<MealsTargetsPage />} />
                <Route path="/profile" element={<ProfiloPage />} />

                {/* Restaurant owner - onboarding (no RestaurantGuard) */}
                <Route path="/restaurant/onboarding" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantOnboardingPage /></RG>} />

                {/* Restaurant owner - app pages (with RestaurantGuard) */}
                <Route path="/restaurant" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantPage /></RestaurantGuard></RG>} />
                <Route path="/restaurant/products" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantProductsPage /></RestaurantGuard></RG>} />
                <Route path="/restaurant/recipes" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantRecipesPage /></RestaurantGuard></RG>} />
                <Route path="/restaurant/settings" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantSettingsPage /></RestaurantGuard></RG>} />

                {/* Professional */}
                <Route path="/pro" element={<RG roles={["professional", "admin"]}><ProPage /></RG>} />
                <Route path="/pro/clients" element={<RG roles={["professional", "admin"]}><ProClientsPage /></RG>} />
                <Route path="/pro/reports" element={<RG roles={["professional", "admin"]}><ProReportsPage /></RG>} />
                <Route path="/pro/notes" element={<RG roles={["professional", "admin"]}><ProNotesPage /></RG>} />

                {/* Supplier */}
                <Route path="/supplier" element={<RG roles={["supplier", "admin"]}><SupplierPage /></RG>} />
                <Route path="/supplier/restaurants" element={<RG roles={["supplier", "admin"]}><SupplierRestaurantsPage /></RG>} />
                <Route path="/supplier/catalog" element={<RG roles={["supplier", "admin"]}><SupplierCatalogPage /></RG>} />
                <Route path="/supplier/reports" element={<RG roles={["supplier", "admin"]}><SupplierReportsPage /></RG>} />
              </Route>

              {/* Admin routes (no mobile layout) */}
              <Route path="/admin" element={<RG roles={["admin"]}><AdminPage /></RG>} />
              <Route path="/admin/users" element={<RG roles={["admin"]}><AdminUsersPage /></RG>} />
              <Route path="/admin/settings" element={<RG roles={["admin"]}><AdminSettingsPage /></RG>} />

              {/* Restaurant admin routes (no mobile layout) */}
              <Route path="/restaurant-admin" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantAdminPage /></RestaurantGuard></RG>} />
              <Route path="/restaurant-admin/settings" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantAdminSettingsPage /></RestaurantGuard></RG>} />
              <Route path="/restaurant-admin/staff" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantAdminStaffPage /></RestaurantGuard></RG>} />
              <Route path="/restaurant-admin/reports" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantAdminReportsPage /></RestaurantGuard></RG>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
