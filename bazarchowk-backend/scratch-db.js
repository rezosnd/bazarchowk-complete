const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const collections = await prisma.cashCollection.findMany({
    include: { order: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Cash Collections:', JSON.stringify(collections, null, 2));

  const orders = await prisma.order.findMany({
    where: { paymentMethod: 'COD', status: 'DELIVERED', riderId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('COD Delivered Orders:', JSON.stringify(orders, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
