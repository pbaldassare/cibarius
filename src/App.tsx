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
const RestaurantExpiryPage = lazy(() => import("./pages/restaurant/RestaurantExpiryPage"));
const RestaurantRecipesPage = lazy(() => import("./pages/restaurant/RestaurantRecipesPage"));
const RestaurantSettingsPage = lazy(() => import("./pages/restaurant/RestaurantSettingsPage"));
const RestaurantInvoicesPage = lazy(() => import("./pages/restaurant/RestaurantInvoicesPage"));
const RestaurantStockPage = lazy(() => import("./pages/restaurant/RestaurantStockPage"));
const RestaurantPreparationsPage = lazy(() => import("./pages/restaurant/RestaurantPreparationsPage"));
const RestaurantItemPage = lazy(() => import("./pages/restaurant/RestaurantItemPage"));
const RestaurantHaccpPage = lazy(() => import("./pages/restaurant/RestaurantHaccpPage"));
const RestaurantHaccpSetupPage = lazy(() => import("./pages/restaurant/RestaurantHaccpSetupPage"));
const RestaurantHaccpHistoryPage = lazy(() => import("./pages/restaurant/RestaurantHaccpHistoryPage"));
const RestaurantHaccpLabelsPage = lazy(() => import("./pages/restaurant/RestaurantHaccpLabelsPage"));
const RestaurantHaccpLabelNewPage = lazy(() => import("./pages/restaurant/RestaurantHaccpLabelNewPage"));
const RestaurantHaccpLabelDetailPage = lazy(() => import("./pages/restaurant/RestaurantHaccpLabelDetailPage"));
const PublicHaccpLabelPage = lazy(() => import("./pages/PublicHaccpLabelPage"));
const AdminHaccpLabelsPage = lazy(() => import("./pages/admin/AdminHaccpLabelsPage"));

// Restaurant admin pages
const RestaurantAdminPage = lazy(() => import("./pages/restaurant-admin/RestaurantAdminPage"));
const RestaurantAdminSettingsPage = lazy(() => import("./pages/restaurant-admin/RestaurantAdminSettingsPage"));
const RestaurantAdminStaffPage = lazy(() => import("./pages/restaurant-admin/RestaurantAdminStaffPage"));
const RestaurantAdminReportsPage = lazy(() => import("./pages/restaurant-admin/RestaurantAdminReportsPage"));
const RestaurantHaccpControlPage = lazy(() => import("./pages/restaurant-admin/RestaurantHaccpControlPage"));
const RestaurantTemperaturesPage = lazy(() => import("./pages/restaurant-admin/RestaurantTemperaturesPage"));


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
import { USER_HOME, LOGIN_PATH } from "@/lib/routes";
import { isNativeApp, vendeAbbonamenti } from "@/lib/native";

// Sito pubblico: caricato subito perche' e' la prima cosa che vede un
// visitatore e la pagina che i motori di ricerca devono trovare.
import SiteLayout from "./components/site/SiteLayout";
import { SITE_ROUTES } from "@/lib/site-routes";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { PwaInstallProvider } from "./hooks/usePwaInstall";
import { TourProvider } from "./components/AppTourContext";

const queryClient = new QueryClient();

