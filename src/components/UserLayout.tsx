import { Outlet } from "react-router-dom";
import UserBottomNav from "./UserBottomNav";

/**
 * Consumer-style layout: airy spacing, premium feel, max-w-lg centered.
 */
const UserLayout = () => {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background user-app">
      <Outlet />
      <div className="h-[calc(72px+env(safe-area-inset-bottom,0px)+16px)]" />
      <UserBottomNav />
    </div>
  );
};

export default UserLayout;
