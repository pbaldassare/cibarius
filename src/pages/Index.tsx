import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import SearchBar from "@/components/SearchBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getPrefs } from "@/pages/RemindersPage";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ChevronRight, Package } from "lucide-react";

interface ExpiryItem {
  id: string;
  expiry_date: string;
  storage_type: string;
  product: { name: string; image_url: string | null };
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ExpiryItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    if (!user) return;
    const prefs = getPrefs();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fetchAlerts = async () => {
      // Fetch items with expiry dates
      const { data } = await supabase
        .from("inventory_items")
        .select("id, expiry_date, storage_type, product:products(name, image_url)")
        .eq("owner_user_id", user.id)
        .not("expiry_date", "is", null)
        .order("expiry_date", { ascending: true })
        .limit(50);

      if (!data) { setLoadingAlerts(false); return; }

      const items = (data as unknown as ExpiryItem[]).filter((item) => {
        const expiry = new Date(item.expiry_date);
        const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        const isExpired = diffDays < 0;
        const isExpiring = diffDays >= 0 && diffDays <= prefs.daysBeforeExpiry;

        if (isExpired && prefs.showExpired) return true;
        if (isExpiring && prefs.showExpiring) return true;
        return false;
      });

      setAlerts(items);
      setLoadingAlerts(false);
    };

    fetchAlerts();
  }, [user]);

  const expiredCount = alerts.filter((a) => new Date(a.expiry_date) < new Date()).length;
  const expiringCount = alerts.length - expiredCount;

  return (
    <div>
      <MobileHeader title="Home" />
      <main className="space-y-5 px-4 py-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ciao! 👋</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scansiona un prodotto o cerca tra i tuoi preferiti
          </p>
        </div>

        <SearchBar />

        {/* Expiry alerts banner */}
        {!loadingAlerts && alerts.length > 0 && (
          <div className="space-y-3">
            {/* Summary banner */}
            <button
              onClick={() => navigate("/products")}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-3.5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Da controllare oggi</p>
                <p className="text-xs text-muted-foreground">
                  {expiredCount > 0 && (
                    <span className="text-destructive font-medium">{expiredCount} scadut{expiredCount === 1 ? "o" : "i"}</span>
                  )}
                  {expiredCount > 0 && expiringCount > 0 && " · "}
                  {expiringCount > 0 && (
                    <span className="text-accent font-medium">{expiringCount} in scadenza</span>
                  )}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>

            {/* Item list (max 5) */}
            <div className="space-y-1.5">
              {alerts.slice(0, 5).map((item) => {
                const expiry = new Date(item.expiry_date);
                const isExpired = expiry < new Date();
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary overflow-hidden">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {expiry.toLocaleDateString("it-IT")}
                      </p>
                    </div>
                    <Badge className={`text-[10px] font-bold rounded-lg px-2 py-0.5 ${
                      isExpired
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-accent text-accent-foreground"
                    }`}>
                      {isExpired ? "SCADUTO" : "IN SCADENZA"}
                    </Badge>
                  </div>
                );
              })}
              {alerts.length > 5 && (
                <button
                  onClick={() => navigate("/products")}
                  className="w-full text-center text-xs font-medium text-primary py-1.5"
                >
                  Vedi tutti ({alerts.length} prodotti) →
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
