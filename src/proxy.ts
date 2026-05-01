import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

const { auth } = NextAuth(authConfig);

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  MAGASINIER: "/magasinier",
  LIVREUR: "/livreur",
};

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Routes publiques
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    if (session?.user) {
      const home = ROLE_HOME[session.user.role as string] ?? "/login";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  // Pas connecté → login
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session.user.role as string;

  // Redirection racine → dashboard du rôle
  if (pathname === "/") {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
  }

  // Protection zones par rôle
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
  }
  if (pathname.startsWith("/magasinier") && role !== "MAGASINIER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
  }
  if (pathname.startsWith("/livreur") && role !== "LIVREUR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)"],
};
