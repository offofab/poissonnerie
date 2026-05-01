import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const role = req.nextUrl.searchParams.get("role");
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(role && { role: role as never }),
    },
    select: { id: true, fullName: true, email: true, role: true, phone: true, isActive: true },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { email, password, fullName, role, phone } = await req.json() as {
    email: string; password: string; fullName: string;
    role: "ADMIN" | "MAGASINIER" | "LIVREUR"; phone?: string;
  };

  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, fullName, role, phone },
    select: { id: true, fullName: true, email: true, role: true },
  });

  return NextResponse.json(user, { status: 201 });
}
