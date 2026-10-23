import { LayoutDashboard, Clock, ChefHat, FileText, ClipboardCheck, Boxes, History, Tag, Home } from "lucide-react";
import { USER_HOME } from "@/lib/routes";
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

/** Dove arriva lo staff, che usa solo la parte HACCP. */
export const STAFF_HOME = "/restaurant/haccp";

/**
 * Tab dello staff: controlli, storico ed etichette. L'ultima riporta all'app
 * personale, che per un collaboratore resta la home dopo il login.
 */
export const STAFF_TABS: TabItem[] = [
  { to: STAFF_HOME, icon: ClipboardCheck, label: "HACCP" },
  { to: "/restaurant/haccp/history", icon: History, label: "Storico" },
  { to: "/restaurant/haccp-labels", icon: Tag, label: "Etichette" },
  { to: USER_HOME, icon: Home, label: "La mia app" },
];

/** Pagine del ristorante aperte allo staff; la configurazione HACCP resta al titolare. */
export const isStaffPath = (pathname: string): boolean =>
  pathname === STAFF_HOME ||
  pathname === "/restaurant/haccp/history" ||
  pathname === "/restaurant/haccp-labels" ||
  pathname.startsWith("/restaurant/haccp-labels/");
