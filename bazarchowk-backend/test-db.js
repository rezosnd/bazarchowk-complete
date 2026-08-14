const { PrismaClient } = require('@prisma/client');

// Extract the raw URL from the .env file (ignoring accelerate)
const dbUrl = "postgresql://neondb_owner:npg_hoflQtkED5G7@ep-shiny-tree-aiqbxk4a.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  const collections = await prisma.cashCollection.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("=== LATEST CASH COLLECTIONS ===");
  console.log(JSON.stringify(collections, null, 2));

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, orderNumber: true, paymentMethod: true, paymentStatus: true, status: true }
  });
  console.log("=== LATEST ORDERS ===");
  console.log(JSON.stringify(orders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
