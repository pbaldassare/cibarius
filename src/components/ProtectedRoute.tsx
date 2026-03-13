import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Loader2 } from "lucide-react";
import OnboardingWalkthrough, { shouldShowOnboarding } from "@/components/OnboardingWalkthrough";

const ProtectedRoute = () => {
  const { session, loading } = useAuth();
  const { role, isLoading: roleLoading } = useRole();
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding());

  if (loading || (session && roleLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" replace />;
  }

  if (showOnboarding) {
    return (
      <OnboardingWalkthrough
        role={role}
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
