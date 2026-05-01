"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import KpiCard from "../_components/KpiCard";

type Period = "today" | "week" | "month";

interface ArrivageStat {
  id: string; supplier: string; arrivalDate: string; status: string;
  totalAchat: number; expenses: number; coutTotal: number;
  totalVentes: number; benefice: number; kgVendu: number; kgRestant: number;
  products: Array<{ name: string; format: string | null; totalWeightKg: number; remainingWeightKg: number; purchasePriceKg: number | null; baseSalePriceKg: number | null }>;
}

interface MonthData { month: string; ca: number; count: number }
interface Debiteur { id: string; name: string; phone: string | null; balanceDue: number }

interface Stats {
  period: string;
  kpis: { ca: number; caValide: number; creancesTotal: number; commandeCount: number; commandesParStatut: Record<string, number> };
  arrivageStats: ArrivageStat[];
  monthlyData: MonthData[];
  topDebiteurs: Debiteur[];
}

const FCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?period=${period}`)
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [period]);

  const PERIOD_LABELS: Record<Period, string> = { today: "Aujourd'hui", week: "Cette semaine", month: "Ce mois" };

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 text-lg">←</Link>
            <h1 className="text-lg font-bold text-slate-800">Statistiques</h1>
          </div>
        </div>
        {/* Filtre période */}
        <div className="flex gap-2 mt-3 max-w-2xl mx-auto">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${period === p ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6 max-w-2xl mx-auto">
        {loading || !stats ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-400">Chargement…</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="CA période" value={FCFA(stats.kpis.ca)} sub={`${stats.kpis.commandeCount} commande${stats.kpis.commandeCount > 1 ? "s" : ""}`} color="blue" />
              <KpiCard label="Encaissé" value={FCFA(stats.kpis.caValide)} sub="paiements validés" color="green" />
              <KpiCard label="Créances" value={FCFA(stats.kpis.creancesTotal)} sub="total clients" color="red" />
              <KpiCard
                label="Statuts"
                value={`${stats.kpis.commandesParStatut["DELIVERED"] ?? 0} livrées`}
                sub={`${stats.kpis.commandesParStatut["PENDING"] ?? 0} en attente`}
                color="slate"
              />
            </div>

            {/* Récap mensuel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h2 className="font-bold text-slate-800 mb-4">CA mensuel</h2>
              <div className="space-y-2">
                {stats.monthlyData.map((m) => {
                  const max = Math.max(...stats.monthlyData.map((x) => x.ca), 1);
                  const pct = (m.ca / max) * 100;
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-12 shrink-0">{m.month}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full flex items-center px-2 transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        >
                          {pct > 20 && <span className="text-white text-xs font-medium">{FCFA(m.ca)}</span>}
                        </div>
                      </div>
                      {pct <= 20 && <span className="text-xs text-slate-600 font-medium shrink-0">{FCFA(m.ca)}</span>}
                      <span className="text-xs text-slate-400 shrink-0">{m.count} cmd</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bénéfice par arrivage */}
            <div>
              <h2 className="font-bold text-slate-800 mb-3">Bénéfice par arrivage</h2>
              <div className="space-y-3">
                {stats.arrivageStats.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
                    <p className="text-slate-400 text-sm">Aucun arrivage</p>
                  </div>
                ) : (
                  stats.arrivageStats.map((a) => (
                    <div key={a.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                        className="w-full text-left px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{a.supplier}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(a.arrivalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              {" · "}{a.kgVendu}kg vendu · {a.kgRestant}kg restant
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-base font-bold ${a.benefice >= 0 ? "text-green-700" : "text-red-600"}`}>
                              {a.benefice >= 0 ? "+" : ""}{FCFA(a.benefice)}
                            </p>
                            <p className="text-xs text-slate-400">{expanded === a.id ? "▲" : "▼"} détail</p>
                          </div>
                        </div>
                      </button>

                      {expanded === a.id && (
                        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
                          {/* Détail financier */}
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-slate-600">
                              <span>Coût marchandise</span>
                              <span>{FCFA(a.totalAchat)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Dépenses annexes</span>
                              <span>{FCFA(a.expenses)}</span>
                            </div>
                            <div className="flex justify-between font-medium text-slate-800 border-t border-slate-200 pt-1">
                              <span>Coût total</span>
                              <span>{FCFA(a.coutTotal)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Ventes</span>
                              <span className="text-green-700 font-medium">{FCFA(a.totalVentes)}</span>
                            </div>
                            <div className={`flex justify-between font-bold text-base border-t border-slate-200 pt-1 ${a.benefice >= 0 ? "text-green-700" : "text-red-600"}`}>
                              <span>Bénéfice net</span>
                              <span>{a.benefice >= 0 ? "+" : ""}{FCFA(a.benefice)}</span>
                            </div>
                          </div>

                          {/* Produits */}
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Produits</p>
                            {a.products.map((p, i) => (
                              <div key={i} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2">
                                <div>
                                  <span className="font-medium text-slate-700">{p.name}</span>
                                  {p.format && <span className="text-slate-400"> · {p.format}</span>}
                                </div>
                                <div className="text-right">
                                  <p className="text-slate-700 font-medium">{p.remainingWeightKg}kg restant</p>
                                  {p.purchasePriceKg && <p className="text-xs text-slate-400">{FCFA(p.purchasePriceKg)}/kg achat</p>}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Link href={`/admin/arrivages/${a.id}`} className="block text-center text-blue-600 text-sm font-medium py-1">
                            Modifier les prix →
                          </Link>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top débiteurs */}
            {stats.topDebiteurs.length > 0 && (
              <div>
                <h2 className="font-bold text-slate-800 mb-3">Créances clients</h2>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {stats.topDebiteurs.map((c, i) => (
                    <div key={c.id} className={`flex items-center justify-between px-4 py-3 ${i < stats.topDebiteurs.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                        {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                      </div>
                      <p className="text-red-600 font-bold text-sm">{FCFA(c.balanceDue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
