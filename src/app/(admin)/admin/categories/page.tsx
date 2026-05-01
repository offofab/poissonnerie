"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  emoji: string | null;
  totalRemainingKg: number;
  totalWeightKg: number;
  productLines: number;
  suppliers: string[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), emoji: emoji.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Catégorie créée !");
      setShowForm(false); setName(""); setEmoji("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  const totalGlobal = categories.reduce((s, c) => s + c.totalRemainingKg, 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 text-xl hover:text-slate-700 transition">←</Link>
            <h1 className="text-lg font-bold text-slate-800">Catégories</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-blue-200 transition"
          >
            + Nouvelle
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">
        {/* Récap global */}
        {categories.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Stock total disponible</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{Math.round(totalGlobal * 10) / 10} kg</p>
            <p className="text-xs text-slate-500 mt-1">{categories.length} catégorie{categories.length > 1 ? "s" : ""}</p>
          </div>
        )}

        {/* Formulaire création */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
            <h2 className="font-semibold text-slate-700">Nouvelle catégorie</h2>
            <div className="flex gap-2">
              <input type="text" placeholder="🐟" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
                className="w-14 text-center px-2 py-3 rounded-xl border border-slate-300 text-base" />
              <input type="text" placeholder="Nom (ex: Carpes)" value={name} onChange={(e) => setName(e.target.value)} required
                className="flex-1 px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition">
                {loading ? "Création…" : "Créer"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 text-slate-500 border border-slate-300 rounded-xl hover:bg-slate-50 transition">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Liste catégories */}
        <div className="space-y-2">
          {categories.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
              <p className="text-5xl mb-3">🏷️</p>
              <p className="font-medium text-slate-700">Aucune catégorie</p>
              <p className="text-sm text-slate-400 mt-1">Crée une catégorie pour regrouper tes produits.</p>
            </div>
          ) : (
            categories.map((c) => {
              const pct = c.totalWeightKg > 0 ? (c.totalRemainingKg / c.totalWeightKg) * 100 : 0;
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center text-2xl border border-blue-100">
                        {c.emoji ?? "🐟"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {c.productLines} ligne{c.productLines > 1 ? "s" : ""} · {c.suppliers.length} fournisseur{c.suppliers.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-800">{c.totalRemainingKg} kg</p>
                      <p className="text-xs text-slate-400">/ {c.totalWeightKg} kg reçus</p>
                    </div>
                  </div>

                  {/* Barre de progression stock */}
                  {c.totalWeightKg > 0 && (
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 50 ? "bg-green-500" : pct > 20 ? "bg-orange-400" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {/* Fournisseurs */}
                  {c.suppliers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {c.suppliers.map((s) => (
                        <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
