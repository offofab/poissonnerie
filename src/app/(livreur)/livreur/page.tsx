import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LivreurPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LIVREUR") redirect("/login");

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">Espace Livreur</h1>
      <p className="text-slate-500">Bonjour {session.user.fullName}</p>
    </main>
  );
}
