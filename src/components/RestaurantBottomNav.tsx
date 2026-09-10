import { NavLink, useLocation } from "react-router-dom";
import { RESTAURANT_TABS } from "@/lib/restaurant-tabs";

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
        {RESTAURANT_TABS.map(({ to, icon: Icon, label, tourId }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              data-tour={tourId}
              className="flex flex-col items-center gap-0.5 px-1 py-1 relative min-w-0"
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={`transition-colors ${isActive ? "text-primary" : "text-white/50"}`}
              />
              <span
                className={`text-[9px] tracking-tight truncate max-w-[52px] transition-colors ${
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
