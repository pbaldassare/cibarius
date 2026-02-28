import cibariusLogo from "@/assets/cibarius-logo.png";

interface MealTarget {
  meal_type: string;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

interface PlanPdfViewProps {
  plan: {
    title: string;
    kcal_day: number;
    protein_g_day: number;
    carbs_g_day: number;
    fats_g_day: number;
    start_date: string;
    end_date?: string | null;
    notes?: string | null;
  };
  mealTargets: MealTarget[];
  proName: string;
  clientName: string;
}

const MEAL_LABELS: Record<string, string> = {
  colazione: "Colazione",
  pranzo: "Pranzo",
  cena: "Cena",
  spuntino: "Spuntino",
};

const PlanPdfView = ({ plan, mealTargets, proName, clientName }: PlanPdfViewProps) => {
  const today = new Date().toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="plan-pdf-view max-w-2xl mx-auto p-8 bg-white text-gray-900" id="plan-pdf">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-blue-500 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <img src={cibariusLogo} alt="Cibarius" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-blue-600" style={{ fontFamily: "Fredoka, sans-serif" }}>
              Cibarius
            </h1>
            <p className="text-xs text-gray-500">Piano Nutrizionale</p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p className="font-semibold">Dott. {proName}</p>
          <p>{today}</p>
        </div>
      </div>

      {/* Plan title + client */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800">{plan.title}</h2>
        <p className="text-sm text-gray-600">
          Paziente: <strong>{clientName}</strong>
        </p>
        <p className="text-xs text-gray-500">
          Periodo: {new Date(plan.start_date).toLocaleDateString("it-IT")}
          {plan.end_date ? ` — ${new Date(plan.end_date).toLocaleDateString("it-IT")}` : " — In corso"}
        </p>
      </div>

      {/* Daily summary table */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Riepilogo Giornaliero</h3>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-blue-50">
              <th className="text-left p-2 border border-gray-200 font-semibold">Nutriente</th>
              <th className="text-right p-2 border border-gray-200 font-semibold">Target</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="p-2 border border-gray-200">Calorie</td><td className="p-2 border border-gray-200 text-right font-medium">{plan.kcal_day} kcal</td></tr>
            <tr><td className="p-2 border border-gray-200">Proteine</td><td className="p-2 border border-gray-200 text-right font-medium">{plan.protein_g_day}g</td></tr>
            <tr><td className="p-2 border border-gray-200">Carboidrati</td><td className="p-2 border border-gray-200 text-right font-medium">{plan.carbs_g_day}g</td></tr>
            <tr><td className="p-2 border border-gray-200">Grassi</td><td className="p-2 border border-gray-200 text-right font-medium">{plan.fats_g_day}g</td></tr>
          </tbody>
        </table>
      </div>

      {/* Meal targets table */}
      {mealTargets.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Posologia per Pasto</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-50">
                <th className="text-left p-2 border border-gray-200 font-semibold">Pasto</th>
                <th className="text-right p-2 border border-gray-200 font-semibold">kcal</th>
                <th className="text-right p-2 border border-gray-200 font-semibold">Proteine</th>
                <th className="text-right p-2 border border-gray-200 font-semibold">Carbo</th>
                <th className="text-right p-2 border border-gray-200 font-semibold">Grassi</th>
              </tr>
            </thead>
            <tbody>
              {mealTargets.map((mt) => (
                <tr key={mt.meal_type}>
                  <td className="p-2 border border-gray-200">{MEAL_LABELS[mt.meal_type] || mt.meal_type}</td>
                  <td className="p-2 border border-gray-200 text-right">{mt.kcal_target}</td>
                  <td className="p-2 border border-gray-200 text-right">{mt.protein_g}g</td>
                  <td className="p-2 border border-gray-200 text-right">{mt.carbs_g}g</td>
                  <td className="p-2 border border-gray-200 text-right">{mt.fats_g}g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {plan.notes && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Note</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{plan.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 mt-8 text-center text-xs text-gray-400">
        <p>Generato da Cibarius · {today}</p>
      </div>
    </div>
  );
};

export default PlanPdfView;
