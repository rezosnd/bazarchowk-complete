const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.shop.findMany({ where: { partnerType: 'SALON' } })
  .then(s => console.log(JSON.stringify(s, null, 2)))
  .catch(console.error)
  .finally(() => p.$disconnect());
