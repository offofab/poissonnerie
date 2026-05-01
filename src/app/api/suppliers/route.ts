import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET() {
  const { error } = await requireRole("ADMIN", "MAGASINIER");
  if (error) return error;

  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(suppliers);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { name, phone } = await req.json() as { name: string; phone?: string };
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const supplier = await prisma.supplier.create({ data: { name, phone } });
  return NextResponse.json(supplier, { status: 201 });
}
