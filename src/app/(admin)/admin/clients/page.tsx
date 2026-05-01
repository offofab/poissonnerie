"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Customer {
  id: string; name: string; phone: string | null;
  address: string | null; balanceDue: string | number; isVip: boolean;
}

const FCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/customers");
    if (res.ok) setCustomers(await res.json());
  }

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search)
  );

  const totalCreances = customers.reduce((sum, c) => sum + parseFloat(String(c.balanceDue)), 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || undefined, address: address || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Client créé !");
      setShowForm(false); setName(""); setPhone(""); setAddress("");
      await load();
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 text-lg">←</Link>
            <h1 className="text-lg font-bold text-slate-800">Clients</h1>
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
        {/* Résumé créances */}
        {totalCreances > 0 && (
          <div className="bg-red-50 rounded-2xl border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700 font-medium">
              Créances totales : <span className="font-bold">{FCFA(totalCreances)}</span>
              {" · "}{customers.filter((c) => parseFloat(String(c.balanceDue)) > 0).length} clients
            </p>
          </div>
        )}

        {/* Formulaire création */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="font-semibold text-slate-700">Nouveau client</h2>
            <input type="text" placeholder="Nom *" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base" />
            <input type="tel" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base" />
            <input type="text" placeholder="Adresse" value={address} onChange={(e) => setAddress(e.target.value)}
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

        {/* Recherche */}
        <input
          type="text" placeholder="Rechercher par nom ou téléphone…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 bg-white text-base"
        />

        {/* Liste */}
        <div className="space-y-2">
          <p className="text-sm text-slate-500">{filtered.length} client{filtered.length > 1 ? "s" : ""}</p>
          {filtered.map((c) => {
            const balance = parseFloat(String(c.balanceDue));
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{c.name}</p>
                    {c.isVip && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">VIP</span>}
                  </div>
                  {c.phone && <p className="text-sm text-slate-500">{c.phone}</p>}
                  {c.address && <p className="text-xs text-slate-400">{c.address}</p>}
                </div>
                <div className="text-right shrink-0">
                  {balance > 0 ? (
                    <p className="text-red-600 font-bold text-sm">{FCFA(balance)}</p>
                  ) : (
                    <p className="text-green-600 text-sm font-medium">✓ À jour</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
