const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { PrismaService } = require('./dist/persistence/prisma.service');
const fs = require('fs');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  fs.writeFileSync('all_models.txt', models.join('\n'));
  console.log('Total models:', models.length);

  await app.close();
}

bootstrap();
