"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Zone { id: string; name: string; fee: string | number }

const FCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

export default function ParametresPage() {
  const [tab, setTab] = useState<"compte" | "zones" | "raccourcis">("compte");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/admin" className="text-slate-500 text-xl hover:text-slate-700 transition">←</Link>
          <h1 className="text-lg font-bold text-slate-800">⚙️ Paramètres</h1>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mt-3 max-w-2xl mx-auto">
          {([
            { id: "compte" as const, label: "Mon compte" },
            { id: "zones" as const, label: "Zones livraison" },
            { id: "raccourcis" as const, label: "Raccourcis" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition ${tab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">
        {tab === "compte" && <CompteSection />}
        {tab === "zones" && <ZonesSection />}
        {tab === "raccourcis" && <RaccourcisSection />}
      </div>
    </main>
  );
}

// === Compte ===
function CompteSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Minimum 6 caractères");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Mot de passe mis à jour");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
      <h2 className="font-semibold text-slate-700 flex items-center gap-2">
        <span>🔒</span> Changer le mot de passe
      </h2>
      <input
        type="password" placeholder="Mot de passe actuel" required
        value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
        className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
      />
      <input
        type="password" placeholder="Nouveau mot de passe (6 car. min)" required minLength={6}
        value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
        className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
      />
      <input
        type="password" placeholder="Confirmer le nouveau mot de passe" required minLength={6}
        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
      />
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition">
        {loading ? "Enregistrement…" : "Mettre à jour"}
      </button>
    </form>
  );
}

// === Zones ===
function ZonesSection() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFee, setEditFee] = useState("");

  async function load() {
    const res = await fetch("/api/zones");
    if (res.ok) setZones(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fee: parseFloat(fee) || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success("Zone créée");
      setName(""); setFee("");
      await load();
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/zones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, fee: parseFloat(editFee) || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success("Zone modifiée");
      setEditing(null);
      await load();
    } catch { toast.error("Erreur"); }
  }

  async function handleDelete(id: string, zoneName: string) {
    if (!confirm(`Supprimer la zone "${zoneName}" ?`)) return;
    try {
      const res = await fetch(`/api/zones/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Zone supprimée");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <span>📍</span> Nouvelle zone de livraison
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <input type="text" placeholder="Nom (ex: Cocody)" required value={name} onChange={(e) => setName(e.target.value)}
            className="col-span-2 px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
          <input type="number" placeholder="Frais (F)" required min="0" value={fee} onChange={(e) => setFee(e.target.value)}
            className="px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition">
          {loading ? "Ajout…" : "+ Ajouter zone"}
        </button>
      </form>

      <div className="space-y-2">
        {zones.map((z) => (
          <div key={z.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
            {editing === z.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                  <input type="number" value={editFee} onChange={(e) => setEditFee(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(z.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition">
                    Sauver
                  </button>
                  <button onClick={() => setEditing(null)}
                    className="px-4 text-slate-500 text-sm">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{z.name}</p>
                  <p className="text-xs text-slate-500">{FCFA(parseFloat(String(z.fee)))}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(z.id); setEditName(z.name); setEditFee(String(z.fee)); }}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(z.id, z.name)}
                    className="text-red-500 text-sm font-medium hover:text-red-700">
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// === Raccourcis ===
function RaccourcisSection() {
  const items = [
    { href: "/admin/categories", icon: "🏷️", label: "Catégories de produits", desc: "Gérer les types de poissons et fruits de mer" },
    { href: "/admin/fournisseurs", icon: "🚚", label: "Fournisseurs", desc: "Carnet de fournisseurs" },
    { href: "/admin/equipe", icon: "🧑‍🔧", label: "Équipe", desc: "Magasiniers et livreurs" },
  ];
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Gestion avancée</h2>
      {items.map((item) => (
        <Link key={item.href} href={item.href}
          className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition">
          <span className="text-2xl">{item.icon}</span>
          <div className="flex-1">
            <p className="font-medium text-slate-800">{item.label}</p>
            <p className="text-xs text-slate-500">{item.desc}</p>
          </div>
          <span className="text-slate-400">→</span>
        </Link>
      ))}
    </div>
  );
}
