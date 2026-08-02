const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPanditCategory() {
  let category = await prisma.category.findFirst({
    where: { name: 'Pandits & Astrology' }
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Pandits & Astrology',
        description: 'Book pandits for pooja, havan, and astrology consultations',
        imageUrl: 'https://images.unsplash.com/photo-1604608683526-7788417539ed?q=80&w=200&auto=format&fit=crop',
        isActive: true,
      }
    });
    console.log('Category added:', category);
  } else {
    console.log('Category already exists:', category);
  }

  // Also add a subcategory "Pooja & Havan"
  let subcat = await prisma.subCategory.findFirst({
    where: { name: 'Pooja & Havan', categoryId: category.id }
  });

  if (!subcat) {
    subcat = await prisma.subCategory.create({
      data: {
        categoryId: category.id,
        name: 'Pooja & Havan',
        description: 'Vedic rituals at home',
        imageUrl: 'https://images.unsplash.com/photo-1604608683526-7788417539ed?q=80&w=200&auto=format&fit=crop',
        isActive: true,
      }
    });
    console.log('SubCategory added:', subcat);
  } else {
    console.log('SubCategory already exists:', subcat);
  }
}

addPanditCategory()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
