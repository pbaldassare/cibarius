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
import AdminPwaGuard from "./components/AdminPwaGuard";
import PlusGuard from "./components/PlusGuard";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import AuthCallbackPage from "./pages/auth/AuthCallbackPage";

// User pages
import Index from "./pages/Index";
import ExpiryPage from "./pages/ExpiryPage";
import ScanPage from "./pages/ScanPage";
import UserProductsPage from "./pages/UserProductsPage";
import UserFreezerPage from "./pages/UserFreezerPage";
import UserPantryPage from "./pages/UserPantryPage";
import PastiPage from "./pages/PastiPage";
import MealPhotoPage from "./pages/MealPhotoPage";
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
import AdminProductReviewPage from "./pages/admin/AdminProductReviewPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
// AdminCouponsPage merged into AdminPaymentsPage
import AdminRestaurantsPage from "./pages/admin/AdminRestaurantsPage";
import AdminStatsPage from "./pages/admin/AdminStatsPage";
import AdminHaccpTemplatesPage from "./pages/admin/AdminHaccpTemplatesPage";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminProductsDbPage from "./pages/admin/AdminProductsDbPage";
import AdminApiPage from "./pages/admin/AdminApiPage";

// Restaurant app pages
import RestaurantOnboardingPage from "./pages/restaurant/RestaurantOnboardingPage";
import RestaurantPage from "./pages/restaurant/RestaurantPage";
import RestaurantProductsPage from "./pages/restaurant/RestaurantProductsPage";
import RestaurantExpiryPage from "./pages/restaurant/RestaurantExpiryPage";
import RestaurantRecipesPage from "./pages/restaurant/RestaurantRecipesPage";
import RestaurantSettingsPage from "./pages/restaurant/RestaurantSettingsPage";
import RestaurantInvoicesPage from "./pages/restaurant/RestaurantInvoicesPage";
import RestaurantPreparationsPage from "./pages/restaurant/RestaurantPreparationsPage";
import RestaurantItemPage from "./pages/restaurant/RestaurantItemPage";
import RestaurantHaccpPage from "./pages/restaurant/RestaurantHaccpPage";
import RestaurantHaccpSetupPage from "./pages/restaurant/RestaurantHaccpSetupPage";
import RestaurantHaccpHistoryPage from "./pages/restaurant/RestaurantHaccpHistoryPage";

// Restaurant admin pages
import RestaurantAdminPage from "./pages/restaurant-admin/RestaurantAdminPage";
import RestaurantAdminSettingsPage from "./pages/restaurant-admin/RestaurantAdminSettingsPage";
import RestaurantAdminStaffPage from "./pages/restaurant-admin/RestaurantAdminStaffPage";
import RestaurantAdminReportsPage from "./pages/restaurant-admin/RestaurantAdminReportsPage";
import RestaurantHaccpControlPage from "./pages/restaurant-admin/RestaurantHaccpControlPage";
import RestaurantTemperaturesPage from "./pages/restaurant-admin/RestaurantTemperaturesPage";

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
import ProTemplateEditorPage from "./pages/pro/ProTemplateEditorPage";
import ProWeeklyReportPage from "./pages/pro/ProWeeklyReportPage";
import ProClientMessagesPage from "./pages/pro/ProClientMessagesPage";
import ProAppointmentsPage from "./pages/pro/ProAppointmentsPage";
import ProClientPlanPdfPage from "./pages/pro/ProClientPlanPdfPage";
import ProWeeklyPlanPage from "./pages/pro/ProWeeklyPlanPage";

// User diet page
import UserDietPage from "./pages/UserDietPage";
import UserActivePlanPage from "./pages/UserActivePlanPage";
import UserWeeklyPlanPage from "./pages/UserWeeklyPlanPage";
import UserProgressPage from "./pages/UserProgressPage";
import UserPantryRecipesPage from "./pages/UserPantryRecipesPage";
import UserMessagesPage from "./pages/UserMessagesPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import UserMeasurementsPage from "./pages/UserMeasurementsPage";
import ProClientMeasurementsPage from "./pages/pro/ProClientMeasurementsPage";
import ProCouponPage from "./pages/pro/ProCouponPage";
import MealRemindersPage from "./pages/MealRemindersPage";
import UserFavoritesPage from "./pages/UserFavoritesPage";
import AntiWastePage from "./pages/AntiWastePage";
import SubscriptionPage from "./pages/SubscriptionPage";

