"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Supplier { id: string; name: string }
interface ProductLine {
  name: string;
  format: string;
  totalWeightKg: string;
  purchasePriceKg: string;
  baseSalePriceKg: string;
}

export default function AdminNouvelArrivagePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [expenses, setExpenses] = useState("");
  const [products, setProducts] = useState<ProductLine[]>([
    { name: "", format: "", totalWeightKg: "", purchasePriceKg: "", baseSalePriceKg: "" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
  }, []);

  function addProduct() {
    setProducts([...products, { name: "", format: "", totalWeightKg: "", purchasePriceKg: "", baseSalePriceKg: "" }]);
  }

  function removeProduct(i: number) {
    setProducts(products.filter((_, idx) => idx !== i));
  }

  function updateProduct(i: number, field: keyof ProductLine, value: string) {
    setProducts(products.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  const totalAchat = products.reduce((s, p) => {
    const w = parseFloat(p.totalWeightKg) || 0;
    const pr = parseFloat(p.purchasePriceKg) || 0;
    return s + w * pr;
  }, 0);
  const expensesNum = parseFloat(expenses) || 0;
  const coutTotal = totalAchat + expensesNum;
  const FCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

  async function handleSubmit(e: React.FormEvent, openImmediately: boolean) {
    e.preventDefault();
    if (!supplierId && !newSupplierName) {
      toast.error("Sélectionnez ou créez un fournisseur");
      return;
    }
    const validProducts = products.filter((p) => p.name && p.totalWeightKg);
    if (validProducts.length === 0) {
      toast.error("Ajoutez au moins un produit");
      return;
    }

    setLoading(true);
    try {
      let finalSupplierId = supplierId;

      if (showNewSupplier && newSupplierName) {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSupplierName }),
        });
        if (!res.ok) throw new Error("Erreur création fournisseur");
        const s = await res.json();
        finalSupplierId = s.id;
      }

      const res = await fetch("/api/arrivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: finalSupplierId,
          arrivalDate,
          notes: notes || undefined,
          expenses: expensesNum || undefined,
          status: openImmediately ? "OPEN" : "DRAFT",
          products: validProducts.map((p) => ({
            name: p.name,
            format: p.format || undefined,
            totalWeightKg: parseFloat(p.totalWeightKg),
            purchasePriceKg: p.purchasePriceKg ? parseFloat(p.purchasePriceKg) : undefined,
            baseSalePriceKg: p.baseSalePriceKg ? parseFloat(p.baseSalePriceKg) : undefined,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur création arrivage");
      }
      const arrival = await res.json();
      toast.success(openImmediately ? "Arrivage activé !" : "Arrivage en brouillon");
      router.push(`/admin/arrivages/${arrival.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-slate-500 text-xl hover:text-slate-700 transition">←</button>
          <h1 className="text-lg font-bold text-slate-800">Nouvel arrivage</h1>
        </div>
      </header>

      <form onSubmit={(e) => handleSubmit(e, true)} className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Fournisseur */}
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <span>🚚</span> Fournisseur
          </h2>

          {!showNewSupplier ? (
            <>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 bg-white text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowNewSupplier(true); setSupplierId(""); }}
                className="text-blue-600 text-sm font-medium hover:text-blue-700"
              >
                + Nouveau fournisseur
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Nom du fournisseur (ex: RICHARD)"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value.toUpperCase())}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              <button
                type="button"
                onClick={() => { setShowNewSupplier(false); setNewSupplierName(""); }}
                className="text-slate-500 text-sm hover:text-slate-700"
              >
                ← Choisir existant
              </button>
            </>
          )}
        </div>

        {/* Date */}
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <span>📅</span> Date d&apos;arrivée
          </h2>
          <input
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            required
            className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
        </div>

        {/* Produits */}
        <div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <span>🐟</span> Produits reçus
          </h2>

          {products.map((p, i) => (
            <div key={i} className="space-y-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">Produit {i + 1}</span>
                {products.length > 1 && (
                  <button type="button" onClick={() => removeProduct(i)} className="text-red-400 text-sm hover:text-red-600">
                    Supprimer
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Nom (ex: Carpes, Gambas…)"
                value={p.name}
                onChange={(e) => updateProduct(i, "name", e.target.value)}
                required
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              <input
                type="text"
                placeholder="Format (ex: 500g, entier, filet…)"
                value={p.format}
                onChange={(e) => updateProduct(i, "format", e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Poids"
                  step="0.5"
                  min="0"
                  value={p.totalWeightKg}
                  onChange={(e) => updateProduct(i, "totalWeightKg", e.target.value)}
                  required
                  className="flex-1 px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
                <span className="text-slate-500 font-medium w-8">kg</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Prix achat /kg</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={p.purchasePriceKg}
                    onChange={(e) => updateProduct(i, "purchasePriceKg", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Prix vente /kg</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={p.baseSalePriceKg}
                    onChange={(e) => updateProduct(i, "baseSalePriceKg", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addProduct}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-medium hover:border-blue-400 hover:text-blue-600 transition"
          >
            + Ajouter un produit
          </button>
        </div>

        {/* Dépenses & Notes */}
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <span>💰</span> Dépenses & notes
          </h2>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Dépenses annexes (transport, glace…)</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>
          <textarea
            placeholder="Observations sur la marchandise…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
        </div>

        {/* Récap coût */}
        {totalAchat > 0 && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Récap financier</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-700">
                <span>Coût marchandise</span>
                <span className="font-medium">{FCFA(totalAchat)}</span>
              </div>
              {expensesNum > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Dépenses annexes</span>
                  <span className="font-medium">{FCFA(expensesNum)}</span>
                </div>
              )}
              <div className="flex justify-between text-blue-800 font-bold border-t border-blue-200 pt-2 mt-2">
                <span>Coût total</span>
                <span>{FCFA(coutTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-300 disabled:to-blue-300 text-white font-bold py-4 rounded-2xl text-base transition shadow-md shadow-blue-200"
          >
            {loading ? "Enregistrement…" : "✓ Activer l'arrivage"}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as React.FormEvent, false)}
            disabled={loading}
            className="w-full bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium py-3 rounded-2xl text-sm transition"
          >
            Enregistrer en brouillon
          </button>
        </div>
      </form>
    </main>
  );
}
