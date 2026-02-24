import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import MobileLayout from "./components/MobileLayout";
import Index from "./pages/Index";
import ScanPage from "./pages/ScanPage";
import ProdottiPage from "./pages/ProdottiPage";
import PastiPage from "./pages/PastiPage";
import ProfiloPage from "./pages/ProfiloPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
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

            {/* Protected app routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MobileLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/prodotti" element={<ProdottiPage />} />
                <Route path="/pasti" element={<PastiPage />} />
                <Route path="/profilo" element={<ProfiloPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
