import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, AlertTriangle, ClipboardList, UtensilsCrossed, TrendingUp, User, LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TabItem { to: string; icon: LucideIcon; label: string; requiresPlan?: boolean }

const tabs: TabItem[] = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/expiry", icon: AlertTriangle, label: "Scadenze" },
  { to: "/plan", icon: ClipboardList, label: "Piano" },
  { to: "/meals", icon: UtensilsCrossed, label: "Pasti", requiresPlan: true },
  { to: "/progress", icon: TrendingUp, label: "Progressi", requiresPlan: true },
  { to: "/profile", icon: User, label: "Profilo" },
];

const UserBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasActivePlan, setHasActivePlan] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("read_at", null);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();

    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkPlan = async () => {
      const { data } = await supabase
        .from("diet_plans")
        .select("id")
        .eq("client_user_id", user.id)
        .eq("is_active", true)
        .limit(1);
      setHasActivePlan(!!(data && data.length > 0));
    };
    checkPlan();
  }, [user]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(135deg, hsl(196, 88%, 54%) 0%, hsl(201, 89%, 39%) 100%)",
      }}
    >
      <div className="mx-auto flex h-[64px] max-w-lg items-center justify-around px-1">
        {tabs.map(({ to, icon: Icon, label, requiresPlan }) => {
          const isActive = location.pathname === to;
          const showBadge = to === "/profile" && unreadCount > 0;
          const disabled = requiresPlan && !hasActivePlan;

          if (disabled) {
            return (
              <div
                key={to}
                className="flex flex-col items-center gap-0.5 px-1 py-1 opacity-30 cursor-not-allowed"
              >
                <Icon size={18} strokeWidth={1.6} className="text-white/60" />
                <span className="text-[9px] text-white/60 font-medium">{label}</span>
              </div>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 px-1 py-1 relative"
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className={`transition-colors ${isActive ? "text-white" : "text-white/60"}`}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
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
