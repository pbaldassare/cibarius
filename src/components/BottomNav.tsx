import { NavLink, useLocation } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import {
  Home, ScanLine, ShoppingBag, User,
  Store, BookOpen, LayoutDashboard, Users, FileText,
  MessageSquare, Building2, Package, Snowflake, Archive,
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
    { to: "/products", icon: ShoppingBag, label: "Prodotti" },
    { to: "/scan", icon: ScanLine, label: "Scansiona" },
    { to: "/freezer", icon: Snowflake, label: "Congelato" },
    { to: "/pantry", icon: Archive, label: "Dispensa" },
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
};

const BottomNav = () => {
  const location = useLocation();
  const { role } = useRole();

  if (role === "admin") return null;

  const tabs = tabsByRole[role ?? "user"] ?? tabsByRole.user;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-primary-dark safe-bottom">
      <div className="mx-auto flex h-[var(--nav-height)] max-w-lg items-center justify-around px-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 px-3 py-2"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? "text-white" : "text-white/70"}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-white" : "text-white/70"
                }`}
              >
                {label}
              </span>
              {isActive && (
                <div className="mt-0.5 h-0.5 w-4 rounded-full bg-white" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
