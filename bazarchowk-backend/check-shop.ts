import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'rehansuman41002@gmail.com';

  const user = await prisma.user.findUnique({ 
    where: { email },
    include: { shops: true } 
  });
  
  if (!user) {
    console.log(`User with email ${email} not found.`);
    return;
  }

  console.log(`User found: ${user.id}, Role: ${user.roleId}`);
  if (user.shops.length === 0) {
    console.log('No shops found for this user.');
  } else {
    for (const shop of user.shops) {
      console.log(`Shop: ${shop.name}`);
      console.log(`  ID: ${shop.id}`);
      console.log(`  isVerified: ${shop.isVerified}`);
      console.log(`  isActive: ${shop.isActive}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
