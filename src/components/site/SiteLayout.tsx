import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, LogIn, Mail } from "lucide-react";
import cibariusLogo from "@/assets/cibarius-logo.png";
import { NAV_PAGES, SITE_PAGES, SITE_NAME, CONTACT_EMAIL } from "@/lib/site";
import { LOGIN_PATH, SIGNUP_PATH } from "@/lib/routes";

/**
 * Guscio del sito pubblico.
 *
 * Il sito e il software vivono sullo stesso dominio: la radice e le pagine
 * di presentazione sono aperte a tutti, l'area riservata e' l'applicazione
 * gia' esistente dietro login. Il pulsante in alto a destra e' il ponte fra
 * i due, ed e' l'unico elemento che deve restare visibile su ogni schermata.
 */
const SiteLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const chiudi = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Intestazione ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center" aria-label={`${SITE_NAME}, vai alla home`}>
            <img src={cibariusLogo} alt={SITE_NAME} className="h-7 w-auto" />
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Menu principale">
            {NAV_PAGES.map((p) => (
              <NavLink
                key={p.path}
                to={p.path}
                className={({ isActive }) =>
                  `rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                {p.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to={LOGIN_PATH}
              className="flex h-11 items-center gap-2 rounded-[12px] bg-primary px-4 text-[14px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Area riservata</span>
              <span className="sm:hidden">Accedi</span>
            </Link>

            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Chiudi il menu" : "Apri il menu"}
              aria-expanded={menuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-[12px] text-foreground hover:bg-muted md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menu su schermo stretto */}
        {menuOpen && (
          <nav className="border-t border-border/60 bg-background md:hidden" aria-label="Menu principale">
            <div className="mx-auto max-w-6xl px-4 py-2">
              {NAV_PAGES.map((p) => (
                <NavLink
                  key={p.path}
                  to={p.path}
                  onClick={chiudi}
                  className={({ isActive }) =>
                    `flex h-12 items-center rounded-[10px] px-3 text-[15px] font-medium ${
                      isActive ? "bg-primary/10 text-primary" : "text-foreground"
                    }`
                  }
                >
                  {p.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main key={pathname}>
        <Outlet />
      </main>

      {/* ── Piede ── */}
      <footer className="mt-16 border-t border-border/60 bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <img src={cibariusLogo} alt={SITE_NAME} className="h-7 w-auto" />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Scadenze, magazzino e controlli sanitari in un'unica applicazione,
              a casa e al ristorante.
            </p>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold text-foreground">Il prodotto</h2>
            <ul className="mt-3 space-y-2">
              {SITE_PAGES.filter((p) => p.path !== "/" && !p.footerOnly).map((p) => (
                <li key={p.path}>
                  <Link to={p.path} className="text-[13px] text-muted-foreground hover:text-primary">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold text-foreground">Inizia</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to={SIGNUP_PATH} className="text-[13px] text-muted-foreground hover:text-primary">
                  Crea un account
                </Link>
              </li>
              <li>
                <Link to={LOGIN_PATH} className="text-[13px] text-muted-foreground hover:text-primary">
                  Accedi all'area riservata
                </Link>
              </li>
              <li>
                <Link to="/contatti" className="text-[13px] text-muted-foreground hover:text-primary">
                  Contatti
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold text-foreground">Scrivici</h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground hover:text-primary"
            >
              <Mail className="h-4 w-4" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        <div className="border-t border-border/60">
          <p className="mx-auto max-w-6xl px-4 py-5 text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} {SITE_NAME}. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SiteLayout;
