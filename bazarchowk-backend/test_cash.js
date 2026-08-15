const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.cashCollection.findMany({ include: { order: true } });
  console.log("Cash Collections:", JSON.stringify(c, null, 2));
  const d = await prisma.riderDeposit.findMany();
  console.log("Rider Deposits:", JSON.stringify(d, null, 2));
}

main().finally(() => prisma.$disconnect());
