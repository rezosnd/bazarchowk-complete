const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const defaultRoles = [
    'CUSTOMER',
    'SHOP_OWNER',
    'SHOP_STAFF',
    'DELIVERY_PARTNER',
    'FARMER',
    'RECRUITER',
    'SUPPORT_AGENT',
    'MARKET_ADMIN',
    'DISTRICT_ADMIN',
    'ADMIN',
    'SUPER_ADMIN'
  ];

  for (const roleName of defaultRoles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    console.log('Seeded role:', roleName);
  }
}
main().catch(console.error);
