import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { signOut } from "@/auth";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  READY: { label: "À récupérer", color: "bg-purple-100 text-purple-700" },
  PICKED_UP: { label: "Récupérée", color: "bg-indigo-100 text-indigo-700" },
  DELIVERING: { label: "En livraison", color: "bg-orange-100 text-orange-700" },
  DELIVERED: { label: "Livrée ✓", color: "bg-green-100 text-green-700" },
};

export default async function LivreurPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIVREUR") redirect("/login");

  const orders = await prisma.order.findMany({
    where: {
      assignedToId: session.user.id,
      status: { in: ["READY", "PICKED_UP", "DELIVERING", "DELIVERED"] },
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      deliveryZone: { select: { name: true } },
      items: { include: { arrivalProduct: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = orders.map((o) => ({
    ...o,
    totalAmount: Number(o.totalAmount),
    deliveryFee: Number(o.deliveryFee),
    balanceDue: Number(o.balanceDue),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({ ...i, weightKg: Number(i.weightKg), subtotal: Number(i.subtotal), unitPriceKg: Number(i.unitPriceKg) })),
  }));

  const active = serialized.filter((o) => o.status !== "DELIVERED");
  const done = serialized.filter((o) => o.status === "DELIVERED");

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">🚴 Livraisons</h1>
            <p className="text-xs text-slate-500">Bonjour {session.user.fullName}</p>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="text-slate-400 text-sm">Déco.</button>
          </form>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3 max-w-lg mx-auto">
        {active.length === 0 && done.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-400">Aucune livraison assignée aujourd'hui</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-bold text-slate-700">En cours ({active.length})</h2>
                {active.map((o) => {
                  const s = STATUS_LABELS[o.status];
                  return (
                    <Link
                      key={o.id}
                      href={`/livreur/commandes/${o.id}`}
                      className="block bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-800">{o.customer.name}</p>
                          <p className="text-xs text-slate-500">
                            {o.deliveryZone?.name ?? "—"} · {o.items.map((i) => `${i.arrivalProduct.name} ${i.weightKg}kg`).join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800">{Math.round(o.totalAmount).toLocaleString("fr-FR")} F</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s?.color}`}>{s?.label}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {done.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-bold text-slate-500 text-sm">Livrées aujourd'hui ({done.length})</h2>
                {done.map((o) => (
                  <div key={o.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100 opacity-60">
                    <p className="text-sm text-slate-700">{o.customer.name}</p>
                    <p className="text-sm font-medium text-green-600">✓ {Math.round(o.totalAmount).toLocaleString("fr-FR")} F</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
