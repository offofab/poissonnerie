"use client";

import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  PREPARING: { label: "En préparation", color: "bg-blue-100 text-blue-700" },
  READY: { label: "Prête", color: "bg-purple-100 text-purple-700" },
  PICKED_UP: { label: "Récupérée", color: "bg-indigo-100 text-indigo-700" },
  DELIVERING: { label: "En livraison", color: "bg-orange-100 text-orange-700" },
  DELIVERED: { label: "Livrée", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-400" },
};

interface Order {
  id: string;
  status: string;
  totalAmount: string | number;
  customer: { name: string };
  createdAt: string | Date;
}

export default function AdminOrdersSummary({ orders }: { orders: Order[] }) {
  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const active = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Commandes du jour</h2>
        <span className="text-sm text-slate-500">{orders.length} commande{orders.length > 1 ? "s" : ""}</span>
      </div>

      {/* Compteurs par statut */}
      {orders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(counts).map(([status, count]) => {
            const s = STATUS_LABELS[status];
            return (
              <span key={status} className={`px-3 py-1 rounded-full text-xs font-medium ${s?.color ?? "bg-slate-100 text-slate-600"}`}>
                {count} {s?.label ?? status}
              </span>
            );
          })}
        </div>
      )}

      {/* Liste commandes actives */}
      {active.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
          <p className="text-slate-400 text-sm">Aucune commande active</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((o) => {
            const s = STATUS_LABELS[o.status];
            return (
              <Link
                key={o.id}
                href={`/admin/commandes/${o.id}`}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-200 hover:border-blue-300 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-800 text-sm">{o.customer.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(o.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">
                    {Math.round(parseFloat(String(o.totalAmount))).toLocaleString("fr-FR")} FCFA
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s?.color ?? ""}`}>
                    {s?.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
