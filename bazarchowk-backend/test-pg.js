const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://neondb_owner:npg_hoflQtkED5G7@ep-shiny-tree-aiqbxk4a.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require" } } });

async function main() {
  const shops = await prisma.shop.findMany({
    where: {
      isVerified: true,
      isActive: true,
      partnerType: 'SALON',
      OR: [
        { hasServices: true },
        { partnerType: { in: ['SALON', 'PLUMBER', 'ELECTRICIAN', 'HOME_CLEANING'] } }
      ]
    }
  });
  console.log(shops);
}
main().catch(console.error);
main().catch(console.error);
