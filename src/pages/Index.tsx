import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { useRole, getRoleHomePath } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getPrefs } from "@/pages/RemindersPage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, Clock, ChevronRight, Package, Flame,
  ScanLine, BookOpen, UtensilsCrossed, Snowflake, Archive,
  ShoppingBag, Beef, Wheat, Droplets,
} from "lucide-react";

/* ─── types ─── */
interface ExpiryItem {
  id: string;
  expiry_date: string;
  storage_type: string;
  product: { name: string; image_url: string | null };
}

interface NutritionTarget {
  kcal_day: number;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
}

interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

/* ─── helpers ─── */
const pct = (v: number, t: number) => Math.min(Math.round((v / t) * 100), 100);

const Index = () => {
  const { user } = useAuth();
  const { role, profile, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<ExpiryItem[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState({ pantry: 0, fridge: 0, freezer: 0 });
  const [target, setTarget] = useState<NutritionTarget | null>(null);
  const [todayMacros, setTodayMacros] = useState<MacroTotals>({ kcal: 0, protein: 0, carbs: 0, fats: 0 });
  const [loading, setLoading] = useState(true);

  // Redirect non-user roles
  useEffect(() => {
    if (!roleLoading && role && role !== "user") {
      navigate(getRoleHomePath(role), { replace: true });
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString().slice(0, 10);
      const prefs = getPrefs();

      // Parallel fetches
      const [alertsRes, countsRes, targetRes, mealDayRes] = await Promise.all([
        // 1. Expiry alerts
        supabase
          .from("inventory_items")
          .select("id, expiry_date, storage_type, product:products(name, image_url)")
          .eq("owner_user_id", user.id)
          .not("expiry_date", "is", null)
          .order("expiry_date", { ascending: true })
          .limit(50),
        // 2. Inventory counts
        supabase
          .from("inventory_items")
          .select("storage_type")
          .eq("owner_user_id", user.id),
        // 3. Nutrition targets
        supabase
          .from("nutrition_targets")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        // 4. Today's meal_day
        supabase
          .from("meal_days")
          .select("id")
          .eq("user_id", user.id)
          .eq("day_date", todayISO)
          .maybeSingle(),
      ]);

      // Process alerts
      if (alertsRes.data) {
        const items = (alertsRes.data as unknown as ExpiryItem[]).filter((item) => {
          const expiry = new Date(item.expiry_date);
          const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 && prefs.showExpired) return true;
          if (diffDays >= 0 && diffDays <= prefs.daysBeforeExpiry && prefs.showExpiring) return true;
          return false;
        });
        setAlerts(items);
      }

      // Process inventory counts
      if (countsRes.data) {
        const counts = { pantry: 0, fridge: 0, freezer: 0 };
        countsRes.data.forEach((row) => {
          if (row.storage_type === "ambiente") counts.pantry++;
          else if (row.storage_type === "frigo") counts.fridge++;
          else if (row.storage_type === "freezer") counts.freezer++;
        });
        setInventoryCounts(counts);
      }

      // Process targets
      if (targetRes.data) setTarget(targetRes.data as NutritionTarget);

      // Fetch today's meals and items
      if (mealDayRes.data) {
        const { data: meals } = await supabase
          .from("meals")
          .select("id")
          .eq("meal_day_id", mealDayRes.data.id);

        if (meals && meals.length > 0) {
          const mealIds = meals.map((m) => m.id);
          const { data: items } = await supabase
            .from("meal_items")
            .select("calories, macros")
            .in("meal_id", mealIds);

          if (items) {
            const totals: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fats: 0 };
            items.forEach((it) => {
              totals.kcal += it.calories ?? 0;
              if (it.macros && typeof it.macros === "object" && !Array.isArray(it.macros)) {
                const m = it.macros as Record<string, number>;
                totals.protein += m.protein ?? 0;
                totals.carbs += m.carbs ?? 0;
                totals.fats += m.fats ?? 0;
              }
            });
            setTodayMacros(totals);
          }
        }
      }

      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const expiredCount = alerts.filter((a) => new Date(a.expiry_date) < new Date()).length;
  const expiringCount = alerts.length - expiredCount;
  const totalItems = inventoryCounts.pantry + inventoryCounts.fridge + inventoryCounts.freezer;
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buongiorno";
    if (h < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  if (loading) {
    return (
      <div>
        <MobileHeader title="Home" />
        <main className="space-y-4 px-4 py-5">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Home" />
      <main className="space-y-5 px-4 py-5">
        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ecco il riepilogo di oggi
          </p>
        </div>

        {/* ─── Quick Actions ─── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: ScanLine, label: "Scansiona", to: "/scan", color: "bg-primary/10 text-primary" },
            { icon: BookOpen, label: "Ricette", to: "/recipes", color: "bg-success/10 text-success" },
            { icon: UtensilsCrossed, label: "Pasti", to: "/meals", color: "bg-accent/10 text-accent" },
          ].map(({ icon: Icon, label, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3.5 active:scale-95 transition-transform"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>

        {/* ─── Calorie / Macro Tracker ─── */}
        {target && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                    <Flame className="h-4 w-4 text-destructive" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Oggi</span>
                </div>
                <button onClick={() => navigate("/meals")} className="text-xs font-medium text-primary">
                  Dettagli →
                </button>
              </div>

              {/* Calorie ring */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${pct(todayMacros.kcal, target.kcal_day) * 0.974} 97.4`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{todayMacros.kcal}</span>
                    <span className="text-[9px] text-muted-foreground">/ {target.kcal_day}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5">
                  {[
                    { label: "Proteine", value: todayMacros.protein, max: target.protein_g, icon: Beef, color: "bg-destructive" },
                    { label: "Carboidrati", value: todayMacros.carbs, max: target.carbs_g, icon: Wheat, color: "bg-accent" },
                    { label: "Grassi", value: todayMacros.fats, max: target.fats_g, icon: Droplets, color: "bg-primary" },
                  ].map(({ label, value, max, color }) => (
                    max ? (
                      <div key={label}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">{Math.round(value)}g / {max}g</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct(value, max)}%` }} />
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Expiry Alerts ─── */}
        {alerts.length > 0 && (
          <div className="space-y-2.5">
            <button
              onClick={() => navigate("/products")}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-3.5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Da controllare</p>
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

            <div className="space-y-1.5">
              {alerts.slice(0, 4).map((item) => {
                const expiry = new Date(item.expiry_date);
                const isExpired = expiry < new Date();
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
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
                      isExpired ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground"
                    }`}>
                      {isExpired ? "SCADUTO" : "IN SCADENZA"}
                    </Badge>
                  </div>
                );
              })}
              {alerts.length > 4 && (
                <button onClick={() => navigate("/products")} className="w-full text-center text-xs font-medium text-primary py-1.5">
                  Vedi tutti ({alerts.length}) →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Inventory Summary ─── */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Inventario</span>
              <span className="text-xs text-muted-foreground">{totalItems} prodott{totalItems === 1 ? "o" : "i"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Archive, label: "Dispensa", count: inventoryCounts.pantry, to: "/products", color: "bg-accent/10 text-accent" },
                { icon: ShoppingBag, label: "Frigo", count: inventoryCounts.fridge, to: "/products", color: "bg-primary/10 text-primary" },
                { icon: Snowflake, label: "Freezer", count: inventoryCounts.freezer, to: "/freezer", color: "bg-blue-100 text-blue-600" },
              ].map(({ icon: Icon, label, count, to, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className="flex flex-col items-center gap-1 rounded-xl bg-secondary/50 p-3 active:scale-95 transition-transform"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-lg font-bold text-foreground">{count}</span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
