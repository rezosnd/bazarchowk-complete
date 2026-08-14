require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.shop.updateMany({ data: { isVerified: true, isActive: true, isOpen: true } })
  .then(res => console.log('Updated shops:', res))
  .catch(console.error)
  .finally(() => p.$disconnect());
