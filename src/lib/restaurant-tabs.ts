import { LayoutDashboard, Clock, ChefHat, FileText, ClipboardCheck, Boxes } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface TabItem {
  to: string;
  icon: LucideIcon;
  label: string;
  tourId?: string;
}

/**
 * Tab operative del ristorante, in un solo posto.
 *
 * `BottomNav` (usato da `MobileLayout`) aveva una lista ristorante piu'
 * vecchia e divergente: mancavano Magazzino e HACCP, e le due barre
 * mostravano voci diverse a seconda della pagina.
 */
export const RESTAURANT_TABS: TabItem[] = [
  { to: "/restaurant", icon: LayoutDashboard, label: "Home", tourId: "rest-nav-home" },
  { to: "/restaurant/stock", icon: Boxes, label: "Magazzino", tourId: "rest-nav-stock" },
  { to: "/restaurant/products", icon: Clock, label: "Scadenze", tourId: "rest-nav-products" },
  { to: "/restaurant/haccp", icon: ClipboardCheck, label: "HACCP", tourId: "rest-nav-haccp" },
  { to: "/restaurant/preparations", icon: ChefHat, label: "Preparaz.", tourId: "rest-nav-preparations" },
  { to: "/restaurant/invoices", icon: FileText, label: "Bolle", tourId: "rest-nav-invoices" },
];
