import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getAppVersion } from './shared/app-version';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // CORS
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({ origin: origins, credentials: true });

  // Health check
  app.use((req: any, res: any, next: any) => {
    if (req.url === '/' || req.url === '/health' || req.url === '/status') {
      return res.status(200).json({
        status: 'ok',
        service: 'tara-backend',
        version: getAppVersion(),
        timestamp: new Date().toISOString(),
        status_page: '/status',
      });
    }
    next();
  });

  // API prefix
  app.setGlobalPrefix('v1');

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');

  console.log(`\n🏛  TARA Backend v2.0 running on http://localhost:${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Auth: POST /v1/auth/login`);
  console.log(`   Health: GET /health (internal)`);
  console.log(`   Status: GET /status · /v1/public/status\n`);
}

bootstrap();
