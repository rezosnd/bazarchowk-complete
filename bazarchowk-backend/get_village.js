const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const v = await prisma.village.findFirst();
  console.log("Village found:", v);
  
  if (!v) {
    console.log("No village found! Let's create one.");
    // We need a City first
    const c = await prisma.city.findFirst();
    if (!c) {
      // Create a country, state, district, city
      console.log("No city found either.");
    }
  }
}
main().finally(() => prisma.$disconnect());
