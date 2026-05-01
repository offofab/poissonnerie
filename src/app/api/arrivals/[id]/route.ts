import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

// GET /api/arrivals/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("ADMIN", "MAGASINIER");
  if (error) return error;

  const { id } = await params;
  const arrival = await prisma.arrival.findUnique({
    where: { id },
    include: {
      supplier: true,
      products: true,
    },
  });

  if (!arrival) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(arrival);
}

// PATCH /api/arrivals/[id] — ADMIN complète les prix, dépenses, statut
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const {
    status,
    expenses,
    notes,
    products, // [{ id, purchasePriceKg, baseSalePriceKg }]
  } = body as {
    status?: "DRAFT" | "OPEN" | "CLOSED";
    expenses?: number;
    notes?: string;
    products?: Array<{ id: string; purchasePriceKg: number; baseSalePriceKg: number }>;
  };

  // Mise à jour des produits (prix) en parallèle
  if (products?.length) {
    await Promise.all(
      products.map((p) =>
        prisma.arrivalProduct.update({
          where: { id: p.id },
          data: {
            purchasePriceKg: p.purchasePriceKg,
            baseSalePriceKg: p.baseSalePriceKg,
          },
        })
      )
    );
  }

  // Recalcul totalCost après mise à jour des produits
  const arrival = await prisma.arrival.findUnique({
    where: { id },
    include: { products: true },
  });

  if (!arrival) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const totalCost = arrival.products.reduce((sum, p) => {
    const price = p.purchasePriceKg ? Number(p.purchasePriceKg) : 0;
    return sum + price * Number(p.totalWeightKg);
  }, 0);

  const updated = await prisma.arrival.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(expenses !== undefined && { expenses }),
      ...(notes !== undefined && { notes }),
      totalCost: totalCost + (expenses ?? Number(arrival.expenses)),
    },
    include: {
      supplier: { select: { id: true, name: true } },
      products: true,
    },
  });

  return NextResponse.json(updated);
}
