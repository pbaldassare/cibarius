import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import RestaurantGuard from "./components/RestaurantGuard";
import UserLayout from "./components/UserLayout";
import RestaurantLayout from "./components/RestaurantLayout";
import MobileLayout from "./components/MobileLayout";
import AdminPwaGuard from "./components/AdminPwaGuard";

// Auth pages
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const AuthCallbackPage = lazy(() => import("./pages/auth/AuthCallbackPage"));

// User pages
const Index = lazy(() => import("./pages/Index"));
const ExpiryPage = lazy(() => import("./pages/ExpiryPage"));
const ScanPage = lazy(() => import("./pages/ScanPage"));
const UserProductsPage = lazy(() => import("./pages/UserProductsPage"));
const UserFreezerPage = lazy(() => import("./pages/UserFreezerPage"));
const UserPantryPage = lazy(() => import("./pages/UserPantryPage"));
const ProfiloPage = lazy(() => import("./pages/ProfiloPage"));
const PublicRecipesPage = lazy(() => import("./pages/PublicRecipesPage"));
const RecipeDetailPage = lazy(() => import("./pages/RecipeDetailPage"));
const RemindersPage = lazy(() => import("./pages/RemindersPage"));
const PreparationsPage = lazy(() => import("./pages/PreparationsPage"));

// Admin pages
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminSeedPage = lazy(() => import("./pages/admin/AdminSeedPage"));
const AdminProductReviewPage = lazy(() => import("./pages/admin/AdminProductReviewPage"));
const AdminSupportPage = lazy(() => import("./pages/admin/AdminSupportPage"));
// AdminCouponsPage merged into AdminPaymentsPage
const AdminRestaurantsPage = lazy(() => import("./pages/admin/AdminRestaurantsPage"));
const AdminStatsPage = lazy(() => import("./pages/admin/AdminStatsPage"));
const AdminHaccpTemplatesPage = lazy(() => import("./pages/admin/AdminHaccpTemplatesPage"));
const AdminSubscriptionsPage = lazy(() => import("./pages/admin/AdminSubscriptionsPage"));
const AdminPaymentsPage = lazy(() => import("./pages/admin/AdminPaymentsPage"));
const AdminProductsDbPage = lazy(() => import("./pages/admin/AdminProductsDbPage"));
const AdminApiPage = lazy(() => import("./pages/admin/AdminApiPage"));

// Restaurant app pages
const RestaurantOnboardingPage = lazy(() => import("./pages/restaurant/RestaurantOnboardingPage"));
const RestaurantPage = lazy(() => import("./pages/restaurant/RestaurantPage"));
const RestaurantProductsPage = lazy(() => import("./pages/restaurant/RestaurantProductsPage"));
const RestaurantExpiryPage = lazy(() => import("./pages/restaurant/RestaurantExpiryPage"));
const RestaurantRecipesPage = lazy(() => import("./pages/restaurant/RestaurantRecipesPage"));
const RestaurantSettingsPage = lazy(() => import("./pages/restaurant/RestaurantSettingsPage"));
const RestaurantInvoicesPage = lazy(() => import("./pages/restaurant/RestaurantInvoicesPage"));
const RestaurantPreparationsPage = lazy(() => import("./pages/restaurant/RestaurantPreparationsPage"));
const RestaurantItemPage = lazy(() => import("./pages/restaurant/RestaurantItemPage"));
const RestaurantHaccpPage = lazy(() => import("./pages/restaurant/RestaurantHaccpPage"));
const RestaurantHaccpSetupPage = lazy(() => import("./pages/restaurant/RestaurantHaccpSetupPage"));
const RestaurantHaccpHistoryPage = lazy(() => import("./pages/restaurant/RestaurantHaccpHistoryPage"));
const RestaurantHaccpLabelsPage = lazy(() => import("./pages/restaurant/RestaurantHaccpLabelsPage"));
const RestaurantHaccpLabelNewPage = lazy(() => import("./pages/restaurant/RestaurantHaccpLabelNewPage"));
const RestaurantHaccpLabelDetailPage = lazy(() => import("./pages/restaurant/RestaurantHaccpLabelDetailPage"));
const RestaurantHaccpDocumentsPage = lazy(() => import("./pages/restaurant/RestaurantHaccpDocumentsPage"));
const PublicHaccpLabelPage = lazy(() => import("./pages/PublicHaccpLabelPage"));
const AdminHaccpLabelsPage = lazy(() => import("./pages/admin/AdminHaccpLabelsPage"));

// Restaurant admin pages
const RestaurantAdminPage = lazy(() => import("./pages/restaurant-admin/RestaurantAdminPage"));
const RestaurantAdminSettingsPage = lazy(() => import("./pages/restaurant-admin/RestaurantAdminSettingsPage"));
const RestaurantAdminStaffPage = lazy(() => import("./pages/restaurant-admin/RestaurantAdminStaffPage"));
const RestaurantAdminReportsPage = lazy(() => import("./pages/restaurant-admin/RestaurantAdminReportsPage"));
const RestaurantHaccpControlPage = lazy(() => import("./pages/restaurant-admin/RestaurantHaccpControlPage"));
const RestaurantTemperaturesPage = lazy(() => import("./pages/restaurant-admin/RestaurantTemperaturesPage"));

