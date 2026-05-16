const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { PrismaService } = require('./dist/persistence/prisma.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const locations = await prisma.locations.findMany({
    where: {
      name: {
        contains: 'Double Six',
        mode: 'insensitive'
      }
    },
    select: { id: true, name: true, tenant_id: true }
  });

  console.log('Locations matching "Double Six":');
  console.log(JSON.stringify(locations, null, 2));

  await app.close();
}

bootstrap();
