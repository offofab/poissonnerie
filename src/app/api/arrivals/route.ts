import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

// GET /api/arrivals — liste arrivages (OPEN par défaut, ou ?status=ALL)
export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "MAGASINIER");
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status");

  const arrivals = await prisma.arrival.findMany({
    where: status === "ALL" ? {} : { status: "OPEN" },
    include: {
      supplier: { select: { id: true, name: true } },
      products: {
        select: {
          id: true,
          name: true,
          format: true,
          totalWeightKg: true,
          remainingWeightKg: true,
          purchasePriceKg: true,
          baseSalePriceKg: true,
        },
      },
    },
    orderBy: { arrivalDate: "desc" },
  });

  return NextResponse.json(arrivals);
}

// POST /api/arrivals — créer un arrivage (MAGASINIER ou ADMIN)
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole("ADMIN", "MAGASINIER");
  if (error || !session) return error;

  const body = await req.json();
  const { supplierId, arrivalDate, notes, products, expenses, status } = body as {
    supplierId: string;
    arrivalDate: string;
    notes?: string;
    expenses?: number;
    status?: "DRAFT" | "OPEN";
    products: Array<{
      name: string;
      format?: string;
      categoryId?: string;
      totalWeightKg: number;
      purchasePriceKg?: number;
      baseSalePriceKg?: number;
    }>;
  };

  if (!supplierId || !arrivalDate || !products?.length) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const finalStatus = isAdmin && status === "OPEN" ? "OPEN" : "DRAFT";

  const arrival = await prisma.arrival.create({
    data: {
      supplierId,
      arrivalDate: new Date(arrivalDate),
      notes,
      expenses: isAdmin && expenses ? expenses : 0,
      status: finalStatus,
      products: {
        create: products.map((p) => ({
          name: p.name,
          format: p.format,
          categoryId: p.categoryId,
          totalWeightKg: p.totalWeightKg,
          remainingWeightKg: p.totalWeightKg,
          purchasePriceKg: isAdmin ? p.purchasePriceKg : undefined,
          baseSalePriceKg: isAdmin ? p.baseSalePriceKg : undefined,
        })),
      },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      products: true,
    },
  });

  return NextResponse.json(arrival, { status: 201 });
}
