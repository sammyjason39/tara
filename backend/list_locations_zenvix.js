const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { PrismaService } = require('./dist/persistence/prisma.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const locations = await prisma.locations.findMany({
    where: {
      tenant_id: 'zenvix-tenant'
    },
    select: { id: true, name: true }
  });

  console.log('Locations for zenvix-tenant:');
  console.log(JSON.stringify(locations, null, 2));

  await app.close();
}

bootstrap();
