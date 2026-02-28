import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import RestaurantGuard from "./components/RestaurantGuard";
import UserLayout from "./components/UserLayout";
import RestaurantLayout from "./components/RestaurantLayout";
import MobileLayout from "./components/MobileLayout";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// User pages
import Index from "./pages/Index";
import ExpiryPage from "./pages/ExpiryPage";
import ScanPage from "./pages/ScanPage";
import UserProductsPage from "./pages/UserProductsPage";
import UserFreezerPage from "./pages/UserFreezerPage";
import UserPantryPage from "./pages/UserPantryPage";
import PastiPage from "./pages/PastiPage";
import MealsTargetsPage from "./pages/MealsTargetsPage";
import ProfiloPage from "./pages/ProfiloPage";
import InvitePage from "./pages/InvitePage";
import PublicRecipesPage from "./pages/PublicRecipesPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import RemindersPage from "./pages/RemindersPage";
import PreparationsPage from "./pages/PreparationsPage";

// Admin pages
import AdminPage from "./pages/admin/AdminPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminSeedPage from "./pages/admin/AdminSeedPage";

// Restaurant app pages
import RestaurantOnboardingPage from "./pages/restaurant/RestaurantOnboardingPage";
import RestaurantPage from "./pages/restaurant/RestaurantPage";
import RestaurantProductsPage from "./pages/restaurant/RestaurantProductsPage";
import RestaurantRecipesPage from "./pages/restaurant/RestaurantRecipesPage";
import RestaurantSettingsPage from "./pages/restaurant/RestaurantSettingsPage";
import RestaurantInvoicesPage from "./pages/restaurant/RestaurantInvoicesPage";
import RestaurantPreparationsPage from "./pages/restaurant/RestaurantPreparationsPage";

// Restaurant admin pages
import RestaurantAdminPage from "./pages/restaurant-admin/RestaurantAdminPage";
import RestaurantAdminSettingsPage from "./pages/restaurant-admin/RestaurantAdminSettingsPage";
import RestaurantAdminStaffPage from "./pages/restaurant-admin/RestaurantAdminStaffPage";
import RestaurantAdminReportsPage from "./pages/restaurant-admin/RestaurantAdminReportsPage";

// Pro pages
import ProPage from "./pages/pro/ProPage";
import ProClientsPage from "./pages/pro/ProClientsPage";
import ProClientDetailPage from "./pages/pro/ProClientDetailPage";
import ProClientPlanPage from "./pages/pro/ProClientPlanPage";
import ProClientMonitorPage from "./pages/pro/ProClientMonitorPage";
import ProClientSuggestPage from "./pages/pro/ProClientSuggestPage";
import ProClientPantryPage from "./pages/pro/ProClientPantryPage";
import ProClientPantryRecipesPage from "./pages/pro/ProClientPantryRecipesPage";
import ProReportsPage from "./pages/pro/ProReportsPage";
import ProNotesPage from "./pages/pro/ProNotesPage";
import ProClientPlanHistoryPage from "./pages/pro/ProClientPlanHistoryPage";
import ProTemplatesPage from "./pages/pro/ProTemplatesPage";

// User diet page
import UserDietPage from "./pages/UserDietPage";
import UserPantryRecipesPage from "./pages/UserPantryRecipesPage";

// Supplier pages
import SupplierPage from "./pages/supplier/SupplierPage";
import SupplierRestaurantsPage from "./pages/supplier/SupplierRestaurantsPage";
import SupplierCatalogPage from "./pages/supplier/SupplierCatalogPage";
import SupplierReportsPage from "./pages/supplier/SupplierReportsPage";
import SupplierInvitePage from "./pages/supplier/SupplierInvitePage";

import NotFound from "./pages/NotFound";
import PwaInstallBanner from "./components/PwaInstallBanner";

const queryClient = new QueryClient();

