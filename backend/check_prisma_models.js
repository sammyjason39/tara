const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { PrismaService } = require('./dist/persistence/prisma.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('Checking audit_chain_repairs model on prisma client...');
  console.log('Models available:', Object.keys(prisma).filter(k => !k.startsWith('_')));
  console.log('audit_chain_repairs:', prisma.audit_chain_repairs ? 'EXISTS' : 'MISSING');

  await app.close();
}

bootstrap();
