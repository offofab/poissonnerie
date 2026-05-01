"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Supplier { id: string; name: string; phone: string | null; createdAt: string }

export default function FournisseursPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/suppliers");
    if (res.ok) setSuppliers(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.toUpperCase(), phone: phone || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Fournisseur créé !");
      setShowForm(false); setName(""); setPhone("");
      await load();
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 text-lg">←</Link>
            <h1 className="text-lg font-bold text-slate-800">Fournisseurs</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            + Nouveau
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="font-semibold text-slate-700">Nouveau fournisseur</h2>
            <input type="text" placeholder="Nom (ex: RICHARD)" value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())} required
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base uppercase" />
            <input type="tel" placeholder="Téléphone" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base" />
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl disabled:bg-blue-400">
                {loading ? "Création…" : "Créer"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-3 text-slate-500 border border-slate-300 rounded-xl">
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {suppliers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-slate-400">Aucun fournisseur</p>
            </div>
          ) : (
            suppliers.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{s.name}</p>
                  {s.phone && <p className="text-sm text-slate-500">{s.phone}</p>}
                </div>
                <Link href={`/admin/arrivages?supplier=${s.id}`} className="text-xs text-blue-600 font-medium">
                  Arrivages →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
