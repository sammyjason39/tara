import { NestFactory } from "@nestjs/core";
import { ValidationPipe, HttpException } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

import { Rfc7807ExceptionFilter } from "./shared/filters/rfc7807.filter";

/**
 * Bootstrap the Zenvix Backend Application
 *
 * Configuration:
 * - RFC 7807 Standardized Error Responses
 * - Global ValidationPipe with whitelist and transform enabled
 * - CORS enabled for frontend communication
 * - Port 3001 (to avoid conflict with Vite dev server)
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Align with frontend proxy (/api/*)
  app.setGlobalPrefix("api");

  // RFC 7807 Exception Filter
  app.useGlobalFilters(new Rfc7807ExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        return new HttpException(
          {
            message: "Validation failed",
            errors: errors.map((err) => ({
              property: err.property,
              constraints: err.constraints,
            })),
          },
          400,
        );
      },
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS for frontend
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:5173",
        "http://localhost:3000",
      ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Start server
  const port = parseInt(process.env.PORT || "3001", 10);
  await app.listen(port, "0.0.0.0");

  console.log("");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║                                                        ║");
  console.log("║   🚀 Zenvix Platform Backend - DEV_MOCK_MODE          ║");
  console.log("║                                                        ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log(`║   Server running on: http://localhost:${port}           ║`);
  console.log("║   Mode: Development (Mock Repositories)                ║");
  console.log("║   Multi-Tenancy: ENABLED (x-tenant-id required)        ║");
  console.log("║                                                        ║");
  console.log("║   Available Endpoints:                                 ║");
  console.log("║   • GET  /finance/ledger                               ║");
  console.log("║   • POST /finance/transactions                         ║");
  console.log("║   • GET  /finance/balance                              ║");
  console.log("║   • GET  /finance/transactions/:id                     ║");
  console.log("║                                                        ║");
  console.log("║   Test Tenants:                                        ║");
  console.log("║   • tenant-001 (Tech Startup)                          ║");
  console.log("║   • tenant-002 (Retail Chain)                          ║");
  console.log("║                                                        ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log("");
}

bootstrap();
