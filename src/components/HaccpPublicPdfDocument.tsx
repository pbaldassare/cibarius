import { useEffect, useState, type CSSProperties } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { publicShareUrl } from "@/lib/site";

export const CONSERVATION_LABELS: Record<string, string> = {
  frigo: "Frigo (0–4 °C)",
  freezer: "Congelatore (−18 °C)",
  ambiente: "Temperatura ambiente",
  sottovuoto: "Sottovuoto",
  altro: "Altro",
};

export const formatHaccpDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy", { locale: it });
  } catch {
    return value;
  }
};

export interface HaccpPdfIngredient {
  ingredient_name?: string | null;
  quantity_used?: number | string | null;
  unit?: string | null;
  source_lot_code?: string | null;
  supplier_name?: string | null;
  ingredient_expiration_date?: string | null;
}

export interface HaccpPdfDocument {
  document_type?: string | null;
  document_number?: string | null;
  document_date?: string | null;
  supplier_name?: string | null;
}

export interface HaccpPdfEvent {
  action?: string | null;
  user_name?: string | null;
  reason?: string | null;
  created_at?: string | null;
}

interface LabelLike {
  preparation_name?: string | null;
  computed_status?: string | null;
  status?: string | null;
  internal_lot_code?: string | null;
  conservation_type?: string | null;
  production_date?: string | null;
  expiration_date?: string | null;
  quantity?: number | null;
  unit?: string | null;
  operator_name?: string | null;
  allergens?: string[] | null;
  notes?: string | null;
  cancel_reason?: string | null;
  qr_token?: string | null;
}

interface RestaurantLike {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
}

interface Props {
  label: LabelLike;
  restaurant?: RestaurantLike | null;
  ingredients?: HaccpPdfIngredient[];
  documents?: HaccpPdfDocument[];
  events?: HaccpPdfEvent[];
  qrDataUrl?: string;
}

const EVENT_LABEL: Record<string, string> = {
  created: "Etichetta creata",
  finalized: "Etichetta finalizzata",
  printed: "Stampata",
  reprinted: "Ristampata",
  modified: "Modificata",
  cancelled: "Annullata",
  duplicated: "Duplicata",
};

const statusText = (label: LabelLike) => {
  if (label.computed_status === "ritirato") return "Ritirato";
  if (label.computed_status === "scaduto") return "Scaduto";
  if (label.computed_status === "bozza" || label.status === "draft") return "Bozza";
  return "Valido";
};

const cellLabel: CSSProperties = {
  width: "22%",
  color: "#4B5563",
  fontSize: 12,
  padding: "7px 10px",
  borderBottom: "1px solid #E5E7EB",
  verticalAlign: "top",
};
const cellValue: CSSProperties = {
  width: "28%",
  color: "#111827",
  fontSize: 12,
  fontWeight: 600,
  padding: "7px 10px",
  borderBottom: "1px solid #E5E7EB",
  verticalAlign: "top",
};

const sectionTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "#0B7DBE",
  borderBottom: "2px solid #0B7DBE",
  paddingBottom: 4,
  margin: "18px 0 8px",
};

/**
 * Documento A4 per html2canvas: solo stili inline, niente token CSS.
 * Cosi' il PDF tiene allineamento, allergeni, ingredienti e QR.
 */
