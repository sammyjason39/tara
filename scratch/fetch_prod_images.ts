import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prodUrl = "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prodUrl,
    },
  },
});

async function main() {
  console.log("Connecting to production DB...");
  const items = await prisma.item_masters.findMany({
    where: {
      tenant_id: 'tnt-3rlhko',
      status: 'active'
    },
    select: {
      sku: true,
      image_url: true,
      item_images: {
        select: {
          url: true
        }
      }
    }
  });

  console.log(`Found ${items.length} active items.`);
  
  let hasImageUrlCount = 0;
  let hasItemImagesCount = 0;
  let hasEitherCount = 0;

  const skuImageMap: Record<string, { has_picture: boolean; image_url: string | null; image_urls: string[] }> = {};

  for (const item of items) {
    const hasUrl = !!item.image_url && item.image_url.trim() !== "";
    const hasImagesRelation = item.item_images.length > 0;
    
    if (hasUrl) hasImageUrlCount++;
    if (hasImagesRelation) hasItemImagesCount++;
    if (hasUrl || hasImagesRelation) hasEitherCount++;

    skuImageMap[item.sku.trim()] = {
      has_picture: hasUrl || hasImagesRelation,
      image_url: item.image_url,
      image_urls: item.item_images.map(img => img.url)
    };
  }

  console.log(`Summary of items with images:`);
  console.log(`- Has image_url: ${hasImageUrlCount}`);
  console.log(`- Has related item_images: ${hasItemImagesCount}`);
  console.log(`- Has either: ${hasEitherCount}`);

  // Write mapping to JSON
  const outputPath = path.join('scratch', 'item_images_map.json');
  fs.writeFileSync(outputPath, JSON.stringify(skuImageMap, null, 2), 'utf-8');
  console.log(`Saved mapping to ${outputPath}`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
