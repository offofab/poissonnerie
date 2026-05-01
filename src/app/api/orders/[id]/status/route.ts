import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { sendPushToRole, sendPushToUser } from "@/lib/push";

// PATCH /api/orders/[id]/status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireRole("ADMIN", "MAGASINIER", "LIVREUR");
  if (error || !session) return error;

  const { id } = await params;
  const { status } = await req.json() as { status: string };

  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: { select: { name: true, id: true } }, items: { include: { arrivalProduct: { select: { name: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const role = session.user.role;

  // Transitions autorisées par rôle
  const allowed: Record<string, string[]> = {
    ADMIN: ["PENDING", "PREPARING", "READY", "PICKED_UP", "DELIVERING", "DELIVERED", "CANCELLED"],
    MAGASINIER: ["PREPARING", "READY"],
    LIVREUR: ["PICKED_UP", "DELIVERING", "DELIVERED"],
  };

  if (!allowed[role]?.includes(status)) {
    return NextResponse.json({ error: "Transition non autorisée" }, { status: 403 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: status as never,
      ...(status === "DELIVERED" && { deliveredAt: new Date() }),
    },
  });

  // Notifications push selon transition
  try {
    if (status === "READY") {
      await sendPushToRole("LIVREUR", {
        title: "Commande prête",
        body: `${order.customer.name} — à récupérer`,
        url: `/livreur/commandes/${id}`,
      });
    }
    if (status === "PICKED_UP" || status === "DELIVERING") {
      await sendPushToRole("ADMIN", {
        title: "Commande récupérée",
        body: `${order.customer.name} — en cours de livraison`,
        url: `/admin/commandes/${id}`,
      });
    }
    if (status === "DELIVERED") {
      await sendPushToRole("ADMIN", {
        title: "Commande livrée ✓",
        body: `${order.customer.name} — en attente de validation paiement`,
        url: `/admin/commandes/${id}`,
      });
    }
    if (status === "PREPARING") {
      if (order.assignedToId) {
        await sendPushToUser(order.assignedToId, {
          title: "Commande en préparation",
          body: `${order.customer.name}`,
          url: `/livreur/commandes/${id}`,
        });
      }
    }

    global.io?.emit("order:status", { orderId: id, status });
  } catch {}

  return NextResponse.json(updated);
}
