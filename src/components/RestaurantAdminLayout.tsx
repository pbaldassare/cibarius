import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { LayoutDashboard, Store, Users, FileText, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import cibariusLogo from "@/assets/cibarius-logo.png";

const sidebarItems = [
  { to: "/restaurant-admin", icon: LayoutDashboard, label: "Panoramica" },
  { to: "/restaurant-admin/settings", icon: Store, label: "Dati ristorante" },
  { to: "/restaurant-admin/staff", icon: Users, label: "Staff" },
  { to: "/restaurant-admin/reports", icon: FileText, label: "Report" },
];

const RestaurantAdminLayout = ({ children }: { children: ReactNode }) => {
  const { signOut } = useAuth();
  const { restaurant } = useRestaurant();
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
        <div className="border-b border-white/10 px-6 py-3">
          <p className="text-xs text-white/60">Ristorante</p>
          <p className="truncate text-sm font-semibold text-white">{restaurant?.name ?? "—"}</p>
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
        <div className="border-t border-white/10 p-3 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => navigate("/restaurant")}
          >
            <ArrowLeft size={18} />
            Vai all'App operativa
          </Button>
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

      {/* Content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 bg-gradient-to-r from-primary to-primary-dark px-4 md:hidden">
          <img src={cibariusLogo} alt="Cibarius" className="h-6 brightness-0 invert" />
          <span className="text-sm font-semibold text-white">{restaurant?.name ?? ""}</span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default RestaurantAdminLayout;
