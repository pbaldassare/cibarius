import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import AppTour from "./AppTour";
import AppTourPrompt from "./AppTourPrompt";

const MobileLayout = () => {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <Outlet />
      <div className="h-[calc(72px+var(--sab)+16px)]" />
      <BottomNav />
      <AppTour />
      <AppTourPrompt />
    </div>
  );
};

export default MobileLayout;
