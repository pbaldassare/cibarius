import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

interface SwipeableItemProps {
  itemKey: string;
  onDelete: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
}

const SwipeableItem = ({ onDelete, children, disabled }: SwipeableItemProps) => {
  const [swipeX, setSwipeX] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const locked = useRef(false);
  const pointerDown = useRef(false);

  const begin = (x: number, y: number) => {
    if (disabled) return;
    startX.current = x;
    startY.current = y;
    locked.current = false;
    pointerDown.current = true;
  };
  const move = (x: number, y: number) => {
    if (!pointerDown.current || startX.current === null || startY.current === null) return;
    const dx = x - startX.current;
    const dy = y - startY.current;
    if (!locked.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) { startX.current = null; pointerDown.current = false; return; }
      if (Math.abs(dx) > 10) locked.current = true;
    }
    if (locked.current) setSwipeX(Math.min(0, dx));
  };
  const end = async () => {
    pointerDown.current = false;
    startX.current = null; startY.current = null;
    const wasLocked = locked.current;
    locked.current = false;
    if (swipeX < -80) {
      setRemoving(true);
      await onDelete();
    } else {
      setSwipeX(0);
    }
    // prevent click after swipe
    if (wasLocked) {
      // no-op; drag ended
    }
  };

  if (removing) return <div className="overflow-hidden transition-all duration-300 ease-out" style={{ maxHeight: 0, opacity: 0 }} />;

  return (
    <div className="relative overflow-hidden rounded-[14px]">
      <div className="absolute inset-0 flex items-center justify-end bg-destructive rounded-[14px] px-4">
        <Trash2 className="h-5 w-5 text-white" />
      </div>
      <div
        className="relative"
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? "transform 0.25s ease-out" : "none" }}
        onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={end}
        onMouseDown={(e) => begin(e.clientX, e.clientY)}
        onMouseMove={(e) => pointerDown.current && move(e.clientX, e.clientY)}
        onMouseUp={end}
        onMouseLeave={() => { if (pointerDown.current) end(); }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableItem;
