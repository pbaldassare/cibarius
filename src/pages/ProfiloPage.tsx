import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Settings, Heart, Bell, HelpCircle, LogOut } from "lucide-react";

const menuItems = [
  { icon: Heart, label: "Preferiti", count: 12 },
  { icon: Bell, label: "Notifiche" },
  { icon: Settings, label: "Impostazioni" },
  { icon: HelpCircle, label: "Aiuto" },
];

const ProfiloPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div>
      <MobileHeader title="Profilo" />
      <main className="px-4 py-5 space-y-6">
        {/* Avatar section */}
        <div className="flex flex-col items-center py-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
            👤
          </div>
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            {user?.user_metadata?.full_name || "Utente"}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Scansioni", value: "48" },
            { label: "Preferiti", value: "12" },
            { label: "Pasti", value: "23" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-xl bg-secondary p-3"
            >
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <item.icon size={20} className="text-primary shrink-0" />
              <span className="flex-1 text-sm font-medium text-card-foreground">{item.label}</span>
              {item.count && (
                <span className="text-xs text-muted-foreground mr-1">{item.count}</span>
              )}
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive transition-colors active:bg-destructive/5"
        >
          <LogOut size={16} />
          Esci
        </button>
      </main>
    </div>
  );
};

export default ProfiloPage;
