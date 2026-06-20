const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deliveries = await prisma.delivery.findMany({ include: { order: true } });
  console.log("=== DELIVERIES ===");
  console.log(JSON.stringify(deliveries, null, 2));

  const partners = await prisma.deliveryPartner.findMany();
  console.log("=== DELIVERY PARTNERS ===");
  console.log(JSON.stringify(partners, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
