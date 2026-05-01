"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente", PREPARING: "En préparation", READY: "Prête",
  PICKED_UP: "Récupérée", DELIVERING: "En livraison", DELIVERED: "Livrée", CANCELLED: "Annulée",
};

interface OrderItem {
  id: string; weightKg: string; unitPriceKg: string; subtotal: string;
  arrivalProduct: { name: string; format: string | null };
}
interface Payment {
  id: string; productAmount: string | null; deliveryAmount: string | null;
  method: string; status: string; collectedBy: { fullName: string }; collectedAt: string;
}
interface Order {
  id: string; status: string; totalAmount: string; balanceDue: string;
  deliveryFee: string; deliveryAddress: string | null; paymentType: string;
  notes: string | null; deliveredAt: string | null; createdAt: string;
  customer: { id: string; name: string; phone: string | null };
  assignedTo: { fullName: string } | null;
  deliveryZone: { name: string } | null;
  items: OrderItem[];
}

export default function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchOrder() {
    const [oRes, pRes] = await Promise.all([
      fetch(`/api/orders/${id}`),
      fetch(`/api/orders/${id}/payments`),
    ]);
    if (oRes.ok) setOrder(await oRes.json());
    if (pRes.ok) setPayments(await pRes.json());
  }

  useEffect(() => { fetchOrder(); }, [id]);

  async function updateStatus(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await fetchOrder();
      toast.success("Statut mis à jour");
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  }

  async function validatePayment(paymentId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/validate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      await fetchOrder();
      toast.success("Paiement validé !");
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  }

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Chargement…</p>
    </div>
  );

  const pendingPayments = payments.filter((p) => p.status === "PENDING");

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-slate-500 text-lg">←</button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{order.customer.name}</h1>
            <p className="text-sm text-slate-500">{STATUS_LABELS[order.status]}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {/* Articles */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-700">Articles</p>
          </div>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between px-4 py-3 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{item.arrivalProduct.name}</p>
                <p className="text-xs text-slate-500">{parseFloat(item.weightKg)}kg × {Math.round(parseFloat(item.unitPriceKg)).toLocaleString("fr-FR")} F/kg</p>
              </div>
              <p className="text-sm font-bold text-slate-800">{Math.round(parseFloat(item.subtotal)).toLocaleString("fr-FR")} F</p>
            </div>
          ))}
          <div className="px-4 py-3 bg-slate-50 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Livraison ({order.deliveryZone?.name ?? "—"})</span>
              <span>{Math.round(parseFloat(order.deliveryFee)).toLocaleString("fr-FR")} F</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{Math.round(parseFloat(order.totalAmount)).toLocaleString("fr-FR")} FCFA</span>
            </div>
            {parseFloat(order.balanceDue) > 0 && (
              <div className="flex justify-between text-sm text-red-600 font-medium">
                <span>Solde dû</span>
                <span>{Math.round(parseFloat(order.balanceDue)).toLocaleString("fr-FR")} FCFA</span>
              </div>
            )}
          </div>
        </div>

        {/* Infos livraison */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-2">
          <p className="font-semibold text-slate-700">Livraison</p>
          {order.deliveryAddress && <p className="text-sm text-slate-600">{order.deliveryAddress}</p>}
          {order.customer.phone && <p className="text-sm text-slate-600">📞 {order.customer.phone}</p>}
          {order.assignedTo && <p className="text-sm text-slate-600">🚴 {order.assignedTo.fullName}</p>}
          <p className="text-xs text-slate-400">{order.paymentType === "ON_DELIVERY" ? "Paiement à la livraison" : order.paymentType === "PREPAID" ? "Prépayé" : "Crédit"}</p>
        </div>

        {/* Paiements en attente */}
        {pendingPayments.length > 0 && (
          <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-4 space-y-3">
            <p className="font-semibold text-yellow-800">Paiements à valider ({pendingPayments.length})</p>
            {pendingPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-yellow-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {[p.productAmount && `Produits : ${Math.round(parseFloat(p.productAmount)).toLocaleString("fr-FR")} F`, p.deliveryAmount && `Livraison : ${Math.round(parseFloat(p.deliveryAmount)).toLocaleString("fr-FR")} F`].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-slate-500">{p.method === "CASH" ? "Cash" : "Mobile Money"} · {p.collectedBy.fullName}</p>
                </div>
                <button
                  onClick={() => validatePayment(p.id)}
                  disabled={loading}
                  className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                >
                  Valider
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions statut */}
        {order.status === "PENDING" && (
          <button onClick={() => updateStatus("CANCELLED")} disabled={loading}
            className="w-full border-2 border-red-200 text-red-600 font-semibold py-3 rounded-2xl text-sm">
            Annuler la commande
          </button>
        )}
      </div>
    </main>
  );
}
