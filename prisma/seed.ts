import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Démarrage du seed...");

  // Admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "fab@poissonnerie.ci" },
    update: {},
    create: {
      email: "fab@poissonnerie.ci",
      password: adminPassword,
      fullName: "Fab",
      role: "ADMIN",
      phone: "+2250700000000",
    },
  });
  console.log("✅ Admin créé :", admin.email);

  // Zones de livraison Abidjan — recréées proprement
  await prisma.deliveryZone.deleteMany({});
  await prisma.deliveryZone.createMany({
    data: [
      { name: "Cocody", fee: 2000 },
      { name: "Plateau", fee: 1500 },
      { name: "Yopougon", fee: 3000 },
      { name: "Marcory", fee: 2000 },
      { name: "Treichville", fee: 1500 },
      { name: "Abobo", fee: 3500 },
      { name: "Adjamé", fee: 2500 },
      { name: "Koumassi", fee: 2500 },
      { name: "Port-Bouët", fee: 3000 },
      { name: "Bingerville", fee: 4000 },
    ],
  });
  console.log("✅ 10 zones de livraison créées");

  // Fournisseur exemple
  const existing = await prisma.supplier.findFirst({ where: { name: "RICHARD" } });
  if (!existing) {
    await prisma.supplier.create({
      data: { name: "RICHARD", phone: "+2250700000001" },
    });
    console.log("✅ Fournisseur exemple créé : RICHARD");
  }

  console.log("🎉 Seed terminé !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
