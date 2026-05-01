"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Item {
  id: string; weightKg: string;
  arrivalProduct: { name: string; format: string | null };
}
interface Order {
  id: string; status: string; notes: string | null;
  customer: { name: string; phone: string | null };
  deliveryZone: { name: string } | null;
  deliveryAddress: string | null;
  items: Item[];
}

export default function MagasinierCommandePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${id}`).then((r) => r.json()).then(setOrder);
  }, [id]);

  async function updateStatus(status: "PREPARING" | "READY") {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setOrder((o) => o ? { ...o, status: updated.status } : o);
      toast.success(status === "READY" ? "Commande marquée prête !" : "Préparation démarrée");
      if (status === "READY") setTimeout(() => router.push("/magasinier"), 1500);
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  }

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Chargement…</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-500 text-lg">←</button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{order.customer.name}</h1>
            <p className="text-sm text-slate-500">
              {order.deliveryZone?.name ?? "—"}{order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Articles à préparer */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-700">À préparer</p>
          </div>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-4 border-b border-slate-50 last:border-0">
              <p className="text-base font-medium text-slate-800">
                {item.arrivalProduct.name}
                {item.arrivalProduct.format && <span className="text-slate-400 font-normal"> · {item.arrivalProduct.format}</span>}
              </p>
              <p className="text-2xl font-bold text-slate-800">{parseFloat(item.weightKg)} kg</p>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="text-sm font-medium text-amber-800">📝 Note : {order.notes}</p>
          </div>
        )}

        {order.customer.phone && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="text-sm text-slate-600">📞 {order.customer.phone}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {order.status === "PENDING" && (
            <button
              onClick={() => updateStatus("PREPARING")}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-2xl text-base"
            >
              Démarrer la préparation
            </button>
          )}
          {order.status === "PREPARING" && (
            <button
              onClick={() => updateStatus("READY")}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-5 rounded-2xl text-lg"
            >
              ✓ Marquer comme prête
            </button>
          )}
          {order.status === "READY" && (
            <div className="text-center py-4">
              <p className="text-green-600 font-bold text-lg">✓ Commande prête</p>
              <p className="text-slate-400 text-sm mt-1">En attente du livreur</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
