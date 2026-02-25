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
      <header className="sticky top-0 z-40 bg-gradient-to-r from-primary to-primary-dark px-4 pt-3 pb-6">
        <div className="flex h-10 items-center">
          <div className="flex w-10 items-center">
            {showBack && (
              <button onClick={() => navigate(-1)} className="text-primary-foreground -ml-1 p-1">
                <ChevronLeft size={24} />
              </button>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center gap-2">
            <img src={cibariusLogo} alt="Cibarius" className="h-6 brightness-0 invert" />
          </div>
          <div className="flex w-10 items-center justify-end text-primary-foreground">{right}</div>
        </div>
        {title && (
          <h1 className="mt-1 text-center text-lg font-bold text-primary-foreground">{title}</h1>
        )}
      </header>
      {/* Wave separator */}
      <div className="relative -mt-1">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
          <path
            d="M0 0H1440V30C1440 30 1200 60 720 60C240 60 0 30 0 30V0Z"
            className="fill-primary-dark"
          />
          <path
            d="M0 30C0 30 240 60 720 60C1200 60 1440 30 1440 30V60H0V30Z"
            className="fill-background"
          />
        </svg>
      </div>
    </div>
  );
};

export default MobileHeader;
