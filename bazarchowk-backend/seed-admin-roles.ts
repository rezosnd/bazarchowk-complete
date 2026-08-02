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
  console.log('Seeding roles and permissions based on Master Architecture Document...');

  const marketAdminPermissions = [
    'APPROVE_SHOP',
    'APPROVE_SCHOOL',
    'APPROVE_HOSPITAL',
    'APPROVE_ADVERTISEMENT',
    'MANAGE_RIDERS',
    'VERIFY_CASH_DEPOSITS',
    'VIEW_MARKET_REVENUE',
    'MANAGE_MARKET'
  ];

  const districtAdminPermissions = [
    'MANAGE_MULTIPLE_MARKETS',
    'VIEW_DISTRICT_REVENUE',
    'APPROVE_LARGE_CAMPAIGNS',
    'MANAGE_SETTLEMENTS',
    'VIEW_REPORTS',
    'VIEW_ANALYTICS'
  ];

  const superAdminPermissions = [
    'MANAGE_ALL_CITIES',
    'MANAGE_ALL_DISTRICTS',
    'MANAGE_ALL_MARKETS',
    'MANAGE_ALL_SHOPS',
    'MANAGE_ALL_SCHOOLS',
    'MANAGE_ALL_HOSPITALS',
    'VIEW_ALL_ORDERS',
    'MANAGE_ALL_RIDERS',
    'VIEW_ALL_REVENUE',
    'MANAGE_ALL_SETTLEMENTS',
    'MANAGE_ALL_ADVERTISEMENTS',
    'VIEW_ALL_ANALYTICS'
  ];

  // Helper function to create permissions
  const ensurePermissions = async (perms: string[]) => {
    const createdIds: string[] = [];
    for (const p of perms) {
      let perm = await prisma.permission.findUnique({ where: { action: p } });
      if (!perm) {
        perm = await prisma.permission.create({
          data: { action: p, description: `Allows ${p.toLowerCase().replace(/_/g, ' ')}` }
        });
      }
      createdIds.push(perm.id);
    }
    return createdIds;
  };

  // Ensure all permissions exist
  console.log('Upserting permissions...');
  const marketPermIds = await ensurePermissions(marketAdminPermissions);
  const districtPermIds = await ensurePermissions(districtAdminPermissions);
  const superPermIds = await ensurePermissions(superAdminPermissions);

  // Helper function to upsert role with permissions
  const upsertRole = async (roleName: string, permIds: string[]) => {
    let role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: roleName }
      });
    }

    // Link permissions
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: permIds.map(id => ({ id })) // Overwrite with exact permissions
        }
      }
    });
    console.log(`Updated role ${roleName} with ${permIds.length} permissions.`);
  };

  console.log('Upserting roles and mapping permissions...');
  
  // Market Admin gets Market Admin permissions
  await upsertRole('MARKET_ADMIN', marketPermIds);
  
  // District Admin gets District + Market Admin permissions
  await upsertRole('DISTRICT_ADMIN', [...marketPermIds, ...districtPermIds]);
  
  // Super Admin gets Super + District + Market Admin permissions
  await upsertRole('SUPER_ADMIN', [...marketPermIds, ...districtPermIds, ...superPermIds]);

  console.log('✅ Seeding complete!');
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
