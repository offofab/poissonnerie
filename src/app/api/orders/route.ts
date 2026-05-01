import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { sendPushToRole } from "@/lib/push";

// GET /api/orders — filtré par rôle
export async function GET(req: NextRequest) {
  const { error, session } = await requireRole("ADMIN", "MAGASINIER", "LIVREUR");
  if (error || !session) return error;

  const status = req.nextUrl.searchParams.get("status");
  const role = session.user.role;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (role === "LIVREUR") where.assignedToId = session.user.id;
  if (role === "MAGASINIER") where.status = { in: ["PENDING", "PREPARING", "READY"] };

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      assignedTo: { select: { id: true, fullName: true } },
      deliveryZone: { select: { id: true, name: true, fee: true } },
      items: {
        include: {
          arrivalProduct: { select: { id: true, name: true, format: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(orders);
}

// POST /api/orders — créer commande (ADMIN uniquement)
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole("ADMIN");
  if (error || !session) return error;

  const body = await req.json() as {
    customerId: string;
    deliveryZoneId?: string;
    deliveryAddress?: string;
    assignedToId?: string;
    paymentType: "PREPAID" | "ON_DELIVERY" | "CREDIT";
    notes?: string;
    items: Array<{
      arrivalProductId: string;
      weightKg: number;
      unitPriceKg: number;
    }>;
  };

  const { customerId, deliveryZoneId, deliveryAddress, assignedToId, paymentType, notes, items } = body;

  if (!customerId || !items?.length) {
    return NextResponse.json({ error: "Client et produits requis" }, { status: 400 });
  }

  // Vérifier zone livraison + frais
  const zone = deliveryZoneId
    ? await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } })
    : null;
  const deliveryFee = zone ? Number(zone.fee) : 0;

  // Calcul montants
  const subtotals = items.map((i) => ({
    ...i,
    subtotal: Math.round(i.weightKg * i.unitPriceKg),
  }));
  const totalAmount = subtotals.reduce((s, i) => s + i.subtotal, 0) + deliveryFee;
  const balanceDue = paymentType === "PREPAID" ? 0 : totalAmount;

  // Transaction atomique : créer commande + décrémenter stock
  const order = await prisma.$transaction(async (tx) => {
    // Vérifier + décrémenter stock pour chaque produit
    for (const item of items) {
      const product = await tx.arrivalProduct.findUnique({
        where: { id: item.arrivalProductId },
      });
      if (!product) throw new Error(`Produit ${item.arrivalProductId} introuvable`);
      if (Number(product.remainingWeightKg) < item.weightKg) {
        throw new Error(`Stock insuffisant pour ${product.name}`);
      }
      await tx.arrivalProduct.update({
        where: { id: item.arrivalProductId },
        data: { remainingWeightKg: Number(product.remainingWeightKg) - item.weightKg },
      });
    }

    return tx.order.create({
      data: {
        customerId,
        createdById: session.user.id,
        assignedToId,
        deliveryZoneId,
        deliveryFee,
        deliveryAddress,
        paymentType,
        totalAmount,
        balanceDue,
        notes,
        status: "PENDING",
        items: {
          create: subtotals.map((i) => ({
            arrivalProductId: i.arrivalProductId,
            weightKg: i.weightKg,
            unitPriceKg: i.unitPriceKg,
            subtotal: i.subtotal,
          })),
        },
      },
      include: {
        customer: { select: { name: true } },
        items: { include: { arrivalProduct: { select: { name: true } } } },
        deliveryZone: { select: { name: true } },
      },
    });
  });

  // Notifier magasinier via push + Socket.io
  try {
    await sendPushToRole("MAGASINIER", {
      title: "Nouvelle commande",
      body: `${order.customer.name} — ${order.items.map((i) => `${i.arrivalProduct.name} ${Number(i.weightKg)}kg`).join(", ")}`,
      url: `/magasinier/commandes/${order.id}`,
    });
    global.io?.emit("order:new", { orderId: order.id });
  } catch {}

  return NextResponse.json(order, { status: 201 });
}
