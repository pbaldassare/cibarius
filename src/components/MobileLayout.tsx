import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

const MobileLayout = () => {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background pb-safe">
      <Outlet />
      <div className="h-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px))]" />
      <BottomNav />
    </div>
  );
};

export default MobileLayout;
