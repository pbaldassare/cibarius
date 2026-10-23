import { Outlet } from "react-router-dom";
import RestaurantBottomNav from "./RestaurantBottomNav";
import AppTour from "./AppTour";
import AppTourPrompt from "./AppTourPrompt";
import { useRestaurant } from "@/hooks/useRestaurant";

/**
 * Operational layout: denser, high-contrast, full-width, work-focused.
 */
const RestaurantLayout = () => {
  // Il tour del ristorante passa da pagine che lo staff non vede.
  const { isStaff } = useRestaurant();
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background restaurant-app">
      <Outlet />
      <div className="h-[calc(64px+var(--sab)+12px)]" />
      <RestaurantBottomNav />
      {!isStaff && <AppTour />}
      {!isStaff && <AppTourPrompt />}
    </div>
  );
};

export default RestaurantLayout;
