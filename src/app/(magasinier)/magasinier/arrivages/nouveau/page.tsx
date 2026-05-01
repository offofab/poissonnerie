"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Supplier { id: string; name: string }
interface Category { id: string; name: string; emoji: string | null }
interface ProductLine { categoryId: string; name: string; format: string; totalWeightKg: string }

export default function NouvelArrivagePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<ProductLine[]>([{ categoryId: "", name: "", format: "", totalWeightKg: "" }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  function addProduct() {
    setProducts([...products, { categoryId: "", name: "", format: "", totalWeightKg: "" }]);
  }

  function removeProduct(i: number) {
    setProducts(products.filter((_, idx) => idx !== i));
  }

  function updateProduct(i: number, field: keyof ProductLine, value: string) {
    setProducts(products.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId && !newSupplierName) {
      toast.error("Sélectionnez ou créez un fournisseur");
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
          notes,
          products: products
            .filter((p) => p.name && p.totalWeightKg)
            .map((p) => ({
              categoryId: p.categoryId || undefined,
              name: p.name,
              format: p.format || undefined,
              totalWeightKg: parseFloat(p.totalWeightKg),
            })),
        }),
      });

      if (!res.ok) throw new Error("Erreur création arrivage");
      toast.success("Arrivage enregistré !");
      router.push("/magasinier");
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-500 text-lg">←</button>
          <h1 className="text-lg font-bold text-slate-800">Nouvel arrivage</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Fournisseur */}
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700">Fournisseur</h2>

          {!showNewSupplier ? (
            <>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 bg-white text-base"
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowNewSupplier(true); setSupplierId(""); }}
                className="text-blue-600 text-sm font-medium"
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
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base uppercase"
              />
              <button
                type="button"
                onClick={() => { setShowNewSupplier(false); setNewSupplierName(""); }}
                className="text-slate-500 text-sm"
              >
                ← Choisir existant
              </button>
            </>
          )}
        </div>

        {/* Date */}
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700">Date d'arrivée</h2>
          <input
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            required
            className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base"
          />
        </div>

        {/* Produits */}
        <div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700">Produits reçus</h2>

          {products.map((p, i) => (
            <div key={i} className="space-y-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">Produit {i + 1}</span>
                {products.length > 1 && (
                  <button type="button" onClick={() => removeProduct(i)} className="text-red-400 text-sm">
                    Supprimer
                  </button>
                )}
              </div>
              {categories.length > 0 && (
                <select
                  value={p.categoryId}
                  onChange={(e) => {
                    updateProduct(i, "categoryId", e.target.value);
                    const cat = categories.find((c) => c.id === e.target.value);
                    if (cat && !p.name) updateProduct(i, "name", cat.name);
                  }}
                  className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 bg-white text-base"
                >
                  <option value="">— Catégorie —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ""}{c.name}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder="Nom (ex: Carpes, Gambas…)"
                value={p.name}
                onChange={(e) => updateProduct(i, "name", e.target.value)}
                required
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base"
              />
              <input
                type="text"
                placeholder="Format (ex: 500g, entier, filet…)"
                value={p.format}
                onChange={(e) => updateProduct(i, "format", e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Poids (kg)"
                  step="0.5"
                  min="0"
                  value={p.totalWeightKg}
                  onChange={(e) => updateProduct(i, "totalWeightKg", e.target.value)}
                  required
                  className="flex-1 px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base"
                />
                <span className="text-slate-500 font-medium">kg</span>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addProduct}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-medium"
          >
            + Ajouter un produit
          </button>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700 mb-2">Notes</h2>
          <textarea
            placeholder="Observations sur la marchandise…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          {loading ? "Enregistrement…" : "✓ Enregistrer l'arrivage"}
        </button>
      </form>
    </main>
  );
}
