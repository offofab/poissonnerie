import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const period = req.nextUrl.searchParams.get("period") ?? "today";

  const now = new Date();
  let start: Date;
  let end: Date = new Date();
  let prevStart: Date;
  let prevEnd: Date;

  if (period === "today") {
    start = new Date(); start.setHours(0, 0, 0, 0);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(start); prevEnd.setMilliseconds(-1);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else {
    // week
    const day = now.getDay();
    start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(start); prevEnd.setMilliseconds(-1);
  }

  const [orders, prevOrders, arrivals, customers, allOrdersWithItems, zones] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      include: {
        items: { include: { arrivalProduct: { include: { category: true } } } },
        collections: { where: { status: "VALIDATED" } },
        deliveryZone: { select: { name: true } },
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: prevStart, lte: prevEnd }, status: { not: "CANCELLED" } },
      select: { totalAmount: true },
    }),
    prisma.arrival.findMany({
      where: { status: { in: ["OPEN", "CLOSED"] } },
      include: {
        supplier: { select: { name: true } },
        products: { include: { category: true } },
      },
      orderBy: { arrivalDate: "desc" },
    }),
    prisma.customer.findMany({
      where: { balanceDue: { gt: 0 } },
      select: { id: true, name: true, phone: true, balanceDue: true },
      orderBy: { balanceDue: "desc" },
    }),
    // Pour daily series — 30 derniers jours
    prisma.order.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        status: { not: "CANCELLED" },
      },
      select: { createdAt: true, totalAmount: true },
    }),
    prisma.deliveryZone.findMany({ select: { id: true, name: true } }),
  ]);

  // === KPIs période ===
  const ca = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const caPrev = prevOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const evolutionCA = caPrev > 0 ? ((ca - caPrev) / caPrev) * 100 : null;

  const caValide = orders.reduce(
    (sum, o) => sum + o.collections.reduce((s, c) => s + Number(c.productAmount ?? 0) + Number(c.deliveryAmount ?? 0), 0),
    0
  );
  const tauxRecouvrement = ca > 0 ? (caValide / ca) * 100 : 0;

  const creancesTotal = Number((await prisma.customer.aggregate({ _sum: { balanceDue: true } }))._sum.balanceDue ?? 0);
  const commandeCount = orders.length;
  const ticketMoyen = commandeCount > 0 ? ca / commandeCount : 0;
  const commandesParStatut = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  // === Bénéfice par arrivage ===
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

  // === Récap mensuel — 6 derniers mois ===
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

  // === Daily series — 30 derniers jours ===
  const dailyMap = new Map<string, { ca: number; count: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { ca: 0, count: 0 });
  }
  for (const o of allOrdersWithItems) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      const cur = dailyMap.get(key)!;
      cur.ca += Number(o.totalAmount);
      cur.count += 1;
    }
  }
  const dailySeries = Array.from(dailyMap.entries())
    .map(([date, v]) => ({
      date,
      label: new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      ca: Math.round(v.ca),
      count: v.count,
    }))
    .reverse();

  // === CA par zone ===
  const zoneMap = new Map<string, number>();
  for (const o of orders) {
    const name = o.deliveryZone?.name ?? "Sans zone";
    zoneMap.set(name, (zoneMap.get(name) ?? 0) + Number(o.totalAmount));
  }
  const caByZone = Array.from(zoneMap.entries())
    .map(([name, ca]) => ({ name, ca: Math.round(ca) }))
    .sort((a, b) => b.ca - a.ca);

  // === CA par catégorie ===
  const catMap = new Map<string, { ca: number; emoji: string | null }>();
  for (const o of orders) {
    for (const item of o.items) {
      const catName = item.arrivalProduct.category?.name ?? item.arrivalProduct.name;
      const emoji = item.arrivalProduct.category?.emoji ?? null;
      const cur = catMap.get(catName) ?? { ca: 0, emoji };
      cur.ca += Number(item.subtotal);
      catMap.set(catName, cur);
    }
  }
  const caByCategory = Array.from(catMap.entries())
    .map(([name, v]) => ({ name, ca: Math.round(v.ca), emoji: v.emoji }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 8);

  // === CA par client ===
  const clientMap = new Map<string, { ca: number; count: number; id: string }>();
  for (const o of orders) {
    const id = o.customer.id;
    const name = o.customer.name;
    const cur = clientMap.get(name) ?? { ca: 0, count: 0, id };
    cur.ca += Number(o.totalAmount);
    cur.count += 1;
    clientMap.set(name, cur);
  }
  const caByClient = Array.from(clientMap.entries())
    .map(([name, v]) => ({ name, ca: Math.round(v.ca), count: v.count, id: v.id }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 10);

  // === Top produits (kg vendus) ===
  const productMap = new Map<string, { kg: number; ca: number; emoji: string | null }>();
  for (const o of orders) {
    for (const item of o.items) {
      const key = item.arrivalProduct.category?.name ?? item.arrivalProduct.name;
      const emoji = item.arrivalProduct.category?.emoji ?? null;
      const cur = productMap.get(key) ?? { kg: 0, ca: 0, emoji };
      cur.kg += Number(item.weightKg);
      cur.ca += Number(item.subtotal);
      productMap.set(key, cur);
    }
  }
  const topProducts = Array.from(productMap.entries())
    .map(([name, v]) => ({ name, kg: Math.round(v.kg * 10) / 10, ca: Math.round(v.ca), emoji: v.emoji }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 8);

  // === Stock par catégorie (vue inventaire) ===
  const stockByCategoryMap = new Map<string, { remaining: number; total: number; emoji: string | null }>();
  for (const a of arrivals) {
    if (a.status !== "OPEN") continue;
    for (const p of a.products) {
      const key = p.category?.name ?? p.name;
      const emoji = p.category?.emoji ?? null;
      const cur = stockByCategoryMap.get(key) ?? { remaining: 0, total: 0, emoji };
      cur.remaining += Number(p.remainingWeightKg);
      cur.total += Number(p.totalWeightKg);
      stockByCategoryMap.set(key, cur);
    }
  }
  const stockByCategory = Array.from(stockByCategoryMap.entries())
    .map(([name, v]) => ({
      name,
      emoji: v.emoji,
      remainingKg: Math.round(v.remaining * 10) / 10,
      totalKg: Math.round(v.total * 10) / 10,
    }))
    .sort((a, b) => b.remainingKg - a.remainingKg);

  return NextResponse.json({
    period,
    kpis: {
      ca: Math.round(ca),
      caValide: Math.round(caValide),
      creancesTotal: Math.round(creancesTotal),
      commandeCount,
      commandesParStatut,
      evolutionCA,
      tauxRecouvrement: Math.round(tauxRecouvrement),
      ticketMoyen: Math.round(ticketMoyen),
    },
    arrivageStats,
    monthlyData: monthlyData.reverse(),
    dailySeries,
    caByZone,
    caByCategory,
    caByClient,
    topProducts,
    stockByCategory,
    topDebiteurs: customers.slice(0, 10).map((c) => ({
      ...c,
      balanceDue: Number(c.balanceDue),
    })),
    zonesCount: zones.length,
  });
}
