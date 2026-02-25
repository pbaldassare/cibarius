import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

const MobileLayout = () => {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <Outlet />
      <div className="h-[calc(72px+env(safe-area-inset-bottom,0px)+16px)]" />
      <BottomNav />
    </div>
  );
};

export default MobileLayout;
