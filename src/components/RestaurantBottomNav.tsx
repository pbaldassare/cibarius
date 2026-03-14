import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Clock, ChefHat, BookOpen, FileText, ClipboardCheck } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface TabItem { to: string; icon: LucideIcon; label: string; tourId: string }

const tabs: TabItem[] = [
  { to: "/restaurant", icon: LayoutDashboard, label: "Home", tourId: "rest-nav-home" },
  { to: "/restaurant/haccp", icon: ClipboardCheck, label: "HACCP", tourId: "rest-nav-haccp" },
  { to: "/restaurant/products", icon: Clock, label: "Scadenze", tourId: "rest-nav-products" },
  { to: "/restaurant/preparations", icon: ChefHat, label: "Preparaz.", tourId: "rest-nav-preparations" },
  { to: "/restaurant/invoices", icon: FileText, label: "Bolle", tourId: "rest-nav-invoices" },
];

const RestaurantBottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "hsl(220, 20%, 14%)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-1">
        {tabs.map(({ to, icon: Icon, label, tourId }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              data-tour={tourId}
              className="flex flex-col items-center gap-0.5 px-2 py-1 relative"
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={`transition-colors ${isActive ? "text-primary" : "text-white/50"}`}
              />
              <span
                className={`text-[10px] tracking-wide transition-colors ${
                  isActive ? "text-primary font-bold" : "text-white/50 font-medium"
                }`}
              >
                {label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}
      </div>
      <div className="safe-bottom" />
    </nav>
  );
};

export default RestaurantBottomNav;