// Pro pages
const ProPage = lazy(() => import("./pages/pro/ProPage"));
const ProClientsPage = lazy(() => import("./pages/pro/ProClientsPage"));
const ProClientDetailPage = lazy(() => import("./pages/pro/ProClientDetailPage"));
const ProClientPlanPage = lazy(() => import("./pages/pro/ProClientPlanPage"));
const ProClientMonitorPage = lazy(() => import("./pages/pro/ProClientMonitorPage"));
const ProClientSuggestPage = lazy(() => import("./pages/pro/ProClientSuggestPage"));
const ProClientPantryPage = lazy(() => import("./pages/pro/ProClientPantryPage"));
const ProClientPantryRecipesPage = lazy(() => import("./pages/pro/ProClientPantryRecipesPage"));
const ProReportsPage = lazy(() => import("./pages/pro/ProReportsPage"));
const ProNotesPage = lazy(() => import("./pages/pro/ProNotesPage"));
const ProClientPlanHistoryPage = lazy(() => import("./pages/pro/ProClientPlanHistoryPage"));
const ProTemplatesPage = lazy(() => import("./pages/pro/ProTemplatesPage"));
const ProTemplateEditorPage = lazy(() => import("./pages/pro/ProTemplateEditorPage"));
const ProWeeklyReportPage = lazy(() => import("./pages/pro/ProWeeklyReportPage"));
const ProClientMessagesPage = lazy(() => import("./pages/pro/ProClientMessagesPage"));
const ProAppointmentsPage = lazy(() => import("./pages/pro/ProAppointmentsPage"));
const ProClientPlanPdfPage = lazy(() => import("./pages/pro/ProClientPlanPdfPage"));
const ProWeeklyPlanPage = lazy(() => import("./pages/pro/ProWeeklyPlanPage"));

const ProClientMeasurementsPage = lazy(() => import("./pages/pro/ProClientMeasurementsPage"));
const ProCouponPage = lazy(() => import("./pages/pro/ProCouponPage"));
const UserPantryRecipesPage = lazy(() => import("./pages/UserPantryRecipesPage"));
const ShoppingListPage = lazy(() => import("./pages/ShoppingListPage"));
const AntiWastePage = lazy(() => import("./pages/AntiWastePage"));
const UserFavoritesPage = lazy(() => import("./pages/UserFavoritesPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const UserItemDetailPage = lazy(() => import("./pages/UserItemDetailPage"));
const CompareProductsPage = lazy(() => import("./pages/CompareProductsPage"));

// Supplier pages
const SupplierPage = lazy(() => import("./pages/supplier/SupplierPage"));
const SupplierRestaurantsPage = lazy(() => import("./pages/supplier/SupplierRestaurantsPage"));
const SupplierCatalogPage = lazy(() => import("./pages/supplier/SupplierCatalogPage"));
const SupplierReportsPage = lazy(() => import("./pages/supplier/SupplierReportsPage"));
const SupplierInvitePage = lazy(() => import("./pages/supplier/SupplierInvitePage"));

const NotFound = lazy(() => import("./pages/NotFound"));
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
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
          <Routes>
            {/* Public auth routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/join/:code" element={<Navigate to="/" replace />} />
            <Route path="/n/:slug" element={<Navigate to="/" replace />} />
            <Route path="/haccp/label/:token" element={<PublicHaccpLabelPage />} />

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
                <Route path="/profile" element={<ProfiloPage />} />
                <Route path="/my-recipes" element={<UserPantryRecipesPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="/anti-waste" element={<AntiWastePage />} />
                <Route path="/suggest-meal" element={<AntiWastePage />} />
                <Route path="/recipes" element={<PublicRecipesPage />} />
                <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
                <Route path="/preparations" element={<PreparationsPage />} />
                <Route path="/shopping-list" element={<ShoppingListPage />} />
                <Route path="/subscription" element={<SubscriptionPage />} />
                <Route path="/favorites" element={<UserFavoritesPage />} />
                <Route path="/item/:itemId" element={<UserItemDetailPage />} />
                <Route path="/compare" element={<CompareProductsPage />} />
                {/* Legacy routes — redirect to home */}
                <Route path="/meals" element={<Navigate to="/" replace />} />
                <Route path="/meals/*" element={<Navigate to="/" replace />} />
                <Route path="/diet" element={<Navigate to="/" replace />} />
                <Route path="/plan" element={<Navigate to="/" replace />} />
                <Route path="/weekly-plan" element={<Navigate to="/" replace />} />
                <Route path="/progress" element={<Navigate to="/" replace />} />
                <Route path="/invite" element={<Navigate to="/" replace />} />
                <Route path="/messages" element={<Navigate to="/" replace />} />
                <Route path="/measurements" element={<Navigate to="/" replace />} />
                <Route path="/meal-reminders" element={<Navigate to="/reminders" replace />} />
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
                <Route path="/restaurant/haccp-labels" element={<RestaurantHaccpLabelsPage />} />
                <Route path="/restaurant/haccp-labels/new" element={<RestaurantHaccpLabelNewPage />} />
                <Route path="/restaurant/haccp-labels/:id" element={<RestaurantHaccpLabelDetailPage />} />
                <Route path="/restaurant/haccp-documents" element={<RestaurantHaccpDocumentsPage />} />
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
              <Route path="/admin/haccp-labels" element={<RG roles={["admin"]}><AdminPwaGuard><AdminHaccpLabelsPage /></AdminPwaGuard></RG>} />

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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </TourProvider>
    </PwaInstallProvider>
  </QueryClientProvider>
);

export default App;
