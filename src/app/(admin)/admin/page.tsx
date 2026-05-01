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

  const heure = new Date().getHours();
  const salutation = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl shadow-md shadow-blue-200">
              🐟
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">APL Poissonnerie</h1>
              <p className="text-xs text-slate-500">{salutation} {session.user.fullName.split(" ")[0]}</p>
            </div>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="text-xs text-slate-400 hover:text-slate-600 transition px-2 py-1">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-5 max-w-2xl mx-auto">

        {/* BOUTON NOUVELLE COMMANDE — priorité absolue */}
        <Link
          href="/admin/commandes/nouvelle"
          className="group block w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-5 rounded-2xl text-center text-lg shadow-lg shadow-blue-200 transition active:scale-[0.99]"
        >
          <span className="inline-flex items-center gap-2">
            <span className="text-2xl group-hover:rotate-90 transition">+</span>
            Nouvelle commande
          </span>
        </Link>

        {/* Navigation rapide */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/admin/arrivages", icon: "📦", label: "Arrivages" },
            { href: "/admin/categories", icon: "🏷️", label: "Catégories" },
            { href: "/admin/clients", icon: "👥", label: "Clients" },
            { href: "/admin/fournisseurs", icon: "🚚", label: "Fourniss." },
            { href: "/admin/stats", icon: "📊", label: "Stats" },
            { href: "/admin/equipe", icon: "🧑‍🔧", label: "Équipe" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-2xl border border-slate-200 py-3 text-center hover:border-blue-300 hover:shadow-md hover:shadow-blue-100 transition"
            >
              <p className="text-2xl">{item.icon}</p>
              <p className="text-xs font-medium text-slate-700 mt-1">{item.label}</p>
            </Link>
          ))}
        </div>

        {/* Arrivages en brouillon (à compléter) */}
        {draftArrivals.length > 0 && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200">
            <h2 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">!</span>
              À compléter ({draftArrivals.length})
            </h2>
            <div className="space-y-2">
              {draftArrivals.map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/arrivages/${a.id}`}
                  className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-orange-100 hover:border-orange-300 transition"
                >
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{a.supplier.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.arrivalDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      {" · "}{a.products.length} produit{a.products.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-orange-600 text-sm font-medium">Compléter →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stock disponible par arrivage actif */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-lg">Stock disponible</h2>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {openArrivals.length} actif{openArrivals.length > 1 ? "s" : ""}
            </span>
          </div>

          {openArrivals.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-4xl mb-2">📦</p>
              <p className="font-medium text-slate-700">Aucun arrivage actif</p>
              <p className="text-sm text-slate-400 mt-1">Crée un arrivage pour ajouter du stock.</p>
              <Link
                href="/admin/arrivages/nouveau"
                className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
              >
                + Nouvel arrivage
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
