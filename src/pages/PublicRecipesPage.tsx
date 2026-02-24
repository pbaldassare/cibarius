import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, BookOpen, Clock, Flame } from "lucide-react";

interface PublicRecipe {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  restaurants?: { name: string } | null;
}

const CATEGORIES = ["Antipasto", "Primo", "Secondo", "Contorno", "Dolce", "Bevanda", "Altro"];

const PublicRecipesPage = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<PublicRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("recipes")
        .select("id, title, category, difficulty, prep_time_minutes, cook_time_minutes, servings, image_url, restaurants(name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      setRecipes((data ?? []) as PublicRecipe[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = recipes.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "all" && r.category !== filterCat) return false;
    return true;
  });

  return (
    <div>
      <MobileHeader title="Ricette" />
      <main className="px-4 py-5 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca ricetta…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger><SelectValue placeholder="Tutte le categorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-2 border-accent">
            <CardContent className="py-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nessuna ricetta pubblica trovata.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <Card
                key={r.id}
                className="border-2 border-accent overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/recipes/${r.id}`)}
              >
                <div className="flex">
                  {r.image_url ? (
                    <div className="w-24 h-24 shrink-0">
                      <img src={r.image_url} alt={r.title} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 shrink-0 bg-secondary flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="flex-1 py-3 px-4">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">{r.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.restaurants?.name || "Ristorante"}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {r.category && <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>}
                      {r.difficulty && <Badge variant="outline" className="text-[10px]">{r.difficulty}</Badge>}
                    </div>
                    {(r.prep_time_minutes || r.cook_time_minutes) && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {r.prep_time_minutes && <span>{r.prep_time_minutes}′ prep</span>}
                        {r.cook_time_minutes && <span>{r.cook_time_minutes}′ cottura</span>}
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicRecipesPage;
