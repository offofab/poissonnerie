"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Customer { id: string; name: string; phone?: string; balanceDue: string | number }
interface Zone { id: string; name: string; fee: string | number }
interface ArrivalProduct { id: string; name: string; format: string | null; remainingWeightKg: string | number; baseSalePriceKg: string | number | null }
interface Arrival { id: string; arrivalDate: string; supplier: { name: string }; products: ArrivalProduct[] }
interface Livreur { id: string; fullName: string }

interface OrderItem {
  arrivalProductId: string;
  productLabel: string;
  weightKg: string;
  unitPriceKg: string;
}

export default function NouvelleCommandePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [paymentType, setPaymentType] = useState<"ON_DELIVERY" | "PREPAID" | "CREDIT">("ON_DELIVERY");
  const [assignedToId, setAssignedToId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ arrivalProductId: "", productLabel: "", weightKg: "", unitPriceKg: "" }]);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/zones").then((r) => r.json()),
      fetch("/api/arrivals").then((r) => r.json()),
      fetch("/api/users?role=LIVREUR").then((r) => r.json()).catch(() => []),
    ]).then(([c, z, a, l]) => {
      setCustomers(c);
      setZones(z);
      setArrivals(a);
      setLivreurs(l);
    });
  }, []);

  // Tous les produits disponibles depuis les arrivages actifs
  const allProducts = arrivals.flatMap((a) =>
    a.products
      .filter((p) => parseFloat(String(p.remainingWeightKg)) > 0)
      .map((p) => ({
        ...p,
        label: `${p.name}${p.format ? ` (${p.format})` : ""} — ${a.supplier.name} — ${parseFloat(String(p.remainingWeightKg))}kg dispo`,
      }))
  );

  function addItem() {
    setItems([...items, { arrivalProductId: "", productLabel: "", weightKg: "", unitPriceKg: "" }]);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof OrderItem, value: string) {
    const updated = items.map((item, idx) => {
      if (idx !== i) return item;
      const newItem = { ...item, [field]: value };
      // Auto-remplir prix si on choisit un produit
      if (field === "arrivalProductId") {
        const product = allProducts.find((p) => p.id === value);
        if (product) {
          newItem.productLabel = product.label;
          newItem.unitPriceKg = product.baseSalePriceKg ? String(Math.round(parseFloat(String(product.baseSalePriceKg)))) : "";
        }
      }
      return newItem;
    });
    setItems(updated);
  }

  const selectedZone = zones.find((z) => z.id === zoneId);
  const deliveryFee = selectedZone ? parseFloat(String(selectedZone.fee)) : 0;
  const subtotal = items.reduce((sum, item) => {
    if (!item.weightKg || !item.unitPriceKg) return sum;
    return sum + parseFloat(item.weightKg) * parseFloat(item.unitPriceKg);
  }, 0);
  const total = subtotal + deliveryFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.arrivalProductId && i.weightKg && i.unitPriceKg);
    if (!validItems.length) { toast.error("Ajoutez au moins un produit"); return; }
    if (!customerId && !newCustomerName) { toast.error("Sélectionnez ou créez un client"); return; }

    setLoading(true);
    try {
      let finalCustomerId = customerId;
      if (showNewCustomer && newCustomerName) {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCustomerName }),
        });
        if (!res.ok) throw new Error("Erreur création client");
        finalCustomerId = (await res.json()).id;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: finalCustomerId,
          deliveryZoneId: zoneId || undefined,
          deliveryAddress: address || undefined,
          assignedToId: assignedToId || undefined,
          paymentType,
          notes: notes || undefined,
          items: validItems.map((i) => ({
            arrivalProductId: i.arrivalProductId,
            weightKg: parseFloat(i.weightKg),
            unitPriceKg: parseFloat(i.unitPriceKg),
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }
      toast.success("Commande créée !");
      router.push("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => router.back()} className="text-slate-500 text-lg">←</button>
          <h1 className="text-lg font-bold text-slate-800">Nouvelle commande</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {/* Client */}
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700">Client</h2>
          {!showNewCustomer ? (
            <>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 bg-white text-base"
              >
                <option value="">Sélectionner un client</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{parseFloat(String(c.balanceDue)) > 0 ? ` — Doit ${Math.round(parseFloat(String(c.balanceDue))).toLocaleString("fr-FR")} FCFA` : ""}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => { setShowNewCustomer(true); setCustomerId(""); }} className="text-blue-600 text-sm font-medium">
                + Nouveau client
              </button>
            </>
          ) : (
            <>
              <input
                type="text" placeholder="Nom du client"
                value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base"
              />
              <button type="button" onClick={() => { setShowNewCustomer(false); setNewCustomerName(""); }} className="text-slate-500 text-sm">
                ← Choisir existant
              </button>
            </>
          )}
        </div>

        {/* Produits */}
        <div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700">Produits</h2>
          {items.map((item, i) => (
            <div key={i} className="space-y-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 font-medium">Produit {i + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-red-400 text-sm">Supprimer</button>
                )}
              </div>
              <select
                value={item.arrivalProductId}
                onChange={(e) => updateItem(i, "arrivalProductId", e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 bg-white text-sm"
              >
                <option value="">Choisir un produit</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number" placeholder="Poids" step="0.1" min="0"
                    value={item.weightKg} onChange={(e) => updateItem(i, "weightKg", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm"
                  />
                  <span className="text-xs text-slate-400">kg</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" placeholder="Prix/kg" step="50" min="0"
                    value={item.unitPriceKg} onChange={(e) => updateItem(i, "unitPriceKg", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm"
                  />
                  <span className="text-xs text-slate-400">F/kg</span>
                </div>
              </div>
              {item.weightKg && item.unitPriceKg && (
                <p className="text-xs text-slate-500 text-right">
                  = {Math.round(parseFloat(item.weightKg) * parseFloat(item.unitPriceKg)).toLocaleString("fr-FR")} FCFA
                </p>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-medium">
            + Ajouter un produit
          </button>
        </div>

        {/* Livraison */}
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700">Livraison</h2>
          <select
            value={zoneId} onChange={(e) => setZoneId(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 bg-white text-base"
          >
            <option value="">Zone de livraison</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} — {Math.round(parseFloat(String(z.fee))).toLocaleString("fr-FR")} FCFA
              </option>
            ))}
          </select>
          <input
            type="text" placeholder="Adresse précise"
            value={address} onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base"
          />
          {livreurs.length > 0 && (
            <select
              value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 bg-white text-base"
            >
              <option value="">Assigner à un livreur</option>
              {livreurs.map((l) => (
                <option key={l.id} value={l.id}>{l.fullName}</option>
              ))}
            </select>
          )}
        </div>

        {/* Paiement */}
        <div className="bg-white rounded-2xl p-4 space-y-3 shadow-sm border border-slate-200">
          <h2 className="font-semibold text-slate-700">Paiement</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["ON_DELIVERY", "PREPAID", "CREDIT"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPaymentType(type)}
                className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                  paymentType === type ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                }`}
              >
                {type === "ON_DELIVERY" ? "À la livraison" : type === "PREPAID" ? "Prépayé" : "Crédit"}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Notes sur la commande…" value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} className="w-full px-3 py-3 rounded-xl border border-slate-300 text-slate-800 text-base resize-none"
          />
        </div>

        {/* Récap */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Produits</span>
            <span className="font-medium">{Math.round(subtotal).toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Frais livraison</span>
            <span className="font-medium">{Math.round(deliveryFee).toLocaleString("fr-FR")} FCFA</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-blue-200 pt-2">
            <span className="text-blue-800">Total</span>
            <span className="text-blue-800">{Math.round(total).toLocaleString("fr-FR")} FCFA</span>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-2xl text-base transition-colors"
        >
          {loading ? "Création…" : "✓ Créer la commande"}
        </button>
      </form>
    </main>
  );
}
