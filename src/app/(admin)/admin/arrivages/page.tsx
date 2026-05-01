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
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 text-lg">←</Link>
            <h1 className="text-lg font-bold text-slate-800">Arrivages</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3 max-w-2xl mx-auto">
        {arrivals.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-400">Aucun arrivage enregistré</p>
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
