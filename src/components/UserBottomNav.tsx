import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Plus, Clock, UtensilsCrossed, User } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TabItem { to: string; icon: LucideIcon; label: string }

const tabs: TabItem[] = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/scan", icon: Plus, label: "Aggiungi" },
  { to: "/expiry", icon: Clock, label: "Scadenze" },
  { to: "/meals", icon: UtensilsCrossed, label: "Pasti" },
  { to: "/profile", icon: User, label: "Profilo" },
];

const UserBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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
          const showBadge = to === "/profile" && unreadCount > 0;
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 relative"
            >
              <div
                className={`relative flex items-center justify-center rounded-xl px-3 py-1 transition-all duration-200 ${
                  isActive ? "bg-white/15" : ""
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  className={`transition-colors ${isActive ? "text-white" : "text-white/60"}`}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] transition-colors ${
                  isActive ? "text-white font-semibold" : "text-white/60 font-medium"
                }`}
              >
                {label}
              </span>
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

export default UserBottomNav;
