import { format } from "date-fns";
import { it } from "date-fns/locale";

export interface HaccpPdfLabel {
  preparation_name: string;
  internal_lot_code: string;
  conservation_type: string;
  production_date: string;
  expiration_date: string;
  quantity?: number | null;
  unit?: string | null;
  operator_name?: string | null;
  allergens?: string[] | null;
  notes?: string | null;
  cancel_reason?: string | null;
  computed_status?: string;
}

export interface HaccpPdfIngredient {
  ingredient_name: string;
  quantity_used?: string | number | null;
  unit?: string | null;
  source_lot_code?: string | null;
  supplier_name?: string | null;
  ingredient_expiration_date?: string | null;
}

export interface HaccpPdfDocument {
  id: string;
  document_type?: string | null;
  document_number?: string | null;
  document_date?: string | null;
  supplier_name?: string | null;
}

export interface HaccpPdfEvent {
  action: string;
  user_name?: string | null;
  reason?: string | null;
  created_at: string;
}

const statusLabel = (status?: string) => {
  switch (status) {
    case "ritirato":
      return "Ritirato";
    case "scaduto":
      return "Scaduto";
    case "bozza":
      return "Bozza";
    default:
      return "Valido";
  }
};

const eventLabel = (action: string) => {
  switch (action) {
    case "created":
      return "Etichetta creata";
    case "finalized":
      return "Etichetta finalizzata";
    case "printed":
      return "Stampata";
    case "reprinted":
      return "Ristampata";
    case "modified":
      return "Modificata";
    case "cancelled":
      return "Annullata / ritirata";
    case "duplicated":
      return "Duplicata";
    default:
      return action;
  }
};

interface Props {
  label: HaccpPdfLabel;
  restaurant?: { name?: string; address?: string | null } | null;
  ingredients: HaccpPdfIngredient[];
  documents: HaccpPdfDocument[];
  events: HaccpPdfEvent[];
}

/** Vista dedicata all'export PDF: colori espliciti, niente icone SVG (html2canvas). */
const HaccpLabelPdfView = ({ label, restaurant, ingredients, documents, events }: Props) => (
  <div className="haccp-label-pdf-root max-w-2xl mx-auto space-y-4 bg-white p-4 text-gray-900">
    <section className="rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900">{label.preparation_name}</h1>
        <span className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">
          {statusLabel(label.computed_status)}
        </span>
      </div>
      {restaurant?.name && (
        <p className="text-sm text-gray-600">
          {restaurant.name}
          {restaurant.address ? ` · ${restaurant.address}` : ""}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Lotto:</span> <b>{label.internal_lot_code}</b>
        </div>
        <div>
          <span className="text-gray-500">Conserv:</span>{" "}
          <b className="capitalize">{label.conservation_type}</b>
        </div>
        <div>
          <span className="text-gray-500">Produzione:</span>{" "}
          <b>{format(new Date(label.production_date), "dd MMM yyyy", { locale: it })}</b>
        </div>
        <div>
          <span className="text-gray-500">Scadenza:</span>{" "}
          <b>{format(new Date(label.expiration_date), "dd MMM yyyy", { locale: it })}</b>
        </div>
        {label.quantity != null && (
          <div>
            <span className="text-gray-500">Qtà:</span>{" "}
            <b>
              {label.quantity} {label.unit || ""}
            </b>
          </div>
        )}
        {label.operator_name && (
          <div>
            <span className="text-gray-500">Operatore:</span> <b>{label.operator_name}</b>
          </div>
        )}
      </div>
      {label.allergens && label.allergens.length > 0 && (
        <p className="text-sm">
          <b>Allergeni:</b> {label.allergens.join(", ")}
        </p>
      )}
      {label.notes && <p className="text-sm text-gray-600">{label.notes}</p>}
      {label.cancel_reason && (
        <p className="text-sm text-red-700 bg-red-50 rounded p-2">
          <b>Motivo annullamento:</b> {label.cancel_reason}
        </p>
      )}
    </section>

    <section className="rounded-lg border border-gray-200 p-4 space-y-2">
      <h2 className="font-semibold text-gray-900">Tracciabilità ingredienti</h2>
      {ingredients.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun ingrediente registrato</p>
      ) : (
        ingredients.map((i, idx) => (
          <div key={idx} className="border-b border-gray-100 last:border-0 pb-2 text-sm">
            <div className="font-medium">
              {i.ingredient_name}
              {i.quantity_used ? ` · ${i.quantity_used} ${i.unit || ""}` : ""}
            </div>
            <div className="text-xs text-gray-600">
              {i.source_lot_code && `Lotto ${i.source_lot_code}`}
              {i.supplier_name && ` · Fornitore ${i.supplier_name}`}
              {i.ingredient_expiration_date &&
                ` · Scad. ${format(new Date(i.ingredient_expiration_date), "dd/MM/yyyy")}`}
            </div>
          </div>
        ))
      )}
    </section>

    {documents.length > 0 && (
      <section className="rounded-lg border border-gray-200 p-4 space-y-2">
        <h2 className="font-semibold text-gray-900">Bolle / Documenti</h2>
        {documents.map((d) => (
          <div key={d.id} className="border border-gray-100 rounded p-2 text-sm">
            <div className="font-medium capitalize">
              {d.document_type} {d.document_number}
            </div>
            <div className="text-xs text-gray-600">
              {d.supplier_name}{" "}
              {d.document_date && `· ${format(new Date(d.document_date), "dd/MM/yyyy")}`}
            </div>
          </div>
        ))}
      </section>
    )}

    {events.length > 0 && (
      <section className="rounded-lg border border-gray-200 p-4 space-y-2">
        <h2 className="font-semibold text-gray-900">Cronologia tracciabilità</h2>
        <ol className="space-y-2 text-sm">
          {events.map((ev, idx) => (
            <li key={idx} className="border-l-2 border-gray-200 pl-3">
              <div className="font-medium">{eventLabel(ev.action)}</div>
              <div className="text-xs text-gray-600">
                {format(new Date(ev.created_at), "dd MMM yyyy · HH:mm", { locale: it })}
                {ev.user_name && ` · ${ev.user_name}`}
              </div>
              {ev.reason && <div className="text-xs italic text-gray-700 mt-0.5">"{ev.reason}"</div>}
            </li>
          ))}
        </ol>
      </section>
    )}

    <p className="text-center text-xs text-gray-500 py-2">Tracciabilità HACCP — Cibarius</p>
  </div>
);

export default HaccpLabelPdfView;
