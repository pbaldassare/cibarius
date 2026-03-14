import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { searchFoodProgressive, FoodSearchResult, SearchPhase } from "@/lib/search-food";
import {
  Loader2, Sparkles, ClipboardList, Trophy, Flame, Plus, Trash2,
  ChevronDown, Lightbulb, BookOpen, Bookmark, Send, Eye,
  UserCheck, ArrowRight, ShoppingCart, CalendarDays, Ruler,
  Search, MapPin, UserPlus, X, Monitor, Building2, GraduationCap, Pencil, Info, Crown,
} from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

const MEAL_ORDER = ["colazione", "pranzo", "spuntino", "cena"];

const TEMPLATE_INFO: Record<string, { target: string; goals: string; description: string }> = {
  mediterranea: {
    target: "Adatto a tutti: adulti, famiglie e chi vuole mangiare bene senza rinunce.",
    goals: "Mantenere un peso sano, proteggere il cuore, avere più energia ogni giorno.",
    description: "La dieta mediterranea si basa su cereali integrali, frutta, verdura, legumi, pesce e olio d'oliva. È equilibrata, gustosa e riconosciuta come una delle più salutari al mondo. Facile da seguire a lungo termine.",
  },
  keto: {
    target: "Per chi vuole perdere grasso in modo rapido e ha voglia di impegnarsi con costanza.",
    goals: "Bruciare grassi come energia principale, ridurre la fame nervosa, migliorare concentrazione e lucidità.",
    description: "La dieta chetogenica riduce molto i carboidrati (sotto i 50g al giorno) e aumenta i grassi buoni. Il corpo entra in uno stato chiamato 'chetosi' e brucia i grassi come carburante. Richiede attenzione nella scelta degli alimenti.",
  },
  digiuno: {
    target: "Per chi ha un ritmo di vita flessibile e preferisce pasti concentrati in poche ore.",
    goals: "Migliorare il metabolismo, favorire la rigenerazione cellulare, semplificare la gestione dei pasti.",
    description: "Il digiuno intermittente alterna finestre di alimentazione (es. 8 ore) a periodi di digiuno (es. 16 ore). Non si tratta di mangiare meno, ma di concentrare i pasti. Aiuta a regolare gli zuccheri nel sangue e a ridurre l'infiammazione.",
  },
  massa: {
    target: "Per chi si allena regolarmente e vuole costruire muscolo in modo pulito.",
    goals: "Aumentare la massa muscolare, migliorare la forza, supportare il recupero dopo l'allenamento.",
    description: "Il piano di massa prevede un surplus calorico controllato con alto apporto proteico, carboidrati abbondanti per l'energia e grassi bilanciati. Ideale da abbinare a un programma di allenamento con i pesi.",
  },
  dimagrimento: {
    target: "Per chi vuole perdere peso in modo graduale e sostenibile, senza diete estreme.",
    goals: "Ridurre il grasso corporeo, mantenere la massa muscolare, migliorare il rapporto con il cibo.",
    description: "Il piano dimagrimento crea un leggero deficit calorico, con proteine alte per proteggere i muscoli e carboidrati e grassi bilanciati per avere energia. Non è una dieta punitiva: è un percorso che puoi mantenere nel tempo.",
  },
  vegetariana: {
    target: "Per chi non mangia carne o pesce e vuole un'alimentazione completa e varia.",
    goals: "Coprire tutti i nutrienti senza proteine animali dirette, mantenere energia e benessere.",
    description: "Il piano vegetariano include legumi, uova, latticini, cereali, frutta e verdura. Attenzione a combinare bene le proteine vegetali (es. cereali + legumi) per ottenere tutti gli aminoacidi essenziali.",
  },
  vegana: {
    target: "Per chi segue uno stile di vita 100% vegetale e vuole nutrirsi in modo bilanciato.",
    goals: "Raggiungere un apporto proteico adeguato, coprire vitamine B12, ferro e omega-3.",
    description: "Il piano vegano si basa su legumi, cereali, tofu, tempeh, frutta secca, semi e tanta verdura. Fondamentale integrare vitamina B12. Con le giuste combinazioni alimentari si può essere in piena forma senza prodotti animali.",
  },
};

