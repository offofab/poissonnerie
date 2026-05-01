"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface User { id: string; fullName: string; email: string; role: string; phone: string | null; isActive: boolean }

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Admin", color: "bg-purple-100 text-purple-700" },
  MAGASINIER: { label: "Magasinier", color: "bg-blue-100 text-blue-700" },
  LIVREUR: { label: "Livreur", color: "bg-orange-100 text-orange-700" },
};

export default function EquipePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "LIVREUR" as "MAGASINIER" | "LIVREUR", phone: "" });

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: form.phone || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Utilisateur créé !");
      setShowForm(false);
      setForm({ fullName: "", email: "", password: "", role: "LIVREUR", phone: "" });
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setLoading(false); }
  }

  const nonAdmins = users.filter((u) => u.role !== "ADMIN");
  const admins = users.filter((u) => u.role === "ADMIN");

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 text-lg">←</Link>
            <h1 className="text-lg font-bold text-slate-800">Équipe</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            + Ajouter
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <h2 className="font-semibold text-slate-700">Nouvel utilisateur</h2>

            <div className="grid grid-cols-2 gap-2">
              {(["MAGASINIER", "LIVREUR"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                  className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors ${form.role === r ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                  {ROLE_LABELS[r].label}
                </button>
              ))}
            </div>

            <input type="text" placeholder="Nom complet *" value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} required
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base" />
            <input type="email" placeholder="Email *" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base" />
            <input type="password" placeholder="Mot de passe *" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base" />
            <input type="tel" placeholder="Téléphone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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

        {/* Équipe */}
        {nonAdmins.length > 0 && (
          <div className="space-y-2">
            {nonAdmins.map((u) => {
              const r = ROLE_LABELS[u.role];
              return (
                <div key={u.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{u.fullName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.color}`}>{r.label}</span>
                    </div>
                    <p className="text-sm text-slate-500">{u.email}</p>
                    {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                  </div>
                  {!u.isActive && <span className="text-xs text-red-400">Inactif</span>}
                </div>
              );
            })}
          </div>
        )}

        {admins.map((u) => (
          <div key={u.id} className="bg-purple-50 rounded-2xl border border-purple-200 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-purple-800">{u.fullName}</p>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
              </div>
              <p className="text-sm text-purple-600">{u.email}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
