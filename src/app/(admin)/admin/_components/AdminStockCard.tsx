"use client";

import Link from "next/link";

interface Product {
  id: string;
  name: string;
  format: string | null;
  remainingWeightKg: string | number;
  baseSalePriceKg: string | number | null;
}

interface Arrival {
  id: string;
  arrivalDate: string | Date;
  supplier: { name: string };
  products: Product[];
}

export default function AdminStockCard({ arrival }: { arrival: Arrival }) {
  const totalRemaining = arrival.products.reduce(
    (sum, p) => sum + parseFloat(String(p.remainingWeightKg)),
    0
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* En-tête arrivage */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div>
          <p className="font-bold text-slate-800">{arrival.supplier.name}</p>
          <p className="text-xs text-slate-500">
            {new Date(arrival.arrivalDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-green-700">{Math.round(totalRemaining * 10) / 10} kg</p>
          <p className="text-xs text-slate-500">restants</p>
        </div>
      </div>

      {/* Produits */}
      <div className="divide-y divide-slate-100">
        {arrival.products.map((p) => {
          const remaining = parseFloat(String(p.remainingWeightKg));
          const isEmpty = remaining <= 0;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-3 ${isEmpty ? "opacity-40" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {p.name}
                  {p.format && <span className="text-slate-400 font-normal"> · {p.format}</span>}
                </p>
                {p.baseSalePriceKg && (
                  <p className="text-xs text-slate-500">
                    {Math.round(parseFloat(String(p.baseSalePriceKg))).toLocaleString("fr-FR")} FCFA / kg
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className={`text-base font-bold ${isEmpty ? "text-red-400" : remaining < 5 ? "text-orange-500" : "text-slate-800"}`}>
                  {Math.round(remaining * 10) / 10} kg
                </p>
                {isEmpty && <p className="text-xs text-red-400">Épuisé</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-slate-100">
        <Link href={`/admin/arrivages/${arrival.id}`} className="text-xs text-blue-600 font-medium">
          Modifier les prix →
        </Link>
      </div>
    </div>
  );
}
