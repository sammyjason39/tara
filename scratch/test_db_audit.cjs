const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://zenvix:zenvix_secure_2026!@150.109.15.108:5433/zenvix_prod?schema=public"
    }
  }
});

async function main() {
  console.log('Connecting to database and querying audit_hash_anchors...');
  const anchor = await prisma.audit_hash_anchors.findFirst();
  console.log('Sample Anchor:', anchor);
  if (anchor) {
    console.log('Keys:', Object.keys(anchor));
    console.log('anchored_at type:', typeof anchor.anchored_at, anchor.anchored_at);
    console.log('anchoredAt type:', typeof anchor.anchoredAt, anchor.anchoredAt);
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
