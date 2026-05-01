import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">Dashboard Admin</h1>
      <p className="text-slate-500">Bonjour {session.user.fullName}</p>
      <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
        <button type="submit" className="mt-4 text-sm text-red-600">Se déconnecter</button>
      </form>
    </main>
  );
}
