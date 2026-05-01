import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

// POST /api/orders/[id]/payments — livreur saisit paiement (PENDING jusqu'à validation admin)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireRole("LIVREUR", "ADMIN");
  if (error || !session) return error;

  const { id } = await params;
  const { productAmount, deliveryAmount, method } = await req.json() as {
    productAmount?: number;
    deliveryAmount?: number;
    method: "CASH" | "MOBILE_MONEY";
  };

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const collection = await prisma.paymentCollection.create({
    data: {
      orderId: id,
      collectedById: session.user.id,
      productAmount,
      deliveryAmount,
      method,
      status: "PENDING",
    },
  });

  return NextResponse.json(collection, { status: 201 });
}

// GET /api/orders/[id]/payments — historique paiements (ADMIN)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { id } = await params;
  const collections = await prisma.paymentCollection.findMany({
    where: { orderId: id },
    include: { collectedBy: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(collections);
}