// Supplier pages
import SupplierPage from "./pages/supplier/SupplierPage";
import SupplierRestaurantsPage from "./pages/supplier/SupplierRestaurantsPage";
import SupplierCatalogPage from "./pages/supplier/SupplierCatalogPage";
import SupplierReportsPage from "./pages/supplier/SupplierReportsPage";
import SupplierInvitePage from "./pages/supplier/SupplierInvitePage";

import JoinReferralPage from "./pages/JoinReferralPage";
import NutritionistPublicPage from "./pages/NutritionistPublicPage";
import NotFound from "./pages/NotFound";
import PwaInstallBanner from "./components/PwaInstallBanner";
import { PwaInstallProvider } from "./hooks/usePwaInstall";
import { TourProvider } from "./components/AppTourContext";

const queryClient = new QueryClient();

const RG = ({ roles, children }: { roles: string[]; children: React.ReactNode }) => (
  <RoleGuard allowedRoles={roles as any}>{children}</RoleGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PwaInstallProvider>
    <TourProvider>
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
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/join/:code" element={<JoinReferralPage />} />
            <Route path="/n/:slug" element={<NutritionistPublicPage />} />

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
                <Route path="/meals/photo" element={<MealPhotoPage />} />
                <Route path="/meals/targets" element={<MealsTargetsPage />} />
                <Route path="/profile" element={<ProfiloPage />} />
                <Route path="/diet" element={<UserDietPage />} />
                <Route path="/plan" element={<UserActivePlanPage />} />
                <Route path="/weekly-plan" element={<UserWeeklyPlanPage />} />
                <Route path="/my-recipes" element={<UserPantryRecipesPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="/meal-reminders" element={<MealRemindersPage />} />
                <Route path="/anti-waste" element={<AntiWastePage />} />
                <Route path="/suggest-meal" element={<AntiWastePage />} />
                <Route path="/invite" element={<InvitePage />} />
                <Route path="/recipes" element={<PublicRecipesPage />} />
                <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
                <Route path="/preparations" element={<PreparationsPage />} />
                <Route path="/messages" element={<UserMessagesPage />} />
                <Route path="/shopping-list" element={<ShoppingListPage />} />
                <Route path="/measurements" element={<PlusGuard><UserMeasurementsPage /></PlusGuard>} />
                <Route path="/progress" element={<UserProgressPage />} />
                <Route path="/subscription" element={<SubscriptionPage />} />
                <Route path="/favorites" element={<UserFavoritesPage />} />
              </Route>

              {/* ═══ RESTAURANT APP (RestaurantLayout) ═══ */}
              <Route path="/restaurant/onboarding" element={<RG roles={["restaurant_owner", "admin"]}><MobileLayout /></RG>}>
                <Route index element={<RestaurantOnboardingPage />} />
              </Route>

              <Route element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantLayout /></RestaurantGuard></RG>}>
                <Route path="/restaurant" element={<RestaurantPage />} />
                <Route path="/restaurant/products" element={<RestaurantExpiryPage />} />
                <Route path="/restaurant/recipes" element={<RestaurantRecipesPage />} />
                <Route path="/restaurant/settings" element={<RestaurantSettingsPage />} />
                <Route path="/restaurant/invoices" element={<RestaurantInvoicesPage />} />
                <Route path="/restaurant/preparations" element={<RestaurantPreparationsPage />} />
                <Route path="/restaurant/item/:id" element={<RestaurantItemPage />} />
                <Route path="/restaurant/profile" element={<ProfiloPage />} />
                <Route path="/restaurant/haccp" element={<RestaurantHaccpPage />} />
                <Route path="/restaurant/haccp/setup" element={<RestaurantHaccpSetupPage />} />
                <Route path="/restaurant/haccp/history" element={<RestaurantHaccpHistoryPage />} />
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
                <Route path="/pro/template/:templateId" element={<RG roles={["professional", "admin"]}><ProTemplateEditorPage /></RG>} />
                <Route path="/pro/weekly-report" element={<RG roles={["professional", "admin"]}><ProWeeklyReportPage /></RG>} />
                <Route path="/pro/client/:clientId/messages" element={<RG roles={["professional", "admin"]}><ProClientMessagesPage /></RG>} />
                <Route path="/pro/client/:clientId/plan-pdf" element={<RG roles={["professional", "admin"]}><ProClientPlanPdfPage /></RG>} />
                <Route path="/pro/client/:clientId/weekly-plan" element={<RG roles={["professional", "admin"]}><ProWeeklyPlanPage /></RG>} />
                <Route path="/pro/appointments" element={<RG roles={["professional", "admin"]}><ProAppointmentsPage /></RG>} />
                <Route path="/pro/client/:clientId/measurements" element={<RG roles={["professional", "admin"]}><ProClientMeasurementsPage /></RG>} />
                <Route path="/pro/coupon" element={<RG roles={["professional", "admin"]}><ProCouponPage /></RG>} />
                <Route path="/pro/profile" element={<RG roles={["professional", "admin"]}><ProfiloPage /></RG>} />
              </Route>

              {/* ═══ SUPPLIER ═══ */}
              <Route element={<MobileLayout />}>
                <Route path="/supplier" element={<RG roles={["supplier", "admin"]}><SupplierPage /></RG>} />
                <Route path="/supplier/restaurants" element={<RG roles={["supplier", "admin"]}><SupplierRestaurantsPage /></RG>} />
                <Route path="/supplier/catalog" element={<RG roles={["supplier", "admin"]}><SupplierCatalogPage /></RG>} />
                <Route path="/supplier/reports" element={<RG roles={["supplier", "admin"]}><SupplierReportsPage /></RG>} />
              </Route>

              {/* ═══ ADMIN (browser only, with PWA guard) ═══ */}
              <Route path="/admin" element={<RG roles={["admin"]}><AdminPwaGuard><AdminPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/users" element={<RG roles={["admin"]}><AdminPwaGuard><AdminUsersPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/restaurants" element={<RG roles={["admin"]}><AdminPwaGuard><AdminRestaurantsPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/stats" element={<RG roles={["admin"]}><AdminPwaGuard><AdminStatsPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/settings" element={<RG roles={["admin"]}><AdminPwaGuard><AdminSettingsPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/seed" element={<RG roles={["admin"]}><AdminPwaGuard><AdminSeedPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/product-review" element={<RG roles={["admin"]}><AdminPwaGuard><AdminProductReviewPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/support" element={<RG roles={["admin"]}><AdminPwaGuard><AdminSupportPage /></AdminPwaGuard></RG>} />
              {/* /admin/coupons removed — merged into /admin/payments */}
              <Route path="/admin/haccp-templates" element={<RG roles={["admin"]}><AdminPwaGuard><AdminHaccpTemplatesPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/subscriptions" element={<RG roles={["admin"]}><AdminPwaGuard><AdminSubscriptionsPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/payments" element={<RG roles={["admin"]}><AdminPwaGuard><AdminPaymentsPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/products-db" element={<RG roles={["admin"]}><AdminPwaGuard><AdminProductsDbPage /></AdminPwaGuard></RG>} />
              <Route path="/admin/api" element={<RG roles={["admin"]}><AdminPwaGuard><AdminApiPage /></AdminPwaGuard></RG>} />

              {/* Restaurant admin routes (no mobile layout) */}
              <Route path="/restaurant-admin" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantAdminPage /></RestaurantGuard></RG>} />
              <Route path="/restaurant-admin/haccp-control" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantHaccpControlPage /></RestaurantGuard></RG>} />
              <Route path="/restaurant-admin/temperatures" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantTemperaturesPage /></RestaurantGuard></RG>} />
              <Route path="/restaurant-admin/settings" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantAdminSettingsPage /></RestaurantGuard></RG>} />
              <Route path="/restaurant-admin/staff" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantAdminStaffPage /></RestaurantGuard></RG>} />
              <Route path="/restaurant-admin/reports" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantAdminReportsPage /></RestaurantGuard></RG>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </TourProvider>
    </PwaInstallProvider>
  </QueryClientProvider>
);

export default App;
