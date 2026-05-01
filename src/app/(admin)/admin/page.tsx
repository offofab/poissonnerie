import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { signOut } from "@/auth";
import AdminStockCard from "./_components/AdminStockCard";
import AdminOrdersSummary from "./_components/AdminOrdersSummary";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [openArrivalsRaw, todayOrdersRaw, draftArrivalsRaw] = await Promise.all([
    prisma.arrival.findMany({
      where: { status: "OPEN" },
      include: {
        supplier: { select: { name: true } },
        products: {
          select: { id: true, name: true, format: true, remainingWeightKg: true, baseSalePriceKg: true },
        },
      },
      orderBy: { arrivalDate: "desc" },
    }),
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.arrival.findMany({
      where: { status: "DRAFT" },
      include: { supplier: { select: { name: true } }, products: true },
      orderBy: { arrivalDate: "desc" },
    }),
  ]);

  // Sérialisation Decimal → number, Date → string pour les composants client
  const openArrivals = openArrivalsRaw.map((a) => ({
    ...a,
    arrivalDate: a.arrivalDate.toISOString(),
    products: a.products.map((p) => ({
      ...p,
      remainingWeightKg: Number(p.remainingWeightKg),
      baseSalePriceKg: p.baseSalePriceKg !== null ? Number(p.baseSalePriceKg) : null,
    })),
  }));

  const todayOrders = todayOrdersRaw.map((o) => ({
    ...o,
    totalAmount: Number(o.totalAmount),
    createdAt: o.createdAt.toISOString(),
  }));

  const draftArrivals = draftArrivalsRaw.map((a) => ({
    ...a,
    arrivalDate: a.arrivalDate.toISOString(),
    products: a.products.map((p) => ({ id: p.id, name: p.name })),
  }));

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-slate-800">🐟 APL Poissonnerie</h1>
            <p className="text-xs text-slate-500">Bonjour {session.user.fullName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/arrivages" className="text-sm text-blue-600 font-medium">
              Arrivages
            </Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" className="text-sm text-slate-400">Déco.</button>
            </form>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">

        {/* BOUTON NOUVELLE COMMANDE — priorité absolue */}
        <Link
          href="/admin/commandes/nouvelle"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl text-center text-lg shadow-lg shadow-blue-200 transition-colors"
        >
          + Nouvelle commande
        </Link>

        {/* Navigation rapide */}
        <div className="grid grid-cols-4 gap-2">
          <Link href="/admin/stats" className="bg-white rounded-2xl border border-slate-200 py-3 text-center">
            <p className="text-xl">📊</p>
            <p className="text-xs font-medium text-slate-700 mt-1">Stats</p>
          </Link>
          <Link href="/admin/clients" className="bg-white rounded-2xl border border-slate-200 py-3 text-center">
            <p className="text-xl">👥</p>
            <p className="text-xs font-medium text-slate-700 mt-1">Clients</p>
          </Link>
          <Link href="/admin/fournisseurs" className="bg-white rounded-2xl border border-slate-200 py-3 text-center">
            <p className="text-xl">🚚</p>
            <p className="text-xs font-medium text-slate-700 mt-1">Fourniss.</p>
          </Link>
          <Link href="/admin/equipe" className="bg-white rounded-2xl border border-slate-200 py-3 text-center">
            <p className="text-xl">🧑‍🔧</p>
            <p className="text-xs font-medium text-slate-700 mt-1">Équipe</p>
          </Link>
        </div>

        {/* Arrivages en brouillon (à compléter) */}
        {draftArrivals.length > 0 && (
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
            <h2 className="font-semibold text-orange-800 mb-3">
              ⚠ À compléter ({draftArrivals.length})
            </h2>
            <div className="space-y-2">
              {draftArrivals.map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/arrivages/${a.id}`}
                  className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-orange-100"
                >
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{a.supplier.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.arrivalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      {" · "}{a.products.length} produit{a.products.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-orange-600 text-sm">→ Compléter</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stock disponible par arrivage actif */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800">Stock disponible</h2>
            <span className="text-sm text-slate-500">{openArrivals.length} arrivage{openArrivals.length > 1 ? "s" : ""} actif{openArrivals.length > 1 ? "s" : ""}</span>
          </div>

          {openArrivals.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
              <p className="text-slate-400">Aucun arrivage actif</p>
              <Link href="/admin/arrivages" className="text-blue-600 text-sm font-medium block mt-2">
                Gérer les arrivages →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {openArrivals.map((a) => (
                <AdminStockCard key={a.id} arrival={a} />
              ))}
            </div>
          )}
        </div>

        {/* Commandes du jour */}
        <AdminOrdersSummary orders={todayOrders} />
      </div>
    </main>
  );
}
