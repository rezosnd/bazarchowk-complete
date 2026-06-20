const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const emailQuery = 'rehan';
  let adminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  
  if (!adminRole) {
    console.log('No SUPER_ADMIN role found.');
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: { contains: emailQuery } },
    include: { role: true }
  });

  if (!user) {
    console.log('User not found.');
    return;
  }

  console.log(`Found user: ${user.email} with current role: ${user.role?.name}`);

  await prisma.user.update({
    where: { id: user.id },
    data: { roleId: adminRole.id }
  });

  console.log(`Successfully promoted ${user.email} to SUPER_ADMIN!`);
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
