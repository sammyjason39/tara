import { PrismaClient } from '@prisma/client';

const localUrl = "postgresql://zenvix:zenvix_secure_2026!@localhost:5432/zenvix_prod?schema=public";
const prodUrl = "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public";

async function run() {
  for (const [name, url] of [['LOCAL', localUrl], ['PRODUCTION', prodUrl]] as const) {
    console.log(`--- LOCATIONS IN ${name} ---`);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      const locations = await prisma.locations.findMany();
      for (const loc of locations) {
        console.log(`ID: ${loc.id} | Code: ${loc.code} | Name: ${loc.name} | Tenant: ${loc.tenant_id}`);
      }
    } catch (e) {
      console.error(`Error querying ${name}:`, e);
    } finally {
      await prisma.$disconnect();
    }
  }
}

run();
