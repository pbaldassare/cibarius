import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

const MobileHeader = ({ title, showBack = false, right }: MobileHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex h-[var(--header-height)] items-center border-b border-border bg-background/95 backdrop-blur-md px-4">
      <div className="flex w-10 items-center">
        {showBack && (
          <button onClick={() => navigate(-1)} className="text-primary -ml-1 p-1">
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      <h1 className="flex-1 text-center text-base font-semibold text-foreground truncate">
        {title}
      </h1>
      <div className="flex w-10 items-center justify-end">{right}</div>
    </header>
  );
};

export default MobileHeader;
