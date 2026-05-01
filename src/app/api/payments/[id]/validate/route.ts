import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

// POST /api/payments/[id]/validate — Admin valide un paiement livreur
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireRole("ADMIN");
  if (error || !session) return error;

  const { id } = await params;

  const collection = await prisma.paymentCollection.findUnique({
    where: { id },
    include: { order: { include: { customer: true } } },
  });
  if (!collection) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (collection.status !== "PENDING") return NextResponse.json({ error: "Déjà traité" }, { status: 400 });

  const totalCollected = (Number(collection.productAmount ?? 0) + Number(collection.deliveryAmount ?? 0));

  // Transaction : valider paiement + mettre à jour soldes
  await prisma.$transaction(async (tx) => {
    await tx.paymentCollection.update({
      where: { id },
      data: { status: "VALIDATED", validatedById: session.user.id, validatedAt: new Date() },
    });

    // Mise à jour amountPaid + balanceDue de la commande
    const order = await tx.order.findUnique({ where: { id: collection.orderId } });
    if (!order) return;

    const newAmountPaid = Number(order.amountPaid) + totalCollected;
    const newBalanceDue = Math.max(0, Number(order.totalAmount) - newAmountPaid);

    await tx.order.update({
      where: { id: collection.orderId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        deliveryFeePaid: collection.deliveryAmount !== null && Number(collection.deliveryAmount) > 0,
      },
    });

    // Mise à jour solde client si crédit
    if (order.paymentType === "CREDIT" && newBalanceDue !== Number(order.balanceDue)) {
      const diff = Number(order.balanceDue) - newBalanceDue;
      await tx.customer.update({
        where: { id: order.customerId },
        data: { balanceDue: { decrement: diff } },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
