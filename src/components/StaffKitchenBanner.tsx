import { Link } from "react-router-dom";
import { ChefHat, ChevronRight } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { STAFF_HOME } from "@/lib/restaurant-tabs";

/**
 * Accesso alla cucina per lo staff.
 *
 * Un collaboratore ha di solito un account utente, quindi dopo il login arriva
 * sulla propria home: da qui raggiunge l'HACCP del ristorante in cui lavora.
 */
const StaffKitchenBanner = () => {
  const { restaurant, isStaff } = useRestaurant();
  if (!isStaff || !restaurant) return null;

  return (
    <Link
      to={STAFF_HOME}
      className="flex items-center gap-3 rounded-[14px] border border-primary/20 bg-primary/5 p-3"
    >
      <ChefHat className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">HACCP · {restaurant.name}</p>
        <p className="text-[12px] text-muted-foreground">Registra i controlli del ristorante</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
};

export default StaffKitchenBanner;
