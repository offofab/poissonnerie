"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  format: string | null;
  totalWeightKg: string;
  remainingWeightKg: string;
  purchasePriceKg: string | null;
  baseSalePriceKg: string | null;
}

interface Arrival {
  id: string;
  arrivalDate: string;
  status: string;
  expenses: string;
  notes: string | null;
  supplier: { name: string };
  products: Product[];
}

interface ProductPrices { purchasePriceKg: string; baseSalePriceKg: string }

export default function CompleterArrivagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const [prices, setPrices] = useState<Record<string, ProductPrices>>({});
  const [expenses, setExpenses] = useState("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/arrivals/${id}`)
      .then((r) => r.json())
      .then((data: Arrival) => {
        setArrival(data);
        setExpenses(data.expenses ?? "0");
        const initial: Record<string, ProductPrices> = {};
        data.products.forEach((p) => {
          initial[p.id] = {
            purchasePriceKg: p.purchasePriceKg ?? "",
            baseSalePriceKg: p.baseSalePriceKg ?? "",
          };
        });
        setPrices(initial);
      });
  }, [id]);

  function updatePrice(productId: string, field: keyof ProductPrices, value: string) {
    setPrices((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
  }

  async function handleSubmit(action: "save" | "open") {
    setLoading(true);
    try {
      const res = await fetch(`/api/arrivals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "open" ? "OPEN" : undefined,
          expenses: parseFloat(expenses) || 0,
          products: Object.entries(prices).map(([pid, p]) => ({
            id: pid,
            purchasePriceKg: parseFloat(p.purchasePriceKg) || 0,
            baseSalePriceKg: parseFloat(p.baseSalePriceKg) || 0,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "open" ? "Arrivage ouvert !" : "Sauvegardé !");
      if (action === "open") router.push("/admin");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  }

  if (!arrival) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Chargement…</p>
      </div>
    );
  }

  const totalAchat = arrival.products.reduce((sum, p) => {
    const price = parseFloat(prices[p.id]?.purchasePriceKg || "0");
    return sum + price * parseFloat(p.totalWeightKg);
  }, 0);

  const totalCout = totalAchat + parseFloat(expenses || "0");

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-500 text-lg">←</button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{arrival.supplier.name}</h1>
            <p className="text-slate-500 text-sm">
              {new Date(arrival.arrivalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              {" · "}
              <span className={arrival.status === "OPEN" ? "text-green-600 font-medium" : "text-orange-500 font-medium"}>
                {arrival.status === "OPEN" ? "Ouvert" : arrival.status === "DRAFT" ? "Brouillon" : "Clôturé"}
              </span>
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Produits + prix */}
        {arrival.products.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
            <div>
              <p className="font-semibold text-slate-800">{p.name}</p>
              <p className="text-sm text-slate-500">
                {p.format && `${p.format} · `}
                {parseFloat(p.totalWeightKg)} kg total · {parseFloat(p.remainingWeightKg)} kg restants
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Prix achat / kg</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="0"
                    value={prices[p.id]?.purchasePriceKg ?? ""}
                    onChange={(e) => updatePrice(p.id, "purchasePriceKg", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm"
                  />
                  <span className="text-xs text-slate-400">FCFA</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Prix vente / kg</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="0"
                    value={prices[p.id]?.baseSalePriceKg ?? ""}
                    onChange={(e) => updatePrice(p.id, "baseSalePriceKg", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm"
                  />
                  <span className="text-xs text-slate-400">FCFA</span>
                </div>
              </div>
            </div>
            {prices[p.id]?.purchasePriceKg && (
              <p className="text-xs text-slate-500">
                Coût produit :{" "}
                <span className="font-medium text-slate-700">
                  {Math.round(parseFloat(prices[p.id].purchasePriceKg) * parseFloat(p.totalWeightKg)).toLocaleString("fr-FR")} FCFA
                </span>
              </p>
            )}
          </div>
        ))}

        {/* Dépenses */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <h2 className="font-semibold text-slate-700">Dépenses annexes</h2>
          <p className="text-xs text-slate-500">Taxi, transport, sachets, frais transfert…</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="0"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              className="flex-1 px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base"
            />
            <span className="text-slate-500 font-medium">FCFA</span>
          </div>
        </div>

        {/* Récap financier */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 space-y-2">
          <h2 className="font-semibold text-blue-800">Récapitulatif</h2>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Coût marchandise</span>
            <span className="font-medium">{Math.round(totalAchat).toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Dépenses annexes</span>
            <span className="font-medium">{Math.round(parseFloat(expenses || "0")).toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-blue-200 pt-2 mt-2">
            <span className="text-blue-800">Coût total</span>
            <span className="text-blue-800">{Math.round(totalCout).toLocaleString("fr-FR")} FCFA</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => handleSubmit("save")}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold py-4 rounded-2xl text-base transition-colors"
          >
            Sauvegarder
          </button>
          {arrival.status === "DRAFT" && (
            <button
              onClick={() => handleSubmit("open")}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              {loading ? "Traitement…" : "✓ Ouvrir au stock"}
            </button>
          )}
          {arrival.status === "OPEN" && (
            <p className="text-center text-sm text-green-600 font-medium">✓ Arrivage actif dans le stock</p>
          )}
        </div>
      </div>
    </main>
  );
}
