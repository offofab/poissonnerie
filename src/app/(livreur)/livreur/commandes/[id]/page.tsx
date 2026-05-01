"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Item {
  id: string; weightKg: string; subtotal: string;
  arrivalProduct: { name: string; format: string | null };
}
interface Order {
  id: string; status: string; totalAmount: string; deliveryFee: string; balanceDue: string;
  deliveryAddress: string | null; notes: string | null; paymentType: string;
  customer: { name: string; phone: string | null };
  deliveryZone: { name: string } | null;
  items: Item[];
}

export default function LivreurCommandePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [productPaid, setProductPaid] = useState(false);
  const [deliveryPaid, setDeliveryPaid] = useState(false);
  const [method, setMethod] = useState<"CASH" | "MOBILE_MONEY">("CASH");

  useEffect(() => {
    fetch(`/api/orders/${id}`).then((r) => r.json()).then(setOrder);
  }, [id]);

  async function updateStatus(status: string) {
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
      if (status === "DELIVERING") toast.success("Livraison démarrée");
      if (status === "DELIVERED") setShowPayment(true);
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  }

  async function submitPayment() {
    if (!productPaid && !deliveryPaid) {
      toast.error("Cochez au moins un paiement reçu");
      return;
    }
    setLoading(true);
    try {
      const total = parseFloat(order!.totalAmount);
      const fee = parseFloat(order!.deliveryFee);
      const productsTotal = total - fee;

      const res = await fetch(`/api/orders/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productAmount: productPaid ? productsTotal : undefined,
          deliveryAmount: deliveryPaid ? fee : undefined,
          method,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Paiement enregistré — en attente de validation Admin");
      setTimeout(() => router.push("/livreur"), 1500);
    } catch { toast.error("Erreur"); } finally { setLoading(false); }
  }

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Chargement…</p>
    </div>
  );

  const total = parseFloat(order.totalAmount);
  const fee = parseFloat(order.deliveryFee);

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-500 text-lg">←</button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{order.customer.name}</h1>
            {order.customer.phone && (
              <a href={`tel:${order.customer.phone}`} className="text-blue-600 text-sm">
                📞 {order.customer.phone}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {/* Adresse */}
        {(order.deliveryZone || order.deliveryAddress) && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="font-medium text-slate-700">📍 {order.deliveryZone?.name}{order.deliveryAddress ? ` — ${order.deliveryAddress}` : ""}</p>
          </div>
        )}

        {/* Articles */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between px-4 py-3 border-b border-slate-50 last:border-0">
              <p className="text-sm font-medium text-slate-800">
                {item.arrivalProduct.name}{item.arrivalProduct.format ? ` · ${item.arrivalProduct.format}` : ""}
              </p>
              <p className="text-sm font-bold text-slate-800">{parseFloat(item.weightKg)}kg</p>
            </div>
          ))}
          <div className="px-4 py-3 bg-slate-50">
            <div className="flex justify-between font-bold text-base">
              <span>Total à encaisser</span>
              <span>{Math.round(total).toLocaleString("fr-FR")} FCFA</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-sm text-slate-500 mt-1">
                <span>dont frais livraison</span>
                <span>{Math.round(fee).toLocaleString("fr-FR")} FCFA</span>
              </div>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="text-sm text-amber-800">📝 {order.notes}</p>
          </div>
        )}

        {/* Actions livreur */}
        {order.status === "READY" && (
          <button onClick={() => updateStatus("PICKED_UP")} disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 rounded-2xl text-base">
            ✓ J'ai récupéré la commande
          </button>
        )}

        {(order.status === "PICKED_UP") && (
          <button onClick={() => updateStatus("DELIVERING")} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-4 rounded-2xl text-base">
            🚴 Démarrer la livraison
          </button>
        )}

        {order.status === "DELIVERING" && !showPayment && (
          <button onClick={() => updateStatus("DELIVERED")} disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-5 rounded-2xl text-lg">
            ✓ Livraison effectuée
          </button>
        )}

        {/* Saisie paiement après livraison */}
        {(order.status === "DELIVERED" || showPayment) && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
            <p className="font-semibold text-slate-700">Paiement reçu</p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={productPaid} onChange={(e) => setProductPaid(e.target.checked)}
                  className="w-5 h-5 rounded" />
                <span className="text-sm text-slate-700">
                  Produits payés ({Math.round(total - fee).toLocaleString("fr-FR")} FCFA)
                </span>
              </label>
              {fee > 0 && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={deliveryPaid} onChange={(e) => setDeliveryPaid(e.target.checked)}
                    className="w-5 h-5 rounded" />
                  <span className="text-sm text-slate-700">
                    Frais livraison payés ({Math.round(fee).toLocaleString("fr-FR")} FCFA)
                  </span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["CASH", "MOBILE_MONEY"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors ${method === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                  {m === "CASH" ? "💵 Cash" : "📱 Mobile Money"}
                </button>
              ))}
            </div>

            <button onClick={submitPayment} disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 rounded-2xl text-base">
              {loading ? "Envoi…" : "Enregistrer le paiement"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
