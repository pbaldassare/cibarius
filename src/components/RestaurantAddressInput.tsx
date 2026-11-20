import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { GOOGLE_MAPS_KEY } from "@/lib/google-maps";

interface AddressProps {
  value: string;
  onChange: (value: string) => void;
}

interface AutocompleteResponse {
  suggestions?: { placePrediction?: { text?: { text: string } } }[];
}

export default function RestaurantAddressInput({ value, onChange }: AddressProps) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const query = value.trim();

  useEffect(() => {
    setSuggestions([]);
    setActive(-1);
    setStatus("idle");
    if (!focused || query.length < 4 || query === selected) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GOOGLE_MAPS_KEY },
          body: JSON.stringify({ input: query, languageCode: "it", regionCode: "it", includedPrimaryTypes: ["street_address", "premise", "route", "subpremise"] }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Maps unavailable");
        const data: AutocompleteResponse = await response.json();
        const addresses = [...new Set((data.suggestions ?? []).flatMap(option => {
          const address = option.placePrediction?.text?.text;
          return address ? [address] : [];
        }))];
        if (controller.signal.aborted) return;
        setSuggestions(addresses);
        setStatus(addresses.length ? "idle" : "empty");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [focused, query, selected]);

  const choose = (address: string) => {
    setSelected(address);
    setSuggestions([]);
    setActive(-1);
    onChange(address);
  };

  const expanded = focused && suggestions.length > 0;

  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-label="Indirizzo del ristorante"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="street-address"
        placeholder="Indirizzo (consigliato)"
        value={value}
        onChange={event => { setSelected(""); onChange(event.target.value); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={event => {
          if (!expanded) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActive(index => event.key === "ArrowDown"
              ? (index + 1) % suggestions.length
              : (index < 0 ? suggestions.length - 1 : (index + suggestions.length - 1) % suggestions.length));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(suggestions[active]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setSuggestions([]);
            setActive(-1);
          }
        }}
      />
      {expanded && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-card shadow-lg">
          <ul id={listId} role="listbox" aria-label="Suggerimenti di indirizzo" className="max-h-56 overflow-y-auto p-1">
            {suggestions.map((address, index) => (
              <li key={address} id={`${listId}-${index}`} role="option" aria-selected={index === active}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm hover:bg-muted ${active === index ? "bg-muted" : ""}`}
                onPointerDown={event => event.preventDefault()}
                onClick={() => choose(address)}>
                {address}
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-1 text-right text-xs font-medium text-muted-foreground" translate="no">Google Maps</div>
        </div>
      )}
      {focused && status !== "idle" && <p role="status" className="mt-1 text-xs text-muted-foreground">
        {status === "loading" ? "Ricerca indirizzo…" : status === "empty"
          ? "Nessun suggerimento. Puoi inserire l’indirizzo a mano."
          : "Suggerimenti non disponibili. Puoi inserire l’indirizzo a mano."}
      </p>}
    </div>
  );
}
