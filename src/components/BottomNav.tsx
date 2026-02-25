import { NavLink, useLocation } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import {
  Home, ScanLine, ShoppingBag, User, UtensilsCrossed,
  Store, BookOpen, LayoutDashboard, Users, FileText,
  MessageSquare, Building2, Package, Snowflake, Archive, Clock,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

interface TabItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const tabsByRole: Record<string, TabItem[]> = {
  user: [
    { to: "/", icon: Home, label: "Home" },
    { to: "/scan", icon: ScanLine, label: "Scansiona" },
    { to: "/expiry", icon: Clock, label: "Scadenze" },
    { to: "/meals", icon: UtensilsCrossed, label: "Pasti" },
    { to: "/profile", icon: User, label: "Profilo" },
  ],
  restaurant_owner: [
    { to: "/restaurant", icon: Store, label: "Home" },
    { to: "/restaurant/products", icon: Clock, label: "Scadenze" },
    { to: "/restaurant/preparations", icon: UtensilsCrossed, label: "Preparazioni" },
    { to: "/restaurant/recipes", icon: BookOpen, label: "Ricette" },
    { to: "/profile", icon: User, label: "Profilo" },
  ],
  professional: [
    { to: "/pro", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/pro/clients", icon: Users, label: "Clienti" },
    { to: "/pro/reports", icon: FileText, label: "Report" },
    { to: "/pro/notes", icon: MessageSquare, label: "Note" },
    { to: "/profile", icon: User, label: "Profilo" },
  ],
  supplier: [
    { to: "/supplier", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/supplier/restaurants", icon: Building2, label: "Ristoranti" },
    { to: "/supplier/catalog", icon: Package, label: "Catalogo" },
    { to: "/supplier/reports", icon: FileText, label: "Report" },
    { to: "/profile", icon: User, label: "Profilo" },
  ],
  admin: [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/users", icon: Users, label: "Utenti" },
    { to: "/admin/settings", icon: Archive, label: "Impostazioni" },
    { to: "/profile", icon: User, label: "Profilo" },
  ],
};

const BottomNav = () => {
  const location = useLocation();
  const { role } = useRole();

  const tabs = tabsByRole[role ?? "user"] ?? tabsByRole.user;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(135deg, hsl(196, 88%, 54%) 0%, hsl(201, 89%, 39%) 100%)",
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-lg items-center justify-around px-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 relative"
            >
              <div
                className={`flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-200 ${
                  isActive ? "bg-white/15" : ""
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className={`transition-colors ${isActive ? "text-white" : "text-white/60"}`}
                />
              </div>
              <span
                className={`text-[11px] transition-colors ${
                  isActive ? "text-white font-semibold" : "text-white/60 font-medium"
                }`}
              >
                {label}
              </span>
              {/* Active underline */}
              {isActive && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full bg-white" />
              )}
            </NavLink>
          );
        })}
      </div>
      <div className="safe-bottom" />
    </nav>
  );
};

export default BottomNav;
