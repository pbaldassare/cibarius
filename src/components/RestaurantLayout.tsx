import { Outlet } from "react-router-dom";
import RestaurantBottomNav from "./RestaurantBottomNav";

/**
 * Operational layout: denser, high-contrast, full-width, work-focused.
 */
const RestaurantLayout = () => {
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background restaurant-app">
      <Outlet />
      <div className="h-[calc(64px+env(safe-area-inset-bottom,0px)+12px)]" />
      <RestaurantBottomNav />
    </div>
  );
};

export default RestaurantLayout;