const HaccpPublicPdfDocument = ({
  label,
  restaurant,
  ingredients = [],
  documents = [],
  events = [],
  qrDataUrl,
}: Props) => {
  const [qr, setQr] = useState(qrDataUrl || "");
  const publicUrl = label.qr_token
    ? publicShareUrl(`/haccp/label/${label.qr_token}`)
    : "";

  useEffect(() => {
    if (qrDataUrl) {
      setQr(qrDataUrl);
      return;
    }
    if (!publicUrl) return;
    QRCode.toDataURL(publicUrl, { width: 220, margin: 1, color: { dark: "#111827", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [publicUrl, qrDataUrl]);

  const allergens = (label.allergens || []).filter(Boolean);
  const qty =
    label.quantity != null
      ? `${label.quantity} ${label.unit || ""}`.trim()
      : "—";

  return (
    <div
      style={{
        width: 794,
        boxSizing: "border-box",
        padding: 36,
        background: "#ffffff",
        color: "#111827",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#0B7DBE", letterSpacing: 1.2 }}>
            CIBARIUS · TRACCIABILITÀ HACCP
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, lineHeight: 1.2 }}>
            {label.preparation_name || "Preparazione"}
          </div>
          <div style={{ fontSize: 13, color: "#4B5563", marginTop: 4 }}>
            {restaurant?.name || "—"}
            {restaurant?.address ? ` · ${restaurant.address}` : ""}
            {restaurant?.phone ? ` · ${restaurant.phone}` : ""}
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 10,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              border: "1px solid #0B7DBE",
              color: "#0B7DBE",
            }}
          >
            {statusText(label)}
          </div>
        </div>
        {qr ? (
          <div style={{ textAlign: "center" }}>
            <img src={qr} alt="QR tracciabilità" width={110} height={110} />
            <div style={{ fontSize: 9, color: "#6B7280", marginTop: 4 }}>Scansiona per la scheda</div>
          </div>
        ) : null}
      </div>

      <div style={sectionTitle}>Dati etichetta</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={cellLabel}>Lotto interno</td>
            <td style={cellValue}>{label.internal_lot_code || "—"}</td>
            <td style={cellLabel}>Conservazione</td>
            <td style={cellValue}>
              {CONSERVATION_LABELS[label.conservation_type || ""] || label.conservation_type || "—"}
            </td>
          </tr>
          <tr>
            <td style={cellLabel}>Data produzione</td>
            <td style={cellValue}>{formatHaccpDate(label.production_date)}</td>
            <td style={cellLabel}>Data scadenza</td>
            <td style={cellValue}>{formatHaccpDate(label.expiration_date)}</td>
          </tr>
          <tr>
            <td style={cellLabel}>Quantità</td>
            <td style={cellValue}>{qty}</td>
            <td style={cellLabel}>Operatore</td>
            <td style={cellValue}>{label.operator_name || restaurant?.name || "—"}</td>
          </tr>
        </tbody>
      </table>

      <div style={sectionTitle}>Allergeni (Reg. UE 1169/2011)</div>
      {allergens.length > 0 ? (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontSize: 13,
            fontWeight: 700,
            padding: "10px 12px",
          }}
        >
          {allergens.join(" · ")}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#4B5563" }}>Nessun allergene dichiarato.</div>
      )}

      <div style={sectionTitle}>Ingredienti</div>
      {ingredients.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Ingrediente", "Qtà", "Lotto", "Fornitore", "Scadenza"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 10,
                    color: "#6B7280",
                    fontWeight: 700,
                    padding: "6px 8px",
                    borderBottom: "1px solid #D1D5DB",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing, idx) => (
              <tr key={idx}>
                <td style={{ ...cellValue, width: "auto" }}>{ing.ingredient_name || "—"}</td>
                <td style={{ ...cellValue, width: "auto", fontWeight: 500 }}>
                  {ing.quantity_used != null ? `${ing.quantity_used} ${ing.unit || ""}`.trim() : "—"}
                </td>
                <td style={{ ...cellValue, width: "auto", fontWeight: 500 }}>{ing.source_lot_code || "—"}</td>
                <td style={{ ...cellValue, width: "auto", fontWeight: 500 }}>{ing.supplier_name || "—"}</td>
                <td style={{ ...cellValue, width: "auto", fontWeight: 500 }}>
                  {formatHaccpDate(ing.ingredient_expiration_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ fontSize: 12, color: "#4B5563" }}>
          Nessun ingrediente registrato su questa etichetta.
        </div>
      )}

      <div style={sectionTitle}>Documenti di provenienza</div>
      {documents.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Documento", "Numero", "Data", "Fornitore"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 10,
                    color: "#6B7280",
                    fontWeight: 700,
                    padding: "6px 8px",
                    borderBottom: "1px solid #D1D5DB",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => (
              <tr key={idx}>
                <td style={{ ...cellValue, width: "auto" }}>{(doc.document_type || "doc").toUpperCase()}</td>
                <td style={{ ...cellValue, width: "auto", fontWeight: 500 }}>{doc.document_number || "—"}</td>
                <td style={{ ...cellValue, width: "auto", fontWeight: 500 }}>{formatHaccpDate(doc.document_date)}</td>
                <td style={{ ...cellValue, width: "auto", fontWeight: 500 }}>{doc.supplier_name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ fontSize: 12, color: "#4B5563" }}>Nessun DDT / bolla collegato.</div>
      )}

      {label.notes ? (
        <>
          <div style={sectionTitle}>Note</div>
          <div style={{ fontSize: 12, color: "#111827" }}>{label.notes}</div>
        </>
      ) : null}

      {label.cancel_reason ? (
        <>
          <div style={sectionTitle}>Annullamento</div>
          <div style={{ fontSize: 12, color: "#991B1B" }}>{label.cancel_reason}</div>
        </>
      ) : null}

      {events.length > 0 ? (
        <>
          <div style={sectionTitle}>Cronologia</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {events.map((ev, idx) => (
                <tr key={idx}>
                  <td style={{ ...cellLabel, width: "34%" }}>{EVENT_LABEL[ev.action || ""] || ev.action || "—"}</td>
                  <td style={{ ...cellValue, width: "auto", fontWeight: 500 }}>
                    {ev.created_at
                      ? format(new Date(ev.created_at), "dd/MM/yyyy HH:mm", { locale: it })
                      : "—"}
                    {ev.user_name ? ` · ${ev.user_name}` : ""}
                    {ev.reason ? ` · ${ev.reason}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div style={{ marginTop: 28, fontSize: 9, color: "#9CA3AF", textAlign: "center" }}>
        Documento di tracciabilità HACCP generato da Cibarius
        {label.internal_lot_code ? ` · Lotto ${label.internal_lot_code}` : ""}
      </div>
    </div>
  );
};

export default HaccpPublicPdfDocument;
