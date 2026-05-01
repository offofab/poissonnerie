import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { signOut } from "@/auth";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  PREPARING: { label: "En préparation", color: "bg-blue-100 text-blue-700" },
  READY: { label: "Prête ✓", color: "bg-green-100 text-green-700" },
};

export default async function MagasinierPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAGASINIER") redirect("/login");

  const commandesDuJour = await prisma.order.findMany({
    where: {
      status: { in: ["PENDING", "PREPARING", "READY"] },
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    include: {
      customer: { select: { name: true } },
      items: {
        include: {
          arrivalProduct: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">🏪 Magasin</h1>
            <p className="text-xs text-slate-500">Bonjour {session.user.fullName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/magasinier/arrivages/nouveau"
              className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            >
              + Arrivage
            </Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" className="text-slate-400 text-sm">Déco.</button>
            </form>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3 max-w-lg mx-auto">
        <h2 className="font-bold text-slate-700">
          Commandes à préparer ({commandesDuJour.length})
        </h2>

        {commandesDuJour.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-400">Aucune commande en attente</p>
          </div>
        ) : (
          commandesDuJour.map((order) => {
            const s = STATUS_LABELS[order.status];
            return (
              <Link
                key={order.id}
                href={`/magasinier/commandes/${order.id}`}
                className="block bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-800">{order.customer.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.items.map((i) => `${i.arrivalProduct.name} ${parseFloat(String(i.weightKg))}kg`).join(" · ")}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s?.color ?? "bg-slate-100 text-slate-600"}`}>
                    {s?.label ?? order.status}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
