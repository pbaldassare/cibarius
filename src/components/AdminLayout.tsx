import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import cibariusLogo from "@/assets/cibarius-logo.png";

const sidebarItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "Utenti" },
  { to: "/admin/settings", icon: Settings, label: "Impostazioni" },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col bg-gradient-to-b from-primary to-primary-dark md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
          <img src={cibariusLogo} alt="Cibarius" className="h-6 brightness-0 invert" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {sidebarItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Esci
          </Button>
        </div>
      </aside>

      {/* Mobile header for admin */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 bg-gradient-to-r from-primary to-primary-dark px-4 md:hidden">
          <img src={cibariusLogo} alt="Cibarius" className="h-6 brightness-0 invert" />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
