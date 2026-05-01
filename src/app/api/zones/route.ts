import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET() {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const zones = await prisma.deliveryZone.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(zones);
}
