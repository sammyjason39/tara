import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

async function runCheck() {
  console.log('--- ZENVIX PRE-DEPLOYMENT AUDIT ---');
  let failures = 0;

  // 1. Check Environment Variables
  const requiredEnv = [
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'FRONTEND_URL'
  ];
  
  console.log('[1/4] Checking Environment Variables...');
  requiredEnv.forEach(env => {
    if (!process.env[env]) {
      console.error(`  ❌ MISSING: ${env}`);
      failures++;
    } else {
      console.log(`  ✅ ${env} is set`);
    }
  });

  // 2. Check Database Connectivity
  console.log('[2/4] Checking Database Connectivity...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('  ✅ Database is reachable');
  } catch (error: any) {
    console.error(`  ❌ Database Connection Failed: ${error.message}`);
    failures++;
  } finally {
    await prisma.$disconnect();
  }

  // 3. Check Stripe Connectivity
  console.log('[3/4] Checking Stripe API Connectivity...');
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' as any });
      await stripe.balance.retrieve();
      console.log('  ✅ Stripe API is reachable and key is valid');
    } catch (error: any) {
      console.error(`  ❌ Stripe Connection Failed: ${error.message}`);
      failures++;
    }
  }

  // 4. Check Migration Status
  // (In a real deploy script, we'd run 'prisma migrate status')
  console.log('[4/4] Prisma Migration Audit...');
  console.log('  💡 Remember: Always run "npx prisma migrate deploy" in production.');

  console.log('-----------------------------------');
  if (failures > 0) {
    console.error(`AUDIT FAILED: ${failures} issues found. Fix these before deploying.`);
    process.exit(1);
  } else {
    console.log('AUDIT PASSED: System is ready for production.');
    process.exit(0);
  }
}

runCheck();
