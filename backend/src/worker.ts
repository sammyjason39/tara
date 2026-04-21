import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Set flag to ensure we are in worker mode
  process.env.IS_WORKER = 'true';
  
  // The ScheduleModule is already conditionally loaded in AppModule.
  // In a worker process, we WANT it to run, while the API process in Vercel skips it.
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('--- ZENVIX BACKGROUND WORKER STARTED ---');
  console.log('Mode: Job Execution Only');
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Worker shutting down...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
