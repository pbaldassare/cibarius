import { NavLink, useLocation } from "react-router-dom";
import { Home, AlertTriangle, ChefHat, User, LucideIcon } from "lucide-react";

interface TabItem { to: string; icon: LucideIcon; label: string }

const tabs: TabItem[] = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/expiry", icon: AlertTriangle, label: "Scadenze" },
  { to: "/anti-waste", icon: ChefHat, label: "Ricette" },
  { to: "/profile", icon: User, label: "Profilo" },
];

const tourIds: Record<string, string> = {
  "/": "nav-home",
  "/expiry": "nav-expiry",
  "/anti-waste": "nav-recipes",
  "/profile": "nav-profile",
};

const UserBottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(135deg, hsl(196, 88%, 54%) 0%, hsl(201, 89%, 39%) 100%)",
      }}
    >
      <div className="mx-auto flex h-[64px] max-w-lg items-center justify-around px-1">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;

          return (
            <NavLink
              key={to}
              to={to}
              data-tour={tourIds[to]}
              className="flex flex-col items-center gap-0.5 px-1 py-1 relative"
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.6}
                className={`transition-colors ${isActive ? "text-white" : "text-white/60"}`}
              />
              <span
                className={`text-[9px] transition-colors ${
                  isActive ? "text-white font-semibold" : "text-white/60 font-medium"
                }`}
              >
                {label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-white" />
              )}
            </NavLink>
          );
        })}
      </div>
      <div className="safe-bottom" />
    </nav>
  );
};

export default UserBottomNav;
