import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

// GET /api/categories — liste catégories + stock total agrégé
export async function GET() {
  const { error } = await requireRole("ADMIN", "MAGASINIER", "LIVREUR");
  if (error) return error;

  const categories = await prisma.productCategory.findMany({
    include: {
      products: {
        where: { arrival: { status: "OPEN" } },
        select: {
          remainingWeightKg: true,
          totalWeightKg: true,
          arrival: { select: { supplier: { select: { name: true } } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = categories.map((c) => {
    const totalRemaining = c.products.reduce(
      (s, p) => s + Number(p.remainingWeightKg),
      0
    );
    const totalWeight = c.products.reduce(
      (s, p) => s + Number(p.totalWeightKg),
      0
    );
    const supplierNames = Array.from(
      new Set(c.products.map((p) => p.arrival.supplier.name))
    );
    return {
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      totalRemainingKg: Math.round(totalRemaining * 10) / 10,
      totalWeightKg: Math.round(totalWeight * 10) / 10,
      productLines: c.products.length,
      suppliers: supplierNames,
    };
  });

  return NextResponse.json(result);
}

// POST /api/categories — créer une catégorie (ADMIN uniquement)
export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const body = await req.json();
  const { name, emoji } = body as { name: string; emoji?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  try {
    const category = await prisma.productCategory.create({
      data: {
        name: name.trim(),
        emoji: emoji?.trim() || null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Cette catégorie existe déjà" },
      { status: 409 }
    );
  }
}