/** Nell'app iOS le pagine d'acquisto non ci sono (vedi vendeAbbonamenti). */
const ABBONAMENTO = vendeAbbonamenti() ? <SubscriptionPage /> : <Navigate to={LOGIN_PATH} replace />;

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
      <BrowserRouter>
        {/* Dentro il Router: il banner deve sapere su che schermata si trova. */}
        <PwaInstallBanner />
        <AuthProvider>
          <Suspense
            fallback={
              <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
          <Routes>
            {/* ═══ SITO PUBBLICO (SiteLayout) ═══
                Nell'app nativa il sito non c'e': si parte dall'accesso, che
                rimanda chi ha gia' la sessione alla home del suo ruolo. */}
            {isNativeApp() ? (
              SITE_ROUTES.map(({ path }) => (
                <Route key={path} path={path} element={<Navigate to={LOGIN_PATH} replace />} />
              ))
            ) : (
              <Route element={<SiteLayout />}>
                {SITE_ROUTES.map(({ path, element }) => (
                  <Route key={path} path={path} element={element} />
                ))}
              </Route>
            )}

            {/* Public auth routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/haccp/label/:token" element={<PublicHaccpLabelPage />} />
            <Route element={<SiteLayout />}>
              {LEGAL_ROUTES.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>

              {/* ═══ USER APP (UserLayout) ═══ */}
              <Route element={<RG roles={["user", "admin"]}><UserLayout /></RG>}>
                {/* La radice ospita il sito pubblico: l'app consumer vive su /app. */}
                <Route path={USER_HOME} element={<Index />} />
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
                <Route path="/subscription" element={ABBONAMENTO} />
                <Route path="/favorites" element={<UserFavoritesPage />} />
                <Route path="/item/:itemId" element={<UserItemDetailPage />} />
                <Route path="/compare" element={<CompareProductsPage />} />
                {/* Legacy routes — redirect to home */}
                <Route path="/meals" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/meals/*" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/diet" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/plan" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/weekly-plan" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/progress" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/invite" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/messages" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/measurements" element={<Navigate to={USER_HOME} replace />} />
                <Route path="/meal-reminders" element={<Navigate to="/reminders" replace />} />
              </Route>

              {/* ═══ RESTAURANT APP (RestaurantLayout) ═══ */}
              <Route path="/restaurant/onboarding" element={<RG roles={["restaurant_owner", "admin"]}><MobileLayout /></RG>}>
                <Route index element={<RestaurantOnboardingPage />} />
              </Route>

              <Route element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><RestaurantLayout /></RestaurantGuard></RG>}>
                <Route path="/restaurant" element={<RestaurantPage />} />
                <Route path="/restaurant/products" element={<RestaurantExpiryPage />} />
                <Route path="/restaurant/stock" element={<RestaurantStockPage />} />
                <Route path="/restaurant/recipes" element={<RestaurantRecipesPage />} />
                <Route path="/restaurant/settings" element={<RestaurantSettingsPage />} />
                <Route path="/restaurant/invoices" element={<RestaurantInvoicesPage />} />
                <Route path="/restaurant/preparations" element={<RestaurantPreparationsPage />} />
                <Route path="/restaurant/item/:id" element={<RestaurantItemPage />} />
                <Route path="/restaurant/profile" element={<ProfiloPage />} />
                {/* /subscription e' dell'app consumer: il ristoratore verrebbe rimandato alla home. */}
                <Route path="/restaurant/subscription" element={ABBONAMENTO} />
                <Route path="/restaurant/haccp" element={<RestaurantHaccpPage />} />
                <Route path="/restaurant/haccp/setup" element={<RestaurantHaccpSetupPage />} />
                <Route path="/restaurant/haccp/history" element={<RestaurantHaccpHistoryPage />} />
                <Route path="/restaurant/haccp-labels" element={<RestaurantHaccpLabelsPage />} />
                <Route path="/restaurant/haccp-labels/new" element={<RestaurantHaccpLabelNewPage />} />
                <Route path="/restaurant/haccp-labels/:id" element={<RestaurantHaccpLabelDetailPage />} />
                {/* Archivio documenti unico: stessa pagina di /restaurant/invoices */}
                <Route path="/restaurant/haccp-documents" element={<RestaurantInvoicesPage />} />
              </Route>

              {/* Supplier invite (restaurant context) */}
              <Route element={<MobileLayout />}>
                <Route path="/supplier-invite" element={<RG roles={["restaurant_owner", "admin"]}><RestaurantGuard><SupplierInvitePage /></RestaurantGuard></RG>} />
              </Route>

              {/* ═══ SUPPLIER ═══ */}
              <Route element={<MobileLayout />}>
                <Route path="/supplier" element={<RG roles={["supplier", "admin"]}><SupplierPage /></RG>} />
                <Route path="/supplier/restaurants" element={<RG roles={["supplier", "admin"]}><SupplierRestaurantsPage /></RG>} />
                <Route path="/supplier/catalog" element={<RG roles={["supplier", "admin"]}><SupplierCatalogPage /></RG>} />
                <Route path="/supplier/reports" element={<RG roles={["supplier", "admin"]}><SupplierReportsPage /></RG>} />
                <Route path="/supplier/profile" element={<RG roles={["supplier", "admin"]}><ProfiloPage /></RG>} />
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
