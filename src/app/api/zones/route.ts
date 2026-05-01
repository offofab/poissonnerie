import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET() {
  const { error } = await requireRole("ADMIN", "MAGASINIER", "LIVREUR");
  if (error) return error;

  const zones = await prisma.deliveryZone.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(zones);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { name, fee } = await req.json();
  if (!name?.trim() || fee === undefined || fee === null) {
    return NextResponse.json({ error: "Nom et frais requis" }, { status: 400 });
  }

  const zone = await prisma.deliveryZone.create({
    data: { name: name.trim(), fee: Number(fee) },
  });
  return NextResponse.json(zone, { status: 201 });
}
