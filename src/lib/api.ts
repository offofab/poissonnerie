import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }), session: null };
  }
  if (!roles.includes(session.user.role as Role)) {
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
