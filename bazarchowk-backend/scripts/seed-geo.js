const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial geospatial data...');

  // 1. Country
  const country = await prisma.country.upsert({
    where: { code: 'IN' },
    update: {},
    create: {
      name: 'India',
      code: 'IN',
    },
  });
  console.log('Country:', country.name);

  // 2. State
  const state = await prisma.state.upsert({
    where: { countryId_name: { countryId: country.id, name: 'Bihar' } },
    update: {},
    create: {
      countryId: country.id,
      name: 'Bihar',
      code: 'BR',
    },
  });
  console.log('State:', state.name);

  // 3. District
  const district = await prisma.district.upsert({
    where: { stateId_name: { stateId: state.id, name: 'Vaishali' } },
    update: {},
    create: {
      stateId: state.id,
      name: 'Vaishali',
    },
  });
  console.log('District:', district.name);

  // 4. City
  const city = await prisma.city.upsert({
    where: { districtId_name: { districtId: district.id, name: 'Desari' } },
    update: {},
    create: {
      districtId: district.id,
      name: 'Desari',
      pincode: '844504',
    },
  });
  console.log('City:', city.name);

  // 5. Village (The Zone)
  const village = await prisma.village.upsert({
    where: { cityId_name: { cityId: city.id, name: 'Desari Main' } },
    update: {},
    create: {
      cityId: city.id,
      name: 'Desari Main',
      pincode: '844504',
      latitude: 25.6416,
      longitude: 85.3400,
    },
  });
  console.log('\n=======================================');
  console.log('✅ SEED SUCCESSFUL!');
  console.log('Use this exact Village ID to create your Market:');
  console.log(village.id);
  console.log('=======================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
