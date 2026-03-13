import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import cibariusLogo from "@/assets/cibarius-logo.png";
import UserNotificationsBell from "@/components/UserNotificationsBell";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
  hideNotifications?: boolean;
}

const MobileHeader = ({ title, showBack = true, right, hideNotifications = false }: MobileHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Gradient header – subtle, elegant */}
      <header
        className="sticky top-0 z-40 px-4 pt-2 pb-5"
        style={{
          background: "linear-gradient(135deg, hsl(196, 88%, 54%) 0%, hsl(201, 89%, 39%) 100%)",
        }}
      >
        <div className="flex h-8 items-center">
          <div className="flex w-10 items-center">
            {showBack && (
              <button onClick={() => navigate(-1)} className="text-white/90 -ml-1 p-1 active:opacity-70 transition-opacity">
                <ChevronLeft size={22} strokeWidth={2} />
              </button>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center gap-2">
            <img src={cibariusLogo} alt="Cibarius" className="h-5 brightness-0 invert" />
          </div>
          <div className="flex items-center gap-1 text-white">
            {right}
            {!hideNotifications && <UserNotificationsBell />}
          </div>
        </div>
      </header>
      {/* Smooth wave */}
      <div className="relative -mt-1">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
          <path
            d="M0 0H1440V16C1440 16 1280 48 720 48C160 48 0 16 0 16V0Z"
            fill="hsl(201, 89%, 39%)"
          />
          <path
            d="M0 16C0 16 160 48 720 48C1280 48 1440 16 1440 16V48H0V16Z"
            className="fill-background"
          />
        </svg>
      </div>
    </div>
  );
};

export default MobileHeader;
