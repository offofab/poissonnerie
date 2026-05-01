import Link from "next/link";

export default function NouvelleCommandePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <p className="text-4xl mb-4">🚧</p>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Étape 5 — Commandes</h1>
        <p className="text-slate-500 text-sm mb-6">Ce module est en cours de développement</p>
        <Link href="/admin" className="text-blue-600 font-medium">← Retour au dashboard</Link>
      </div>
    </main>
  );
}
