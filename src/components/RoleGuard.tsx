import { Navigate } from "react-router-dom";
import { useRole, AppRole, getRoleHomePath } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: React.ReactNode;
}

const RoleGuard = ({ allowedRoles, children }: RoleGuardProps) => {
  const { session, loading: authLoading } = useAuth();
  const { role, isLoading } = useRole();

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to role-appropriate home instead of showing error
    const homePath = getRoleHomePath(role);
    return <Navigate to={homePath} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
