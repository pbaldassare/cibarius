import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import cibariusLogo from "@/assets/cibarius-logo.png";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

const MobileHeader = ({ title, showBack = false, right }: MobileHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Gradient header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-primary to-primary-dark px-4 pt-2 pb-4">
        <div className="flex h-8 items-center">
          <div className="flex w-10 items-center">
            {showBack && (
              <button onClick={() => navigate(-1)} className="text-primary-foreground -ml-1 p-1">
                <ChevronLeft size={22} />
              </button>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center gap-2">
            <img src={cibariusLogo} alt="Cibarius" className="h-5 brightness-0 invert" />
          </div>
          <div className="flex w-10 items-center justify-end text-primary-foreground">{right}</div>
        </div>
      </header>
      {/* Wave separator */}
      <div className="relative -mt-1">
        <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
          <path
            d="M0 0H1440V20C1440 20 1200 40 720 40C240 40 0 20 0 20V0Z"
            className="fill-primary-dark"
          />
          <path
            d="M0 20C0 20 240 40 720 40C1200 40 1440 20 1440 20V40H0V20Z"
            className="fill-background"
          />
        </svg>
      </div>
    </div>
  );
};

export default MobileHeader;
