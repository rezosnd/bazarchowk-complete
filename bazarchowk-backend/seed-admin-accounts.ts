import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createOrUpdateAdminUser(email: string, firstName: string, lastName: string, roleName: string) {
  let role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Role ${roleName} not found! Run seed-admin-roles.ts first.`);
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: role.id,
      },
    });
    console.log(`Created user ${email} with role ${roleName}`);
  } else {
    user = await prisma.user.update({
      where: { email },
      data: { roleId: role.id }
    });
    console.log(`Updated user ${email} to role ${roleName}`);
  }

  return user;
}

async function main() {
  console.log('Seeding Master Admin Accounts...');

  // 1. Super Admin
  const superAdminUser = await createOrUpdateAdminUser('superadmin@bazarchowk.com', 'Super', 'Admin', 'SUPER_ADMIN');

  // 2. District Admin (Bihar Example)
  const districtAdminUser = await createOrUpdateAdminUser('bihar.district@bazarchowk.com', 'Bihar', 'District Admin', 'DISTRICT_ADMIN');
  
  let districtAdmin = await prisma.districtAdmin.findUnique({ where: { userId: districtAdminUser.id } });
  if (!districtAdmin) {
    districtAdmin = await prisma.districtAdmin.create({
      data: {
        userId: districtAdminUser.id,
        districtName: 'Darbhanga District',
        state: 'Bihar'
      }
    });
  }

  // 3. Market Admins
  const markets = [
    { email: 'bhagalpur@bazarchowk.com', first: 'Bhagalpur', last: 'Admin', marketName: 'Bhagalpur Market', coverage: 'Bhagalpur City' },
    { email: 'darbhanga@bazarchowk.com', first: 'Darbhanga', last: 'Admin', marketName: 'Darbhanga Market', coverage: 'Darbhanga City' },
    { email: 'vaishali@bazarchowk.com', first: 'Vaishali', last: 'Admin', marketName: 'Vaishali Market', coverage: 'Vaishali City' },
  ];

  for (const m of markets) {
    const user = await createOrUpdateAdminUser(m.email, m.first, m.last, 'MARKET_ADMIN');
    
    let marketAdmin = await prisma.marketAdmin.findUnique({ where: { userId: user.id } });
    if (!marketAdmin) {
      marketAdmin = await prisma.marketAdmin.create({
        data: {
          userId: user.id,
          districtAdminId: districtAdmin.id,
          marketName: m.marketName,
          coverageArea: m.coverage
        }
      });
      console.log(`Created MarketAdmin profile for ${m.marketName}`);
    }
  }

  console.log('✅ All Admin accounts and profiles created successfully!');
  console.log('Default Password for all: password123');
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
