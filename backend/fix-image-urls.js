const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUrls() {
  try {
    console.log('--- Starting URL Fix ---');
    
    // Fix item_masters
    const items = await prisma.item_masters.findMany({
      where: { 
        image_url: { 
          contains: '/v1/inventory/images/inventory/images/' 
        } 
      }
    });
    
    console.log(`Found ${items.length} items with broken image_url`);
    for (const item of items) {
      const fixedUrl = item.image_url.replace('/v1/inventory/images/inventory/images/', '/v1/inventory/images/');
      await prisma.item_masters.update({
        where: { id: item.id },
        data: { image_url: fixedUrl }
      });
    }

    // Fix item_images
    const images = await prisma.item_images.findMany({
      where: { 
        url: { 
          contains: '/v1/inventory/images/inventory/images/' 
        } 
      }
    });
    
    console.log(`Found ${images.length} item_images with broken url`);
    for (const img of images) {
      const fixedUrl = img.url.replace('/v1/inventory/images/inventory/images/', '/v1/inventory/images/');
      await prisma.item_images.update({
        where: { id: img.id },
        data: { url: fixedUrl }
      });
    }
    
    console.log('--- URL Fix Completed ---');
  } catch (err) {
    console.error('Fix failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixUrls();
