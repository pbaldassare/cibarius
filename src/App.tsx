import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import MobileLayout from "./components/MobileLayout";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// User pages
import Index from "./pages/Index";
import ScanPage from "./pages/ScanPage";
import ProdottiPage from "./pages/ProdottiPage";
import PastiPage from "./pages/PastiPage";
import ProfiloPage from "./pages/ProfiloPage";

// Admin pages
import AdminPage from "./pages/admin/AdminPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";

// Restaurant pages
import RestaurantPage from "./pages/restaurant/RestaurantPage";
import RestaurantProductsPage from "./pages/restaurant/RestaurantProductsPage";
import RestaurantRecipesPage from "./pages/restaurant/RestaurantRecipesPage";

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

              {/* User routes (mobile layout) */}
              <Route element={<MobileLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/products" element={<ProdottiPage />} />
                <Route path="/meals" element={<PastiPage />} />
                <Route path="/profile" element={<ProfiloPage />} />

                {/* Restaurant owner routes */}
                <Route path="/restaurant" element={<RoleGuard allowedRoles={["restaurant_owner", "admin"]}><RestaurantPage /></RoleGuard>} />
                <Route path="/restaurant/products" element={<RoleGuard allowedRoles={["restaurant_owner", "admin"]}><RestaurantProductsPage /></RoleGuard>} />
                <Route path="/restaurant/recipes" element={<RoleGuard allowedRoles={["restaurant_owner", "admin"]}><RestaurantRecipesPage /></RoleGuard>} />

                {/* Professional routes */}
                <Route path="/pro" element={<RoleGuard allowedRoles={["professional", "admin"]}><ProPage /></RoleGuard>} />
                <Route path="/pro/clients" element={<RoleGuard allowedRoles={["professional", "admin"]}><ProClientsPage /></RoleGuard>} />
                <Route path="/pro/reports" element={<RoleGuard allowedRoles={["professional", "admin"]}><ProReportsPage /></RoleGuard>} />
                <Route path="/pro/notes" element={<RoleGuard allowedRoles={["professional", "admin"]}><ProNotesPage /></RoleGuard>} />

                {/* Supplier routes */}
                <Route path="/supplier" element={<RoleGuard allowedRoles={["supplier", "admin"]}><SupplierPage /></RoleGuard>} />
                <Route path="/supplier/restaurants" element={<RoleGuard allowedRoles={["supplier", "admin"]}><SupplierRestaurantsPage /></RoleGuard>} />
                <Route path="/supplier/catalog" element={<RoleGuard allowedRoles={["supplier", "admin"]}><SupplierCatalogPage /></RoleGuard>} />
                <Route path="/supplier/reports" element={<RoleGuard allowedRoles={["supplier", "admin"]}><SupplierReportsPage /></RoleGuard>} />
              </Route>

              {/* Admin routes (no mobile layout) */}
              <Route path="/admin" element={<RoleGuard allowedRoles={["admin"]}><AdminPage /></RoleGuard>} />
              <Route path="/admin/users" element={<RoleGuard allowedRoles={["admin"]}><AdminUsersPage /></RoleGuard>} />
              <Route path="/admin/settings" element={<RoleGuard allowedRoles={["admin"]}><AdminSettingsPage /></RoleGuard>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
