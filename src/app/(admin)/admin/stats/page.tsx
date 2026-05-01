"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type Period = "today" | "week" | "month";

interface ArrivageStat {
  id: string; supplier: string; arrivalDate: string; status: string;
  totalAchat: number; expenses: number; coutTotal: number;
  totalVentes: number; benefice: number; kgVendu: number; kgRestant: number;
  products: Array<{ name: string; format: string | null; totalWeightKg: number; remainingWeightKg: number; purchasePriceKg: number | null; baseSalePriceKg: number | null }>;
}

interface MonthData { month: string; ca: number; count: number }
interface DailyPoint { date: string; label: string; ca: number; count: number }
interface NamedAmount { name: string; ca: number; emoji?: string | null }
interface TopProduct { name: string; kg: number; ca: number; emoji: string | null }
interface StockCat { name: string; emoji: string | null; remainingKg: number; totalKg: number }
interface Debiteur { id: string; name: string; phone: string | null; balanceDue: number }

interface Stats {
  period: string;
  kpis: {
    ca: number; caValide: number; creancesTotal: number; commandeCount: number;
    commandesParStatut: Record<string, number>;
    evolutionCA: number | null; tauxRecouvrement: number; ticketMoyen: number;
  };
  arrivageStats: ArrivageStat[];
  monthlyData: MonthData[];
  dailySeries: DailyPoint[];
  caByZone: NamedAmount[];
  caByCategory: NamedAmount[];
  topProducts: TopProduct[];
  stockByCategory: StockCat[];
  topDebiteurs: Debiteur[];
}

const FCFA = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;
const FCFAk = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;

const COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>("month");
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
    <main className="min-h-screen bg-slate-100 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 text-xl hover:text-slate-700 transition">←</Link>
            <h1 className="text-lg font-bold text-slate-800">📊 Tableau de bord</h1>
          </div>
          <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${period === p ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-3 pt-4 max-w-6xl mx-auto">
        {loading || !stats ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400">Chargement…</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            {/* === ROW 1 — KPI tiles === */}
            <KpiTile
              span="col-span-6 lg:col-span-3"
              label="Chiffre d'affaires"
              value={FCFA(stats.kpis.ca)}
              evolution={stats.kpis.evolutionCA}
              accent="from-blue-500 to-cyan-500"
              icon="💰"
            />
            <KpiTile
              span="col-span-6 lg:col-span-3"
              label="Encaissé"
              value={FCFA(stats.kpis.caValide)}
              sub={`${stats.kpis.tauxRecouvrement}% recouvré`}
              accent="from-green-500 to-emerald-500"
              icon="✓"
            />
            <KpiTile
              span="col-span-6 lg:col-span-3"
              label="Commandes"
              value={String(stats.kpis.commandeCount)}
              sub={`Ticket moyen: ${FCFA(stats.kpis.ticketMoyen)}`}
              accent="from-purple-500 to-pink-500"
              icon="📋"
            />
            <KpiTile
              span="col-span-6 lg:col-span-3"
              label="Créances"
              value={FCFA(stats.kpis.creancesTotal)}
              sub={`${stats.topDebiteurs.length} débiteur${stats.topDebiteurs.length > 1 ? "s" : ""}`}
              accent="from-red-500 to-orange-500"
              icon="⚠"
            />

            {/* === ROW 2 — Daily series + Donut zones === */}
            <Tile span="col-span-12 lg:col-span-8" title="Évolution CA — 30 derniers jours">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.dailySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={FCFAk} width={45} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v) => FCFA(Number(v))}
                  />
                  <Area type="monotone" dataKey="ca" stroke="#3b82f6" strokeWidth={2} fill="url(#caGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Tile>

            <Tile span="col-span-12 lg:col-span-4" title="CA par zone">
              {stats.caByZone.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.caByZone}
                      dataKey="ca"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {stats.caByZone.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => FCFA(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Tile>

            {/* === ROW 3 — CA mensuel + CA par catégorie === */}
            <Tile span="col-span-12 lg:col-span-6" title="CA mensuel — 6 derniers mois">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={FCFAk} width={45} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v) => FCFA(Number(v))}
                  />
                  <Bar dataKey="ca" radius={[8, 8, 0, 0]}>
                    {stats.monthlyData.map((_, i) => (
                      <Cell key={i} fill={i === stats.monthlyData.length - 1 ? "#3b82f6" : "#93c5fd"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Tile>

            <Tile span="col-span-12 lg:col-span-6" title="CA par catégorie">
              {stats.caByCategory.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.caByCategory} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={FCFAk} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} width={80} />
                    <Tooltip formatter={(v) => FCFA(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="ca" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Tile>

            {/* === ROW 4 — Top produits (kg) + Stock par cat === */}
            <Tile span="col-span-12 lg:col-span-6" title="Top produits vendus (kg)">
              {stats.topProducts.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="space-y-2 mt-2">
                  {stats.topProducts.map((p, i) => {
                    const max = stats.topProducts[0].kg || 1;
                    const pct = (p.kg / max) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center">{p.emoji ?? "🐟"}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">{p.name}</span>
                            <span className="text-xs text-slate-500">{p.kg} kg · {FCFA(p.ca)}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Tile>

            <Tile span="col-span-12 lg:col-span-6" title="Stock par catégorie">
              {stats.stockByCategory.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="space-y-2 mt-2">
                  {stats.stockByCategory.map((c) => {
                    const pct = c.totalKg > 0 ? (c.remainingKg / c.totalKg) * 100 : 0;
                    return (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center">{c.emoji ?? "🐟"}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">{c.name}</span>
                            <span className="text-xs text-slate-500">{c.remainingKg} / {c.totalKg} kg</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct > 50 ? "bg-green-500" : pct > 20 ? "bg-orange-400" : "bg-red-400"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Tile>

            {/* === ROW 5 — Bénéfice par arrivage === */}
            <Tile span="col-span-12" title="Bénéfice par arrivage">
              {stats.arrivageStats.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="space-y-2">
                  {stats.arrivageStats.map((a) => (
                    <div key={a.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-100 transition"
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
                            <p className={`text-base font-bold ${a.benefice >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {a.benefice >= 0 ? "+" : ""}{FCFA(a.benefice)}
                            </p>
                            <p className="text-xs text-slate-400">{expanded === a.id ? "▲" : "▼"}</p>
                          </div>
                        </div>
                      </button>

                      {expanded === a.id && (
                        <div className="border-t border-slate-200 px-4 py-3 bg-white space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <MiniStat label="Achat" value={FCFA(a.totalAchat)} />
                            <MiniStat label="Dépenses" value={FCFA(a.expenses)} />
                            <MiniStat label="Ventes" value={FCFA(a.totalVentes)} green />
                            <MiniStat label="Bénéfice" value={`${a.benefice >= 0 ? "+" : ""}${FCFA(a.benefice)}`} green={a.benefice >= 0} red={a.benefice < 0} />
                          </div>
                          <Link href={`/admin/arrivages/${a.id}`} className="block text-center text-blue-600 text-sm font-medium pt-1 hover:text-blue-700">
                            Voir détails →
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Tile>

            {/* === ROW 6 — Débiteurs === */}
            {stats.topDebiteurs.length > 0 && (
              <Tile span="col-span-12" title="Top créances clients">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {stats.topDebiteurs.map((c, i) => (
                    <div key={c.id} className={`flex items-center justify-between px-4 py-2.5 bg-white ${i < stats.topDebiteurs.length - 1 ? "border-b border-slate-100" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                          {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                        </div>
                      </div>
                      <p className="text-red-600 font-bold text-sm">{FCFA(c.balanceDue)}</p>
                    </div>
                  ))}
                </div>
              </Tile>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// === Sous-composants ===

function KpiTile({
  span, label, value, sub, evolution, accent, icon,
}: {
  span: string; label: string; value: string; sub?: string;
  evolution?: number | null; accent: string; icon: string;
}) {
  return (
    <div className={`${span} bg-white rounded-2xl p-4 shadow-sm border border-slate-200 relative overflow-hidden`}>
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${accent} opacity-10`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-xl lg:text-2xl font-bold text-slate-800 mt-1">{value}</p>
          </div>
          <span className={`text-xl bg-gradient-to-br ${accent} text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-sm`}>
            {icon}
          </span>
        </div>
        {evolution !== undefined && evolution !== null && (
          <p className={`text-xs font-medium mt-1.5 ${evolution >= 0 ? "text-green-600" : "text-red-600"}`}>
            {evolution >= 0 ? "▲" : "▼"} {Math.abs(Math.round(evolution))}% vs préc.
          </p>
        )}
        {sub && !evolution && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function Tile({ span, title, children }: { span: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`${span} bg-white rounded-2xl p-4 shadow-sm border border-slate-200`}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[220px]">
      <p className="text-slate-400 text-sm">Pas de données sur cette période</p>
    </div>
  );
}

function MiniStat({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-bold ${green ? "text-green-600" : red ? "text-red-600" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
