import { Link } from "react-router-dom";
import { ArrowRight, LogIn } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LOGIN_PATH, SIGNUP_PATH } from "@/lib/routes";

/**
 * Pezzi ricorrenti delle pagine pubbliche.
 *
 * Le otto pagine del sito ripetono le stesse strutture: una fascia con
 * titolo, una griglia di schede, un invito finale ad accedere. Tenerle qui
 * evita di riscrivere le stesse classi otto volte e fa sì che una modifica
 * al ritmo verticale valga per tutto il sito.
 */

export const Section = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`mx-auto max-w-6xl px-4 py-14 sm:py-20 ${className}`}>{children}</section>
);

export const SectionHeading = ({
  eyebrow,
  title,
  lead,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  center?: boolean;
}) => (
  <div className={`${center ? "mx-auto text-center" : ""} max-w-2xl`}>
    {eyebrow && (
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
    )}
    <h2 className="text-[26px] font-bold leading-tight text-foreground sm:text-[32px]">{title}</h2>
    {lead && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">{lead}</p>}
  </div>
);

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const FeatureGrid = ({ items, columns = 3 }: { items: FeatureItem[]; columns?: 2 | 3 }) => (
  <div
    className={`mt-10 grid gap-4 ${columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
  >
    {items.map(({ icon: Icon, title, text }) => (
      <div key={title} className="rounded-[18px] bg-card p-5 shadow-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="mt-4 text-[16px] font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{text}</p>
      </div>
    ))}
  </div>
);

export const Steps = ({ items }: { items: { title: string; text: string }[] }) => (
  <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {items.map((s, i) => (
      <li key={s.title} className="rounded-[18px] bg-card p-5 shadow-card">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground">
          {i + 1}
        </span>
        <h3 className="mt-3 text-[16px] font-semibold text-foreground">{s.title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{s.text}</p>
      </li>
    ))}
  </ol>
);

/** Invito finale: compare in fondo a ogni pagina del sito. */
export const CallToAction = ({
  title = "Pronto a iniziare?",
  text = "Crea un account e prova Cibarius. Per i ristoranti il primo mese è gratuito, senza carta di credito.",
}: {
  title?: string;
  text?: string;
}) => (
  <Section>
    <div className="rounded-[24px] bg-brand-gradient px-6 py-12 text-center sm:px-12">
      <h2 className="text-[24px] font-bold leading-tight text-primary-foreground sm:text-[30px]">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-primary-foreground/90">{text}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={SIGNUP_PATH}
          className="flex h-12 items-center gap-2 rounded-[14px] bg-card px-6 text-[15px] font-semibold text-foreground active:scale-[0.98] transition-transform"
        >
          Crea un account <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to={LOGIN_PATH}
          className="flex h-12 items-center gap-2 rounded-[14px] border border-primary-foreground/40 px-6 text-[15px] font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
        >
          <LogIn className="h-4 w-4" /> Area riservata
        </Link>
      </div>
    </div>
  </Section>
);
