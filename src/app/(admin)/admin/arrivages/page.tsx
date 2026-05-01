import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-orange-100 text-orange-700" },
  OPEN: { label: "Actif", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Clôturé", color: "bg-slate-100 text-slate-500" },
};

export default async function ArrivagesListPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const arrivals = await prisma.arrival.findMany({
    include: {
      supplier: { select: { name: true } },
      products: { select: { id: true, name: true, remainingWeightKg: true, totalWeightKg: true } },
    },
    orderBy: { arrivalDate: "desc" },
    take: 50,
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 text-xl hover:text-slate-700 transition">←</Link>
            <h1 className="text-lg font-bold text-slate-800">Arrivages</h1>
          </div>
          <Link
            href="/admin/arrivages/nouveau"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-blue-200 transition"
          >
            + Nouveau
          </Link>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3 max-w-2xl mx-auto">
        {arrivals.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-medium text-slate-700">Aucun arrivage enregistré</p>
            <p className="text-sm text-slate-400 mt-1">Crée ton premier arrivage pour commencer.</p>
            <Link
              href="/admin/arrivages/nouveau"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
            >
              + Nouvel arrivage
            </Link>
          </div>
        ) : (
          arrivals.map((a) => {
            const s = STATUS_LABELS[a.status];
            const totalRemaining = a.products.reduce(
              (sum, p) => sum + parseFloat(String(p.remainingWeightKg)),
              0
            );
            const totalWeight = a.products.reduce(
              (sum, p) => sum + parseFloat(String(p.totalWeightKg)),
              0
            );
            return (
              <Link
                key={a.id}
                href={`/admin/arrivages/${a.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800">{a.supplier.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s?.color}`}>
                        {s?.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {new Date(a.arrivalDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{Math.round(totalRemaining * 10) / 10} kg</p>
                    <p className="text-xs text-slate-500">/ {Math.round(totalWeight * 10) / 10} kg</p>
                  </div>
                </div>
                <div className="px-4 pb-3 flex flex-wrap gap-1">
                  {a.products.map((p) => (
                    <span key={p.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {p.name}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
