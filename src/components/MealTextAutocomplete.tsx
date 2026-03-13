import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Clock, TrendingUp, Trash2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  mealType: string;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  id: string;
  meal_text: string;
  usage_count: number;
}

const MealTextAutocomplete = ({ value, onChange, mealType, placeholder, className }: Props) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topSuggestions, setTopSuggestions] = useState<Suggestion[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load top suggestions on focus (most used)
  const loadTopSuggestions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pro_meal_text_suggestions" as any)
      .select("id, meal_text, usage_count")
      .eq("professional_id", user.id)
      .eq("meal_type", mealType)
      .order("usage_count", { ascending: false })
      .limit(8);
    setTopSuggestions((data as any[] ?? []) as Suggestion[]);
  }, [user, mealType]);

  // Search suggestions as user types
  const searchSuggestions = useCallback(async (query: string) => {
    if (!user || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from("pro_meal_text_suggestions" as any)
      .select("id, meal_text, usage_count")
      .eq("professional_id", user.id)
      .eq("meal_type", mealType)
      .ilike("meal_text", `%${query}%`)
      .order("usage_count", { ascending: false })
      .limit(6);
    setSuggestions((data as any[] ?? []) as Suggestion[]);
  }, [user, mealType]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!showSuggestions) return;
    debounceRef.current = setTimeout(() => {
      if (value.trim().length >= 2) {
        searchSuggestions(value.trim());
      } else {
        setSuggestions([]);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, showSuggestions, searchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFocus = () => {
    setShowSuggestions(true);
    loadTopSuggestions();
  };

  const applySuggestion = (text: string) => {
    onChange(text);
    setShowSuggestions(false);
  };

  const deleteSuggestion = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("pro_meal_text_suggestions" as any).delete().eq("id", id);
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
    setTopSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const displayList = value.trim().length >= 2 ? suggestions : topSuggestions;
  const showDropdown = showSuggestions && displayList.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {value.trim().length < 2 && topSuggestions.length > 0 && (
            <div className="px-3 py-1.5 flex items-center gap-1 text-[10px] text-muted-foreground border-b border-border">
              <TrendingUp className="h-3 w-3" /> Più usati
            </div>
          )}
          {displayList.map((s) => (
            <button
              key={s.id}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent/50 transition-colors group"
              onClick={() => applySuggestion(s.meal_text)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{s.meal_text}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> usato {s.usage_count}x
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={(e) => deleteSuggestion(e, s.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MealTextAutocomplete;

/**
 * Utility: save meal texts to suggestions table (call on template save).
 * Upserts each non-empty meal_text, incrementing usage_count.
 */
export const saveMealTextSuggestions = async (
  professionalId: string,
  mealTexts: { meal_type: string; meal_text: string }[]
) => {
  const filtered = mealTexts.filter((m) => m.meal_text.trim().length >= 3);
  if (filtered.length === 0) return;

  for (const item of filtered) {
    // Try to find existing
    const { data: existing } = await supabase
      .from("pro_meal_text_suggestions" as any)
      .select("id, usage_count")
      .eq("professional_id", professionalId)
      .eq("meal_type", item.meal_type)
      .eq("meal_text", item.meal_text.trim())
      .maybeSingle();

    if (existing) {
      await supabase
        .from("pro_meal_text_suggestions" as any)
        .update({ usage_count: (existing as any).usage_count + 1, updated_at: new Date().toISOString() } as any)
        .eq("id", (existing as any).id);
    } else {
      await supabase
        .from("pro_meal_text_suggestions" as any)
        .insert({
          professional_id: professionalId,
          meal_type: item.meal_type,
          meal_text: item.meal_text.trim(),
        } as any);
    }
  }
};
