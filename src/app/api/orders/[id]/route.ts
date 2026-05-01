import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("ADMIN", "MAGASINIER", "LIVREUR");
  if (error) return error;

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      assignedTo: { select: { id: true, fullName: true } },
      createdBy: { select: { fullName: true } },
      deliveryZone: { select: { id: true, name: true, fee: true } },
      items: {
        include: {
          arrivalProduct: { select: { id: true, name: true, format: true } },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(order);
}
