import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET() {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true, balanceDue: true, isVip: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { name, phone, address } = await req.json() as {
    name: string; phone?: string; address?: string;
  };
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const customer = await prisma.customer.create({ data: { name, phone, address } });
  return NextResponse.json(customer, { status: 201 });
}