const RG = ({ roles, children }: { roles: string[]; children: React.ReactNode }) => (
  <RoleGuard allowedRoles={roles as any}>{children}</RoleGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PwaInstallBanner />
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

              {/* ═══ USER APP (UserLayout) ═══ */}
              <Route element={<RG roles={["user", "admin"]}><UserLayout /></RG>}>
                <Route path="/" element={<Index />} />
                <Route path="/expiry" element={<ExpiryPage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/products" element={<UserProductsPage />} />
                <Route path="/freezer" element={<UserFreezerPage />} />
                <Route path="/pantry" element={<UserPantryPage />} />
                <Route path="/meals" element={<PastiPage />} />
                <Route path="/meals/targets" element={<MealsTargetsPage />} />
                <Route path="/profile" element={<ProfiloPage />} />
                <Route path="/diet" element={<UserDietPage />} />
                <Route path="/my-recipes" element={<UserPantryRecipesPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="/invite" element={<InvitePage />} />
                <Route path="/recipes" element={<PublicRecipesPage />} />
                <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
                <Route path="/preparations" element={<PreparationsPage />} />
              </Route>

              {/* ═══ RESTAURANT APP (RestaurantLayout) ═══ */}
              <Route path="/restaurant/onboarding" element={<RG roles={["restaurant_owner", "admin"]}><MobileLayout /></RG>}>
                <Route index element={<RestaurantOnboardingPage />} />
              </Route>

              <Route element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantLayout /></RestaurantGuard></RG>}>
                <Route path="/restaurant" element={<RestaurantPage />} />
                <Route path="/restaurant/products" element={<RestaurantProductsPage />} />
                <Route path="/restaurant/recipes" element={<RestaurantRecipesPage />} />
                <Route path="/restaurant/settings" element={<RestaurantSettingsPage />} />
                <Route path="/restaurant/invoices" element={<RestaurantInvoicesPage />} />
                <Route path="/restaurant/preparations" element={<RestaurantPreparationsPage />} />
              </Route>

              {/* Supplier invite (restaurant context) */}
              <Route element={<MobileLayout />}>
                <Route path="/supplier-invite" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><SupplierInvitePage /></RestaurantGuard></RG>} />
              </Route>

              {/* ═══ PROFESSIONAL ═══ */}
              <Route element={<MobileLayout />}>
                <Route path="/pro" element={<RG roles={["professional", "admin"]}><ProPage /></RG>} />
                <Route path="/pro/clients" element={<RG roles={["professional", "admin"]}><ProClientsPage /></RG>} />
                <Route path="/pro/client/:clientId" element={<RG roles={["professional", "admin"]}><ProClientDetailPage /></RG>} />
                <Route path="/pro/client/:clientId/plan" element={<RG roles={["professional", "admin"]}><ProClientPlanPage /></RG>} />
                <Route path="/pro/client/:clientId/plan-history" element={<RG roles={["professional", "admin"]}><ProClientPlanHistoryPage /></RG>} />
                <Route path="/pro/client/:clientId/monitor" element={<RG roles={["professional", "admin"]}><ProClientMonitorPage /></RG>} />
                <Route path="/pro/client/:clientId/suggest" element={<RG roles={["professional", "admin"]}><ProClientSuggestPage /></RG>} />
                <Route path="/pro/client/:clientId/pantry" element={<RG roles={["professional", "admin"]}><ProClientPantryPage /></RG>} />
                <Route path="/pro/client/:clientId/pantry-recipes" element={<RG roles={["professional", "admin"]}><ProClientPantryRecipesPage /></RG>} />
                <Route path="/pro/reports" element={<RG roles={["professional", "admin"]}><ProReportsPage /></RG>} />
                <Route path="/pro/notes" element={<RG roles={["professional", "admin"]}><ProNotesPage /></RG>} />
                <Route path="/pro/templates" element={<RG roles={["professional", "admin"]}><ProTemplatesPage /></RG>} />
                <Route path="/pro/profile" element={<RG roles={["professional", "admin"]}><ProfiloPage /></RG>} />
              </Route>

              {/* ═══ SUPPLIER ═══ */}
              <Route element={<MobileLayout />}>
                <Route path="/supplier" element={<RG roles={["supplier", "admin"]}><SupplierPage /></RG>} />
                <Route path="/supplier/restaurants" element={<RG roles={["supplier", "admin"]}><SupplierRestaurantsPage /></RG>} />
                <Route path="/supplier/catalog" element={<RG roles={["supplier", "admin"]}><SupplierCatalogPage /></RG>} />
                <Route path="/supplier/reports" element={<RG roles={["supplier", "admin"]}><SupplierReportsPage /></RG>} />
              </Route>

              {/* Admin routes (no mobile layout) */}
              <Route path="/admin" element={<RG roles={["admin"]}><AdminPage /></RG>} />
              <Route path="/admin/users" element={<RG roles={["admin"]}><AdminUsersPage /></RG>} />
              <Route path="/admin/settings" element={<RG roles={["admin"]}><AdminSettingsPage /></RG>} />
              <Route path="/admin/seed" element={<RG roles={["admin"]}><AdminSeedPage /></RG>} />

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