interface TodayMealData {
  meal_type: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface PlanItem {
  id: string;
  meal_type: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  sugars_g: number;
  fats_g: number;
  notes: string | null;
}

interface ProProfile {
  user_id: string;
  display_name: string;
  specialization: string;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  additional_roles: string[] | null;
  workplace: string | null;
  works_online: boolean;
  works_in_person: boolean;
}

const UserDietPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isActive: plusActive } = useSubscription("user_plus");
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<any[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [proProfile, setProProfile] = useState<{ full_name: string | null; email: string } | null>(null);
  const [proDetailProfile, setProDetailProfile] = useState<ProProfile | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<TodayMealData[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [nextAppointment, setNextAppointment] = useState<any>(null);

  // Coach search (when no plan)
  const [coaches, setCoaches] = useState<ProProfile[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [coachSearch, setCoachSearch] = useState("");
  const [coachDialogOpen, setCoachDialogOpen] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [requestMap, setRequestMap] = useState<Record<string, "pending" | "active">>({});

  // Self-plan wizard
  const [showSelfPlan, setShowSelfPlan] = useState(false);
  const [selfPlanTitle, setSelfPlanTitle] = useState("Il mio piano");
  const [selfKcal, setSelfKcal] = useState("2000");
  const [selfProtein, setSelfProtein] = useState("120");
  const [selfCarbs, setSelfCarbs] = useState("220");
  const [selfFats, setSelfFats] = useState("70");
  const [selfNotes, setSelfNotes] = useState("");
  const [savingSelfPlan, setSavingSelfPlan] = useState(false);
  const [selfStep, setSelfStep] = useState<1 | 2>(1);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // System templates for "Usa template"
  const [systemTemplates, setSystemTemplates] = useState<any[]>([]);
  const [showTemplateList, setShowTemplateList] = useState(false);

  // Self-plan food items
  const [selfPlanItems, setSelfPlanItems] = useState<Array<{
    meal_type: string; food_name: string; quantity: number; unit: string;
    calories: number; protein_g: number; carbs_g: number; sugars_g: number; fats_g: number;
  }>>([]);
  const [selfAddingFor, setSelfAddingFor] = useState<string | null>(null);
  const [selfFoodSearch, setSelfFoodSearch] = useState("");
  const debouncedSelfSearch = useDebounce(selfFoodSearch, 300);
  const [selfFoodResults, setSelfFoodResults] = useState<FoodSearchResult[]>([]);
  const [selfSearching, setSelfSearching] = useState(false);
  const [selfSearchPhase, setSelfSearchPhase] = useState<SearchPhase>("done");

  // Meal items expand
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirmTemplate, setConfirmTemplate] = useState<any>(null);
  const [confirmKcalOverride, setConfirmKcalOverride] = useState<string>("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const getTemplateInfo = (title: string) => {
    const lower = title.toLowerCase();
    for (const [key, info] of Object.entries(TEMPLATE_INFO)) {
      if (lower.includes(key)) return info;
    }
    return {
      target: "Adatto a chi cerca un'alimentazione bilanciata e personalizzata.",
      goals: "Migliorare il benessere generale, mantenere un peso sano e avere più energia.",
      description: "Questo piano fornisce una ripartizione equilibrata di proteine, carboidrati e grassi calibrata sui tuoi fabbisogni giornalieri. Segui le indicazioni per ottenere risultati concreti nel tempo.",
    };
  };

  const loadData = async () => {
    if (!user) return;
    // 1. Active plan
    const { data: plans } = await supabase
      .from("diet_plans")
      .select("*, diet_plan_meal_targets(*)")
      .eq("client_user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (plans && plans.length > 0) {
      const p = plans[0] as any;
      setPlan(p);
      setMealTargets(p.diet_plan_meal_targets || []);

      const { data: items } = await supabase
        .from("diet_plan_items")
        .select("*")
        .eq("diet_plan_id", p.id)
        .order("sort_order");
      if (items) setPlanItems(items as any);

      const { data: link } = await supabase
        .from("client_links")
        .select("professional_id")
        .eq("client_user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const proId = link?.professional_id || p.professional_id;
      if (proId && proId !== user.id) {
        const [profRes, proDetailRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email").eq("id", proId).single(),
          supabase.from("professional_profiles").select("display_name, specialization, city, bio, photo_url").eq("user_id", proId).maybeSingle(),
        ]);
        if (profRes.data) setProProfile(profRes.data);
        if (proDetailRes.data) setProDetailProfile(proDetailRes.data as any);
      }
    } else {
      setPlan(null);
      setPlanItems([]);
      setMealTargets([]);
      setProProfile(null);
      setProDetailProfile(null);
      loadCoaches();
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: dayData } = await supabase
      .from("meal_days")
      .select("id, meals(id, meal_type, meal_items(calories, macros))")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();

    if (dayData) {
      const meals = (dayData as any).meals || [];
      const grouped: TodayMealData[] = meals.map((m: any) => {
        const items = m.meal_items || [];
        return {
          meal_type: m.meal_type,
          kcal: items.reduce((s: number, i: any) => s + (i.calories ?? 0), 0),
          protein: items.reduce((s: number, i: any) => s + ((i.macros as any)?.protein ?? 0), 0),
          carbs: items.reduce((s: number, i: any) => s + ((i.macros as any)?.carbs ?? 0), 0),
          fats: items.reduce((s: number, i: any) => s + ((i.macros as any)?.fats ?? 0), 0),
        };
      });
      setTodayMeals(grouped);
    }

    const { data: suggs } = await supabase
      .from("pro_suggestions")
      .select("*")
      .eq("client_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setSuggestions(suggs ?? []);

    const { data: appt } = await supabase
      .from("appointments")
      .select("*")
      .eq("client_user_id", user.id)
      .eq("status", "scheduled")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    setNextAppointment(appt);

    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadCoaches = async () => {
    setLoadingCoaches(true);
    const { data } = await supabase
      .from("professional_profiles")
      .select("user_id, display_name, specialization, city, bio, photo_url, experience_years, additional_roles, workplace, works_online, works_in_person, is_visible")
      .eq("is_visible", true)
      .limit(20);
    setCoaches((data ?? []) as any);

    // Load existing request/link statuses
    if (user) {
      const [reqRes, linkRes] = await Promise.all([
        supabase.from("professional_link_requests").select("professional_id, status").eq("user_id", user.id),
        supabase.from("client_links").select("professional_id, status").eq("client_user_id", user.id).eq("status", "active"),
      ]);
      const map: Record<string, "pending" | "active"> = {};
      (reqRes.data ?? []).forEach((r: any) => { if (r.status === "pending") map[r.professional_id] = "pending"; });
      (linkRes.data ?? []).forEach((r: any) => { map[r.professional_id] = "active"; });
      setRequestMap(map);
    }

    setLoadingCoaches(false);
  };

  const handleContactCoach = async (coachId: string) => {
    if (!user) return;
    setSendingRequest(coachId);
    try {
      const { error } = await supabase.from("professional_link_requests").insert({
        user_id: user.id,
        professional_id: coachId,
        status: "pending",
      });
      if (error) throw error;

      // Send in-app notification to the professional
      await supabase.from("in_app_notifications").insert({
        user_id: coachId,
        type: "link_request",
        title: "Nuova richiesta di collegamento",
        body: `Un utente vuole collegarsi con te.`,
      });

      setRequestMap((prev) => ({ ...prev, [coachId]: "pending" }));
      toast({ title: "Richiesta inviata!", description: "Il professionista riceverà una notifica." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    } finally {
      setSendingRequest(null);
    }
  };

  const markSeen = async (id: string) => {
    await supabase.from("pro_suggestions").update({ seen_at: new Date().toISOString() }).eq("id", id);
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, seen_at: new Date().toISOString() } : s)));
  };

  // Load system templates
  useEffect(() => {
    supabase
      .from("diet_plan_templates")
      .select("*, diet_plan_template_meals(*)")
      .eq("professional_id", "00000000-0000-0000-0000-000000000000")
      .order("title")
      .then(({ data }) => setSystemTemplates(data ?? []));
  }, []);

  // Progressive food search for self-plan
  useEffect(() => {
    if (!debouncedSelfSearch || debouncedSelfSearch.length < 2) {
      setSelfFoodResults([]);
      setSelfSearchPhase("done");
      return;
    }
    setSelfSearching(true);
    setSelfSearchPhase("local");
    const cancel = searchFoodProgressive(debouncedSelfSearch, (results, phase, done) => {
      setSelfFoodResults(results.slice(0, 20));
      setSelfSearchPhase(phase);
      if (done) setSelfSearching(false);
    });
    return cancel;
  }, [debouncedSelfSearch]);

  const addSelfFoodItem = (result: FoodSearchResult, mealType: string) => {
    setSelfPlanItems((prev) => [...prev, {
      meal_type: mealType,
      food_name: result.name,
      quantity: 100,
      unit: "g",
      calories: Math.round(result.calories_100g ?? 0),
      protein_g: Math.round((result.protein_100g ?? 0) * 10) / 10,
      carbs_g: Math.round((result.carbs_100g ?? 0) * 10) / 10,
      sugars_g: 0,
      fats_g: Math.round((result.fats_100g ?? 0) * 10) / 10,
    }]);
    setSelfAddingFor(null);
    setSelfFoodSearch("");
    setSelfFoodResults([]);
  };

  const removeSelfFoodItem = (idx: number) => {
    setSelfPlanItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSelfFoodQty = (idx: number, newQtyStr: string) => {
    setSelfPlanItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      const oldQty = item.quantity || 100;
      const newQty = parseFloat(newQtyStr) || 0;
      const ratio = oldQty > 0 ? newQty / oldQty : 1;
      item.quantity = newQty;
      item.calories = Math.round(item.calories * ratio);
      item.protein_g = Math.round(item.protein_g * ratio * 10) / 10;
      item.carbs_g = Math.round(item.carbs_g * ratio * 10) / 10;
      item.sugars_g = Math.round(item.sugars_g * ratio * 10) / 10;
      item.fats_g = Math.round(item.fats_g * ratio * 10) / 10;
      updated[idx] = item;
      return updated;
    });
  };

  const applyTemplate = (tmpl: any) => {
    setSelfPlanTitle(tmpl.title);
    setSelfKcal(String(tmpl.kcal_day));
    setSelfProtein(String(tmpl.protein_g_day));
    setSelfCarbs(String(tmpl.carbs_g_day));
    setSelfFats(String(tmpl.fats_g_day));
    setSelfNotes(tmpl.notes || "");
    setShowTemplateList(false);
    toast({ title: `Template "${tmpl.title}" applicato` });
  };

  const openEditPlan = () => {
    if (!plan || !isSelfPlan) return;
    setSelfPlanTitle(plan.title || "Il mio piano");
    setSelfKcal(String(plan.kcal_day));
    setSelfProtein(String(plan.protein_g_day));
    setSelfCarbs(String(plan.carbs_g_day));
    setSelfFats(String(plan.fats_g_day));
    setSelfNotes(plan.notes || "");
    setSelfPlanItems(planItems.map(i => ({
      meal_type: i.meal_type,
      food_name: i.food_name,
      quantity: i.quantity,
      unit: i.unit,
      calories: i.calories,
      protein_g: i.protein_g,
      carbs_g: i.carbs_g,
      sugars_g: i.sugars_g,
      fats_g: i.fats_g,
    })));
    setEditingPlanId(plan.id);
    setSelfStep(1);
    setShowSelfPlan(true);
  };

  const isSelfPlan = plan ? (plan.professional_id === plan.client_user_id) || !proProfile : false;

  const handleDeactivatePlan = async () => {
    if (!plan || !user) return;
    setDeactivating(true);
    const { error } = await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("id", plan.id);
    setDeactivating(false);
    setConfirmDeactivate(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Piano disattivato" });
      await loadData();
    }
  };

  const handleCreateSelfPlan = async () => {
    if (!user) return;
    setSavingSelfPlan(true);
    try {
      const kcal = parseFloat(selfKcal) || 2000;
      const protein = parseFloat(selfProtein) || 120;
      const carbs = parseFloat(selfCarbs) || 220;
      const fats = parseFloat(selfFats) || 70;

      let planId = editingPlanId;

      if (editingPlanId) {
        // Update existing plan
        const { error } = await supabase.from("diet_plans").update({
          title: selfPlanTitle,
          kcal_day: kcal,
          protein_g_day: protein,
          carbs_g_day: carbs,
          fats_g_day: fats,
          notes: selfNotes || null,
        }).eq("id", editingPlanId);
        if (error) throw error;

        // Delete old items, re-insert
        await supabase.from("diet_plan_items").delete().eq("diet_plan_id", editingPlanId);
      } else {
        // Create new plan
        const { data: newPlan, error } = await supabase.from("diet_plans").insert({
          professional_id: user.id,
          client_user_id: user.id,
          title: selfPlanTitle,
          kcal_day: kcal,
          protein_g_day: protein,
          carbs_g_day: carbs,
          fats_g_day: fats,
          notes: selfNotes || null,
          is_active: true,
        }).select().single();
        if (error) throw error;
        planId = newPlan.id;
      }

      // Save plan items
      if (selfPlanItems.length > 0 && planId) {
        await supabase.from("diet_plan_items").insert(
          selfPlanItems.map((item, idx) => ({
            diet_plan_id: planId,
            meal_type: item.meal_type,
            food_name: item.food_name,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.calories,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            sugars_g: item.sugars_g,
            fats_g: item.fats_g,
            sort_order: idx,
          }))
        );
      }

      // Create/update nutrition targets
      await supabase.from("nutrition_targets").upsert({
        user_id: user.id, kcal_day: kcal, protein_g: protein, carbs_g: carbs, fats_g: fats,
      }, { onConflict: "user_id" });

      toast({ title: editingPlanId ? "Piano aggiornato! ✅" : "Piano creato! 🎉" });
      setShowSelfPlan(false);
      setEditingPlanId(null);
      await loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err?.message });
    }
    setSavingSelfPlan(false);
  };

  const toggleMealExpand = (mealType: string) => {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealType)) next.delete(mealType);
      else next.add(mealType);
      return next;
    });
  };

  // Computed totals
  const todayTotals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => ({ kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fats: acc.fats + m.fats }),
      { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [todayMeals]);

  const insight = useMemo(() => {
    if (!plan) return null;
    const remaining = {
      kcal: plan.kcal_day - todayTotals.kcal,
      protein: plan.protein_g_day - todayTotals.protein,
      carbs: plan.carbs_g_day - todayTotals.carbs,
      fats: plan.fats_g_day - todayTotals.fats,
    };
    const loggedTypes = todayMeals.map((m) => m.meal_type);
    const targetTypes = mealTargets.map((t: any) => t.meal_type);
    const missingMeals = targetTypes.filter((t: string) => !loggedTypes.includes(t));

    if (missingMeals.length > 0 && missingMeals.length <= 2) {
      const names = missingMeals.map((t: string) => MEAL_LABELS[t]?.replace(/^..\s/, "") || t).join(" e ");
      return { icon: "🍽️", text: `Non hai ancora registrato: ${names}. Aggiungili per completare la giornata!` };
    }
    if (remaining.protein > 15) return { icon: "💪", text: `Ti mancano ancora ~${Math.round(remaining.protein)}g di proteine oggi.` };
    if (remaining.carbs < -20) return { icon: "⚡", text: `Oggi sei alto di carbo (+${Math.round(Math.abs(remaining.carbs))}g).` };
    if (remaining.fats < -10) return { icon: "🫒", text: `Grassi un po' sopra target (+${Math.round(Math.abs(remaining.fats))}g).` };
    if (remaining.kcal > 0 && remaining.kcal < plan.kcal_day * 0.3) return { icon: "🎯", text: `Sei in pista! Mancano solo ${Math.round(remaining.kcal)} kcal.` };
    if (remaining.kcal <= 0) return { icon: "✅", text: `Hai raggiunto il tuo obiettivo calorico! Complimenti.` };
    return null;
  }, [plan, todayTotals, todayMeals, mealTargets]);

  if (loading) {
    return (
      <div>
        <MobileHeader title="Il mio piano" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  // savingTemplate state is declared at top

  const saveTemplateAsPlan = async (tmpl: any) => {
    if (!user || savingTemplate) return;
    setSavingTemplate(true);
    try {
      // Deactivate only self-plans (RLS blocks update on pro-created plans)
      await supabase.from("diet_plans").update({ is_active: false })
        .eq("client_user_id", user.id)
        .eq("professional_id", user.id)
        .eq("is_active", true);

      const { data: newPlan, error } = await supabase.from("diet_plans").insert({
        professional_id: user.id,
        client_user_id: user.id,
        title: tmpl.title,
        kcal_day: tmpl.kcal_day,
        protein_g_day: tmpl.protein_g_day,
        carbs_g_day: tmpl.carbs_g_day,
        fats_g_day: tmpl.fats_g_day,
        notes: tmpl.notes || null,
        is_active: true,
      }).select().single();
      if (error) throw error;

      // Copy template meals as meal targets
      const meals = tmpl.diet_plan_template_meals || [];
      if (meals.length > 0) {
        await supabase.from("diet_plan_meal_targets").insert(
          meals.map((m: any) => ({
            diet_plan_id: newPlan.id,
            meal_type: m.meal_type,
            kcal_target: m.kcal_target,
            protein_g: m.protein_g,
            carbs_g: m.carbs_g,
            fats_g: m.fats_g,
            sugars_g: m.sugars_g ?? 0,
          }))
        );
      }

      // Update nutrition targets
      await supabase.from("nutrition_targets").upsert({
        user_id: user.id,
        kcal_day: tmpl.kcal_day,
        protein_g: tmpl.protein_g_day,
        carbs_g: tmpl.carbs_g_day,
        fats_g: tmpl.fats_g_day,
      }, { onConflict: "user_id" });

      toast({ title: `Piano "${tmpl.title}" attivato! 🎉` });
      setConfirmTemplate(null);
      navigate("/plan");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err?.message });
    }
    setSavingTemplate(false);
  };

  if (!plan) {
    const filteredCoaches = coaches.filter((c) => {
      if (!coachSearch.trim()) return true;
      const q = coachSearch.toLowerCase();
      return (
        c.display_name?.toLowerCase().includes(q) ||
        c.specialization?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    });

    return (
      <div>
        <MobileHeader title="Il mio piano" />
        <main className="px-4 py-6 space-y-6">
          {/* 1. HERO — Crea il tuo piano personalizzato (paid) */}
          <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 shadow-md">
            <CardContent className="py-5 space-y-3 text-center">
              <Crown className="h-9 w-9 text-primary mx-auto" />
              <h2 className="text-lg font-bold text-foreground">Crea il tuo piano personalizzato</h2>
              <p className="text-sm text-muted-foreground">
                Personalizza calorie e macro, aggiungi i tuoi alimenti preferiti e costruisci il piano perfetto per i tuoi obiettivi.
              </p>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  if (!plusActive) { navigate("/subscription"); return; }
                  setShowSelfPlan(true);
                }}
              >
                {!plusActive && <Crown className="h-4 w-4" />}
                <Sparkles className="h-4 w-4" /> Inizia ora
                {!plusActive && <Badge variant="secondary" className="text-[9px] ml-1 bg-background/60">Plus</Badge>}
              </Button>
            </CardContent>
          </Card>

          {/* 2. CERCA UN NUTRIZIONISTA — bottone che apre dialog */}
          <Card
            className="border border-border cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => { setCoachDialogOpen(true); if (coaches.length === 0) loadCoaches(); }}
          >
            <CardContent className="py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Cerca un nutrizionista</p>
                <p className="text-[11px] text-muted-foreground">Trova il professionista giusto e invia una richiesta di contatto</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          {/* 3. PIANI STANDARD GRATUITI — templates */}
          {systemTemplates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-primary" /> Piani standard gratuiti
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {systemTemplates.map((tmpl) => (
                  <Card
                    key={tmpl.id}
                    className="border border-border cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setConfirmTemplate(tmpl)}
                  >
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-foreground">{tmpl.title}</p>
                        <Badge variant="secondary" className="text-xs">
                          <Flame className="h-3 w-3 mr-0.5" /> {tmpl.kcal_day} kcal
                        </Badge>
                      </div>
                      <div className="flex gap-3 text-[11px] text-muted-foreground">
                        <span className="text-blue-600 font-medium">P {tmpl.protein_g_day}g</span>
                        <span className="text-amber-600 font-medium">C {tmpl.carbs_g_day}g</span>
                        <span className="text-rose-600 font-medium">G {tmpl.fats_g_day}g</span>
                      </div>
                      {(() => {
                        const info = getTemplateInfo(tmpl.title);
                        return (
                          <div className="mt-1 pt-2 border-t border-dashed border-border space-y-1.5 text-[11px] text-muted-foreground">
                            <p><span className="font-semibold text-foreground">👤 Per chi:</span> {info.target}</p>
                            <p><span className="font-semibold text-foreground">🎯 Obiettivi:</span> {info.goals}</p>
                            <p><span className="font-semibold text-foreground">📋</span> {info.description}</p>
                          </div>
                        );
                      })()}
                      {tmpl.notes && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{tmpl.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {savingTemplate && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </main>

        {/* Coach search dialog */}
        <Dialog open={coachDialogOpen} onOpenChange={(open) => { setCoachDialogOpen(open); if (!open) setCoachSearch(""); }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cerca un nutrizionista</DialogTitle>
              <DialogDescription>Trova il professionista ideale e invia una richiesta di contatto gratuita.</DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, specializzazione o città..."
                value={coachSearch}
                onChange={(e) => setCoachSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            {loadingCoaches ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filteredCoaches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {coachSearch.trim() ? "Nessun risultato per la tua ricerca." : "Nessun professionista disponibile al momento."}
              </p>
            ) : (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                {filteredCoaches.map((coach, idx) => {
                  const status = requestMap[coach.user_id];
                  return (
                    <Card key={idx} className="border border-border">
                      <CardContent className="py-3 flex items-start gap-3">
                        <Avatar className="h-10 w-10 border border-primary/20">
                          {coach.photo_url && <AvatarImage src={coach.photo_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {coach.display_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{coach.display_name}</p>
                          {coach.specialization && (
                            <Badge variant="outline" className="text-[9px] mt-0.5">{coach.specialization}</Badge>
                          )}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {coach.city && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" /> {coach.city}
                              </p>
                            )}
                            {coach.experience_years != null && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <GraduationCap className="h-2.5 w-2.5" /> {coach.experience_years} anni
                              </p>
                            )}
                          </div>
                          {(coach.works_online || coach.works_in_person) && (
                            <div className="flex gap-1 mt-1">
                              {coach.works_online && <Badge variant="secondary" className="text-[8px] px-1.5 py-0 gap-0.5"><Monitor className="h-2.5 w-2.5" /> Online</Badge>}
                              {coach.works_in_person && <Badge variant="secondary" className="text-[8px] px-1.5 py-0 gap-0.5"><Building2 className="h-2.5 w-2.5" /> Presenza</Badge>}
                            </div>
                          )}
                          {coach.bio && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{coach.bio}</p>
                          )}
                        </div>
                        {status === "active" ? (
                          <Badge variant="secondary" className="text-[10px] shrink-0 gap-1"><UserCheck className="h-3 w-3" /> Collegato</Badge>
                        ) : status === "pending" ? (
                          <Badge variant="outline" className="text-[10px] shrink-0 gap-1"><Loader2 className="h-3 w-3" /> In attesa</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] gap-1 shrink-0"
                            disabled={sendingRequest === coach.user_id}
                            onClick={() => handleContactCoach(coach.user_id)}
                          >
                            {sendingRequest === coach.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                            Contatta
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Self-plan dialog — 2-step wizard */}
        <Dialog open={showSelfPlan} onOpenChange={(open) => { setShowSelfPlan(open); if (!open) { setSelfStep(1); setEditingPlanId(null); } }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selfStep === 1 ? (editingPlanId ? "Modifica il tuo piano" : "Crea il tuo piano") : "Aggiungi alimenti"}</DialogTitle>
            </DialogHeader>

            {selfStep === 1 && (
              <div className="space-y-3">
                {/* Use template button */}
                {systemTemplates.length > 0 && !editingPlanId && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => setShowTemplateList(!showTemplateList)}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      {showTemplateList ? "Nascondi template" : "Usa un template di base"}
                    </Button>
                    {showTemplateList && (
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {systemTemplates.map((tmpl: any) => (
                          <button
                            key={tmpl.id}
                            onClick={() => applyTemplate(tmpl)}
                            className="w-full text-left rounded-lg bg-secondary/40 hover:bg-secondary p-2 text-xs transition-colors"
                          >
                            <p className="font-medium text-foreground">{tmpl.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {tmpl.kcal_day} kcal · P:{tmpl.protein_g_day}g C:{tmpl.carbs_g_day}g G:{tmpl.fats_g_day}g
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">Titolo</label>
                  <Input value={selfPlanTitle} onChange={(e) => setSelfPlanTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Kcal/giorno</label>
                    <Input type="number" value={selfKcal} onChange={(e) => {
                      const newKcal = parseFloat(e.target.value) || 2000;
                      setSelfKcal(e.target.value);
                      // Auto-calculate macros for free users
                      if (!plusActive) {
                        const p = Math.round(newKcal * 0.25 / 4);
                        const c = Math.round(newKcal * 0.50 / 4);
                        const f = Math.round(newKcal * 0.25 / 9);
                        setSelfProtein(String(p));
                        setSelfCarbs(String(c));
                        setSelfFats(String(f));
                      }
                    }} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      Proteine (g)
                      {!plusActive && <Crown className="h-3 w-3 text-amber-500" />}
                    </label>
                    <Input type="number" value={selfProtein} onChange={(e) => setSelfProtein(e.target.value)} disabled={!plusActive} className={!plusActive ? "opacity-60" : ""} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      Carboidrati (g)
                      {!plusActive && <Crown className="h-3 w-3 text-amber-500" />}
                    </label>
                    <Input type="number" value={selfCarbs} onChange={(e) => setSelfCarbs(e.target.value)} disabled={!plusActive} className={!plusActive ? "opacity-60" : ""} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      Grassi (g)
                      {!plusActive && <Crown className="h-3 w-3 text-amber-500" />}
                    </label>
                    <Input type="number" value={selfFats} onChange={(e) => setSelfFats(e.target.value)} disabled={!plusActive} className={!plusActive ? "opacity-60" : ""} />
                  </div>
                </div>
                {!plusActive && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-500" />
                    I macro vengono calcolati automaticamente. Passa a <button onClick={() => navigate("/subscription")} className="text-primary font-semibold underline">Plus</button> per personalizzarli.
                  </p>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">Note (opzionale)</label>
                  <Textarea value={selfNotes} onChange={(e) => setSelfNotes(e.target.value)} rows={3} />
                </div>
              </div>
            )}

            {selfStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Aggiungi alimenti specifici per ogni pasto (opzionale).</p>
                {(["colazione", "pranzo", "spuntino", "cena"] as const).map((mt) => {
                  const items = selfPlanItems.filter((i) => i.meal_type === mt);
                  const mealKcal = items.reduce((s, i) => s + i.calories, 0);
                  return (
                    <Card key={mt} className="border border-border">
                      <CardContent className="py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold">{MEAL_LABELS[mt]}</p>
                          <span className="text-[10px] text-muted-foreground">{mealKcal} kcal</span>
                        </div>

                        {items.map((item, idx) => {
                          const globalIdx = selfPlanItems.indexOf(item);
                          return (
                            <div key={idx} className="flex items-center gap-2 text-xs bg-secondary/30 rounded-lg p-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.food_name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {item.calories} kcal · P:{item.protein_g} C:{item.carbs_g} G:{item.fats_g}
                                </p>
                              </div>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateSelfFoodQty(globalIdx, e.target.value)}
                                className="h-7 w-16 text-xs text-center"
                              />
                              <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                              <button onClick={() => removeSelfFoodItem(globalIdx)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}

                        {selfAddingFor === mt ? (
                          <div className="space-y-2 border-t border-border pt-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Cerca alimento..."
                                value={selfFoodSearch}
                                onChange={(e) => setSelfFoodSearch(e.target.value)}
                                className="h-8 text-xs pl-7 pr-7"
                                autoFocus
                              />
                              <button onClick={() => { setSelfAddingFor(null); setSelfFoodSearch(""); setSelfFoodResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                            {selfSearching && (
                              <p className="text-[10px] text-muted-foreground">
                                {selfSearchPhase === "local" ? "Ricerca locale..." : selfSearchPhase === "off" ? "Ricerca OpenFoodFacts..." : selfSearchPhase === "usda" ? "Ricerca USDA..." : "Ricerca..."}
                              </p>
                            )}
                            {selfFoodResults.length > 0 && (
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {selfFoodResults.map((f, fIdx) => (
                                  <button
                                    key={`${f.name}-${f.source}-${fIdx}`}
                                    onClick={() => addSelfFoodItem(f, mt)}
                                    className="w-full text-left rounded-lg bg-secondary/30 hover:bg-secondary p-2 text-xs transition-colors"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-medium text-foreground flex-1 truncate">{f.name}</p>
                                      <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                        f.source === "local" ? "bg-primary/15 text-primary" : f.source === "off" ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"
                                      }`}>
                                        {f.source === "local" ? "DB" : f.source === "off" ? "OFF" : "USDA"}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                      {f.calories_100g ?? 0} kcal/100g · P:{f.protein_100g ?? 0} C:{f.carbs_100g ?? 0} G:{f.fats_100g ?? 0}
                                      {f.brand ? ` · ${f.brand}` : ""}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelfAddingFor(mt)}
                            className="flex items-center gap-1 text-xs font-medium text-primary pt-1"
                          >
                            <Plus size={14} /> Aggiungi alimento
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <DialogFooter className="flex gap-2">
              {selfStep === 2 && (
                <Button variant="outline" onClick={() => setSelfStep(1)} className="flex-1">
                  Indietro
                </Button>
              )}
              {selfStep === 1 ? (
                <Button onClick={() => setSelfStep(2)} className="flex-1">
                  Avanti — Alimenti
                </Button>
              ) : (
                <Button onClick={handleCreateSelfPlan} disabled={savingSelfPlan} className="flex-1">
                  {savingSelfPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingPlanId ? "Salva modifiche" : "Crea piano"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation dialog for template activation */}
        <AlertDialog open={!!confirmTemplate} onOpenChange={(open) => { if (!open) setConfirmTemplate(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Attivare questo piano?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3" asChild>
                <div>
                  <span className="block">
                    Stai per attivare il piano <strong className="text-foreground">{confirmTemplate?.title}</strong>.
                  </span>
                  <span className="flex gap-3 text-xs">
                    <span className="text-primary font-medium">🔥 {confirmTemplate?.kcal_day} kcal</span>
                    <span className="font-medium" style={{ color: "hsl(217, 91%, 60%)" }}>P {confirmTemplate?.protein_g_day}g</span>
                    <span className="font-medium" style={{ color: "hsl(38, 92%, 50%)" }}>C {confirmTemplate?.carbs_g_day}g</span>
                    <span className="font-medium" style={{ color: "hsl(350, 89%, 60%)" }}>G {confirmTemplate?.fats_g_day}g</span>
                  </span>
                  <span className="block text-xs">Il piano precedente verrà disattivato.</span>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (!confirmTemplate) return;
                saveTemplateAsPlan(confirmTemplate);
                setConfirmTemplate(null);
              }} disabled={savingTemplate}>
                {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Conferma
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const kcalPct = plan.kcal_day > 0 ? Math.min((todayTotals.kcal / plan.kcal_day) * 100, 100) : 0;
  const proteinPct = plan.protein_g_day > 0 ? Math.min((todayTotals.protein / plan.protein_g_day) * 100, 100) : 0;
  const carbsPct = plan.carbs_g_day > 0 ? Math.min((todayTotals.carbs / plan.carbs_g_day) * 100, 100) : 0;
  const fatsPct = plan.fats_g_day > 0 ? Math.min((todayTotals.fats / plan.fats_g_day) * 100, 100) : 0;

  // isSelfPlan already computed above
  const proInitials = proProfile?.full_name
    ? proProfile.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : proDetailProfile?.display_name
    ? proDetailProfile.display_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "PR";
  const proDisplayName = proDetailProfile?.display_name || proProfile?.full_name || proProfile?.email || "Il tuo coach";

  const kcalRemaining = plan.kcal_day - todayTotals.kcal;

  return (
    <div>
      <MobileHeader title="Il mio piano" />
      <main className="px-4 py-5 pb-28 space-y-4">

        {/* ═══ 1. PROFESSIONAL CARD ═══ */}
        {!isSelfPlan && proProfile && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary/30">
                  {proDetailProfile?.photo_url && <AvatarImage src={proDetailProfile.photo_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{proInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Il tuo coach</p>
                  <p className="text-sm font-bold text-foreground truncate">Dott. {proDisplayName}</p>
                  {proDetailProfile?.specialization && (
                    <p className="text-[10px] text-muted-foreground">{proDetailProfile.specialization}</p>
                  )}
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-[10px]">
                  <UserCheck className="h-3 w-3" /> Collegato
                </Badge>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                <Button variant="ghost" size="sm" className="text-destructive h-8 px-2 text-xs gap-1.5" onClick={() => setConfirmDeactivate(true)}>
                  <X className="h-3.5 w-3.5" /> Disattiva piano
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isSelfPlan && (
          <div className="text-center py-2">
            <h2 className="text-lg font-bold text-foreground">Scegli il tuo piano nutrizionale</h2>
            <p className="text-xs text-muted-foreground mt-1">Seleziona un template gratuito adatto ai tuoi obiettivi. Puoi cambiarlo in qualsiasi momento.</p>
            {plan && (
              <Button variant="ghost" size="sm" className="text-destructive mt-2 text-xs gap-1.5" onClick={() => setConfirmDeactivate(true)}>
                <X className="h-3.5 w-3.5" /> Disattiva piano attuale
              </Button>
            )}
          </div>
        )}

        {!isSelfPlan && (<>
        {/* ═══ 2. TODAY'S PROGRESS ═══ */}
        <Card className="border-2 border-primary/20">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-primary" /> Obiettivo di oggi
              </h2>
              <span className={`text-xs font-bold ${kcalRemaining >= 0 ? "text-primary" : "text-destructive"}`}>
                {kcalRemaining >= 0
                  ? `${Math.round(kcalRemaining)} kcal rimanenti`
                  : `+${Math.round(Math.abs(kcalRemaining))} kcal in eccesso`}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(todayTotals.kcal)} kcal</span>
                <span>{plan.kcal_day} kcal</span>
              </div>
              <Progress value={kcalPct} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MacroBar label="Proteine" current={todayTotals.protein} target={plan.protein_g_day} pct={proteinPct} color="bg-blue-500" />
              <MacroBar label="Carbo" current={todayTotals.carbs} target={plan.carbs_g_day} pct={carbsPct} color="bg-amber-500" />
              <MacroBar label="Grassi" current={todayTotals.fats} target={plan.fats_g_day} pct={fatsPct} color="bg-rose-400" />
            </div>

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground font-medium w-full justify-center pt-1">
                Dettagli piano <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-1">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <DetailBox label="kcal" value={plan.kcal_day} className="text-primary" />
                  <DetailBox label="proteine" value={`${plan.protein_g_day}g`} className="text-blue-600" />
                  <DetailBox label="carbo" value={`${plan.carbs_g_day}g`} className="text-amber-600" />
                  <DetailBox label="grassi" value={`${plan.fats_g_day}g`} className="text-rose-500" />
                </div>
                {plan.notes && (
                  <p className="text-[11px] text-muted-foreground italic pt-2 border-t border-border mt-2">📝 {plan.notes}</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* ═══ 3. DAILY INSIGHT ═══ */}
        {insight && (
          <Card className="border border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3 flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Consiglio di oggi</p>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.icon} {insight.text}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ SMART RECIPES CTA ═══ */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/my-recipes")}>
          <CardContent className="py-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Genera ricette smart</p>
              <p className="text-[11px] text-muted-foreground">Crea ricette bilanciate con quello che hai in dispensa</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>

        {/* ═══ NEXT APPOINTMENT ═══ */}
        {nextAppointment && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="py-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Prossimo appuntamento</p>
                <p className="text-sm font-bold text-foreground">{nextAppointment.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(nextAppointment.starts_at).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                  {" alle "}
                  {new Date(nextAppointment.starts_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ QUICK ACTIONS GRID ═══ */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/shopping-list")}>
            <CardContent className="py-3.5 flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-primary" /></div>
              <p className="text-xs font-bold text-foreground text-center">Lista spesa</p>
            </CardContent>
          </Card>
          <Card className="border border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/messages")}>
            <CardContent className="py-3.5 flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Send className="h-5 w-5 text-primary" /></div>
              <p className="text-xs font-bold text-foreground text-center">Chat coach</p>
            </CardContent>
          </Card>
          <Card className="border border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/measurements")}>
            <CardContent className="py-3.5 flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Ruler className="h-5 w-5 text-primary" /></div>
              <p className="text-xs font-bold text-foreground text-center">Misurazioni</p>
            </CardContent>
          </Card>
        </div>

        {/* ═══ 4. MEAL TARGETS with food items ═══ */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">🍽️ Posologia per pasto</h3>
          {mealTargets
            .sort((a: any, b: any) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type))
            .map((mt: any) => {
              const logged = todayMeals.find((m) => m.meal_type === mt.meal_type);
              const eaten = logged?.kcal ?? 0;
              const diff = mt.kcal_target - eaten;
              const pct = mt.kcal_target > 0 ? Math.min((eaten / mt.kcal_target) * 100, 100) : 0;
              const mealFoods = planItems.filter((i) => i.meal_type === mt.meal_type);
              const isExpanded = expandedMeals.has(mt.meal_type);

              let statusColor = "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
              let statusText = "In target";
              if (!logged || eaten === 0) {
                statusColor = "bg-muted text-muted-foreground border-border";
                statusText = "Da registrare";
              } else if (diff > mt.kcal_target * 0.3) {
                statusColor = "bg-amber-500/15 text-amber-700 border-amber-500/30";
                statusText = `Mancano ${Math.round(diff)} kcal`;
              } else if (diff < -mt.kcal_target * 0.15) {
                statusColor = "bg-destructive/10 text-destructive border-destructive/30";
                statusText = `+${Math.round(Math.abs(diff))} kcal sopra`;
              }

              return (
                <Card key={mt.id || mt.meal_type} className="border border-border">
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{MEAL_LABELS[mt.meal_type] || mt.meal_type}</span>
                      <Badge className={`text-[10px] ${statusColor}`}>{statusText}</Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(eaten)} / {mt.kcal_target} kcal · P{mt.protein_g} C{mt.carbs_g}{mt.sugars_g > 0 ? ` (Z${mt.sugars_g})` : ""} G{mt.fats_g}
                      </span>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary gap-1 px-2" onClick={() => navigate("/meals")}>
                        <Plus className="h-3 w-3" /> Aggiungi
                      </Button>
                    </div>

                    {/* Food items collapsible */}
                    {mealFoods.length > 0 && (
                      <Collapsible open={isExpanded} onOpenChange={() => toggleMealExpand(mt.meal_type)}>
                        <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-primary font-medium w-full pt-1">
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          {mealFoods.length} aliment{mealFoods.length === 1 ? "o" : "i"} prescritti
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-1">
                          {mealFoods.map((item) => (
                            <div key={item.id} className="rounded-lg bg-secondary/40 px-2.5 py-1.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-medium text-foreground">{item.food_name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.calories} kcal</p>
                              </div>
                              <p className="text-[9px] text-muted-foreground">
                                {item.quantity}{item.unit} · P:{item.protein_g}g C:{item.carbs_g}g{item.sugars_g > 0 ? ` (Z:${item.sugars_g}g)` : ""} G:{item.fats_g}g
                                {item.notes ? ` · ${item.notes}` : ""}
                              </p>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
        </>)}

        {/* ═══ TEMPLATE GALLERY ═══ */}
        {systemTemplates.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {systemTemplates.map((tmpl) => {
                const isActive = plan?.title === tmpl.title;
                return (
                  <Card
                    key={tmpl.id}
                    className={`border cursor-pointer transition-colors ${isActive ? "border-primary border-2 bg-primary/5" : "border-border hover:border-primary/50"}`}
                    onClick={() => !isActive && setConfirmTemplate(tmpl)}
                  >
                    <CardContent className="py-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-foreground">{tmpl.title}</p>
                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px]">Attivo</Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            <Flame className="h-3 w-3 mr-0.5" /> {tmpl.kcal_day} kcal
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-3 text-[11px] text-muted-foreground">
                        <span className="text-blue-600 font-medium">P {tmpl.protein_g_day}g</span>
                        <span className="text-amber-600 font-medium">C {tmpl.carbs_g_day}g</span>
                        <span className="text-rose-600 font-medium">G {tmpl.fats_g_day}g</span>
                      </div>
                      {tmpl.notes && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{tmpl.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {savingTemplate && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        {/* ═══ ACTIONS: Cerca nutrizionista ═══ */}
        <div className="flex flex-col gap-2">
          <Button variant="ghost" onClick={() => navigate("/invite")} className="gap-2 text-muted-foreground">
            <UserPlus className="h-4 w-4" /> Cerca un nutrizionista tra i nostri professionisti
          </Button>
        </div>



        {!isSelfPlan && suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Ricette consigliate
            </h3>
            {suggestions.map((s) => {
              const p = s.payload as any;
              const isRecipe = s.type === "recipe" && p?.ingredients;
              const isNew = !s.seen_at;
              const topIngredients = isRecipe ? (p.ingredients ?? []).slice(0, 3).map((i: any) => i.name).join(", ") : "";
              const moreCount = isRecipe ? Math.max(0, (p.ingredients ?? []).length - 3) : 0;

              return (
                <Card key={s.id} className={`border overflow-hidden ${isNew ? "border-primary/30 shadow-sm" : "border-border opacity-80"}`}>
                  <CardContent className="py-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{isRecipe ? "👨‍🍳" : s.type === "food" ? "🍎" : "💬"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground truncate">{p?.title || p?.name || "Suggerimento"}</p>
                          {isNew && <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] px-1.5">Nuovo</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(s.created_at).toLocaleDateString("it-IT")}</p>
                      </div>
                    </div>
                    {isRecipe && p?.kcal_total && (
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5 font-medium"><Flame className="h-3 w-3 text-primary" /> {p.kcal_total} kcal</span>
                        {p.macros && (<><span>P: {p.macros.protein}g</span><span>C: {p.macros.carbs}g</span><span>G: {p.macros.fats}g</span></>)}
                      </div>
                    )}
                    {isRecipe && topIngredients && (
                      <p className="text-[10px] text-muted-foreground">🧾 {topIngredients}{moreCount > 0 ? ` + altri ${moreCount}` : ""}</p>
                    )}
                    {isRecipe && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" variant="default" className="h-7 text-[11px] gap-1 flex-1" onClick={() => navigate("/meals")}>
                          <Plus className="h-3 w-3" /> Aggiungi al pasto
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5"><BookOpen className="h-3 w-3" /> Apri</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 px-2"><Bookmark className="h-3 w-3" /> Salva</Button>
                      </div>
                    )}
                    {isNew && (
                      <button onClick={() => markSeen(s.id)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1">
                        <Eye className="h-3 w-3" /> Segna come letto
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation dialog for template switch */}
      <AlertDialog open={!!confirmTemplate} onOpenChange={(open) => { if (!open) setConfirmTemplate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiare piano nutrizionale?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3" asChild>
              <div>
                <span className="block">
                  Stai per attivare il piano <strong className="text-foreground">{confirmTemplate?.title}</strong>.
                </span>
                <span className="flex gap-3 text-xs">
                  <span className="text-primary font-medium">🔥 {confirmTemplate?.kcal_day} kcal</span>
                  <span className="font-medium" style={{ color: "hsl(217, 91%, 60%)" }}>P {confirmTemplate?.protein_g_day}g</span>
                  <span className="font-medium" style={{ color: "hsl(38, 92%, 50%)" }}>C {confirmTemplate?.carbs_g_day}g</span>
                  <span className="font-medium" style={{ color: "hsl(350, 89%, 60%)" }}>G {confirmTemplate?.fats_g_day}g</span>
                </span>
                {confirmTemplate?.notes && (
                  <span className="block text-xs text-muted-foreground italic">{confirmTemplate.notes}</span>
                )}
                <span className="block text-xs">Il piano precedente verrà disattivato.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!confirmTemplate) return;
              const overrideKcal = parseFloat(confirmKcalOverride);
              if (overrideKcal && overrideKcal !== confirmTemplate.kcal_day) {
                const ratio = overrideKcal / confirmTemplate.kcal_day;
                saveTemplateAsPlan({
                  ...confirmTemplate,
                  kcal_day: Math.round(overrideKcal),
                  protein_g_day: Math.round(confirmTemplate.protein_g_day * ratio),
                  carbs_g_day: Math.round(confirmTemplate.carbs_g_day * ratio),
                  fats_g_day: Math.round(confirmTemplate.fats_g_day * ratio),
                });
              } else {
                saveTemplateAsPlan(confirmTemplate);
              }
              setConfirmKcalOverride("");
            }} disabled={savingTemplate}>
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivation confirmation dialog */}
      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disattivare il piano?</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi disattivare il piano attuale? Potrai sceglierne uno nuovo subito dopo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivatePlan} disabled={deactivating} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deactivating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Disattiva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

/* ── Small helper components ── */
function MacroBar({ label, current, target, pct, color }: { label: string; current: number; target: number; pct: number; color: string; }) {
  const remaining = target - current;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="font-medium">{label}</span>
        <span>{remaining >= 0 ? `${Math.round(remaining)}g` : `+${Math.round(Math.abs(remaining))}g`}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function DetailBox({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-2">
      <p className={`text-lg font-bold ${className}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default UserDietPage;
