import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type DateInputWithHintProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** Mostra sotto il campo la data in formato gg/mm/aaaa */
  showHint?: boolean;
};

/**
 * Campo data nativo del browser con hint leggibile in formato europeo.
 * L'aspetto del picker resta legato al locale del browser; `index.html` usa lang="it".
 */
export function DateInputWithHint({
  value,
  showHint = true,
  className,
  ...props
}: DateInputWithHintProps) {
  const iso = typeof value === "string" ? value : "";
  return (
    <div className="space-y-1">
      <Input type="date" value={value} className={cn(className)} {...props} />
      {showHint && iso ? (
        <p className="text-[11px] text-muted-foreground" aria-hidden>
          {formatDisplayDate(iso)}
        </p>
      ) : showHint ? (
        <p className="text-[11px] text-muted-foreground">Formato: gg/mm/aaaa</p>
      ) : null}
    </div>
  );
}
