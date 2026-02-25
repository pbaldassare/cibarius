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
    { to: "/scan", icon: ScanLine, label: "Scan" },
    { to: "/restaurant/products", icon: ShoppingBag, label: "Magazzino" },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/20" style={{ backgroundColor: 'hsl(196, 88%, 54%)' }}>
      <div className="mx-auto flex h-[72px] max-w-lg items-center justify-around px-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 ${
                isActive ? "bg-white/20" : ""
              }`}
            >
              <Icon
                size={23}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? "text-white" : "text-white/70"}
              />
              <span
                className={`text-[12px] font-semibold ${
                  isActive ? "text-white" : "text-white/70"
                }`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
      <div className="safe-bottom" />
    </nav>
  );
};

export default BottomNav;
