import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Rfc7807ExceptionFilter } from '../src/shared/filters/rfc7807.filter';
import { ValidationPipe } from '@nestjs/common';

let cachedApp: any;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule, {
      rawBody: true,
    });
    
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new Rfc7807ExceptionFilter());
    
    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }
  
  return cachedApp(req, res);
}
