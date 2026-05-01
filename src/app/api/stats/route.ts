import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const period = req.nextUrl.searchParams.get("period") ?? "today";

  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);

  if (period === "today") {
    start = new Date(now.setHours(0, 0, 0, 0));
    end = new Date();
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else {
    // week
    const day = now.getDay();
    start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  }

  const [orders, arrivals, customers] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      include: { items: true, collections: { where: { status: "VALIDATED" } } },
    }),
    prisma.arrival.findMany({
      where: { status: { in: ["OPEN", "CLOSED"] } },
      include: {
        supplier: { select: { name: true } },
        products: true,
        _count: { select: { products: true } },
      },
      orderBy: { arrivalDate: "desc" },
    }),
    prisma.customer.findMany({
      where: { balanceDue: { gt: 0 } },
      select: { id: true, name: true, phone: true, balanceDue: true },
      orderBy: { balanceDue: "desc" },
    }),
  ]);

  // KPIs période
  const ca = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const caValide = orders.reduce(
    (sum, o) => sum + o.collections.reduce((s, c) => s + Number(c.productAmount ?? 0) + Number(c.deliveryAmount ?? 0), 0),
    0
  );
  const creancesTotal = Number((await prisma.customer.aggregate({ _sum: { balanceDue: true } }))._sum.balanceDue ?? 0);
  const commandeCount = orders.length;
  const commandesParStatut = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  // Bénéfice par arrivage
  const arrivageStats = arrivals.map((a) => {
    const totalAchat = a.products.reduce((sum, p) => {
      const price = p.purchasePriceKg ? Number(p.purchasePriceKg) : 0;
      return sum + price * Number(p.totalWeightKg);
    }, 0);
    const totalVentes = orders
      .flatMap((o) => o.items)
      .filter((item) => a.products.some((p) => p.id === item.arrivalProductId))
      .reduce((sum, item) => sum + Number(item.subtotal), 0);
    const coutTotal = totalAchat + Number(a.expenses);
    const benefice = totalVentes - coutTotal;
    const vendu = a.products.reduce(
      (sum, p) => sum + (Number(p.totalWeightKg) - Number(p.remainingWeightKg)),
      0
    );
    const restant = a.products.reduce((sum, p) => sum + Number(p.remainingWeightKg), 0);

    return {
      id: a.id,
      supplier: a.supplier.name,
      arrivalDate: a.arrivalDate.toISOString(),
      status: a.status,
      totalAchat: Math.round(totalAchat),
      expenses: Math.round(Number(a.expenses)),
      coutTotal: Math.round(coutTotal),
      totalVentes: Math.round(totalVentes),
      benefice: Math.round(benefice),
      kgVendu: Math.round(vendu * 10) / 10,
      kgRestant: Math.round(restant * 10) / 10,
      products: a.products.map((p) => ({
        name: p.name,
        format: p.format,
        totalWeightKg: Number(p.totalWeightKg),
        remainingWeightKg: Number(p.remainingWeightKg),
        purchasePriceKg: p.purchasePriceKg ? Number(p.purchasePriceKg) : null,
        baseSalePriceKg: p.baseSalePriceKg ? Number(p.baseSalePriceKg) : null,
      })),
    };
  });

  // Récap mensuel — 6 derniers mois
  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      return prisma.order.aggregate({
        where: { createdAt: { gte: mStart, lte: mEnd }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }).then((r) => ({
        month: mStart.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        ca: Math.round(Number(r._sum.totalAmount ?? 0)),
        count: r._count.id,
      }));
    })
  );

  return NextResponse.json({
    period,
    kpis: {
      ca: Math.round(ca),
      caValide: Math.round(caValide),
      creancesTotal: Math.round(creancesTotal),
      commandeCount,
      commandesParStatut,
    },
    arrivageStats,
    monthlyData: monthlyData.reverse(),
    topDebiteurs: customers.slice(0, 10).map((c) => ({
      ...c,
      balanceDue: Number(c.balanceDue),
    })),
  });
}
