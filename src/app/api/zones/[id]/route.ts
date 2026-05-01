import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;
  const { id } = await params;

  const { name, fee } = await req.json();
  const zone = await prisma.deliveryZone.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(fee !== undefined ? { fee: Number(fee) } : {}),
    },
  });
  return NextResponse.json(zone);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;
  const { id } = await params;

  try {
    await prisma.deliveryZone.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Impossible: zone utilisée par des commandes" },
      { status: 409 }
    );
  }
}
