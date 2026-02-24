import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

const MobileLayout = () => {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <Outlet />
      <div className="h-[var(--nav-height)]" />
      <BottomNav />
    </div>
  );
};

export default MobileLayout;
