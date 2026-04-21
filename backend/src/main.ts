import * as dotenv from "dotenv";

import path from "path";

// Load environment variables before anything else
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, HttpException } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

import { Rfc7807ExceptionFilter } from "./shared/filters/rfc7807.filter";
import { HttpLogInterceptor } from "./shared/logger/http-log.interceptor";
import { LoggerService } from "./shared/logger/logger.service";
import { DecimalSerializationInterceptor } from "./shared/interceptors/decimal.interceptor";

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
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe signature validation
  });

  const loggerService = app.get(LoggerService);
  
  // 1. Global Prefix
  app.setGlobalPrefix("v1");

  // 2. Enable Graceful Shutdown
  app.enableShutdownHooks();

  // 2. Global Interceptors
  app.useGlobalInterceptors(new HttpLogInterceptor(loggerService));
  app.useGlobalInterceptors(new DecimalSerializationInterceptor());

  // Global error logging for debugging
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
  });


  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
  });

  // 1. Resilience & Health Check Middleware (Run before prefix)
  app.use((req: any, res: any, next: any) => {
    // Health Check at root or /v1/health
    if (req.url === "/" || req.url === "/v1/health" || req.url === "/api/health") {
      return res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        service: "zenvix-backend",
        mode: process.env.PERSISTENCE_MODE || "mock",
        timestamp: new Date().toISOString(),
      });
    }

    // ALWAYS Log
    console.log(
      `[REQUEST] ${req.method} ${req.url} | Origin: ${req.headers.origin}`,
    );

    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.status(200).send();
    }

    next();
  });

  // 2. Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );

  // 3. Normal NestJS CORS (as a fallback)
  app.enableCors({
    origin: [
      "http://localhost:8081",
      "http://localhost:8080",
      "http://localhost:5173",
      "http://localhost:3000",
      "https://bambusilver.netlify.app",
      "https://zenvix-demo-vbeta0000001a.vercel.app",
      /\.railway\.app$/, // Allow all railway subdomains
    ],
    credentials: true,
  });



  // RFC 7807 Exception Filter
  app.useGlobalFilters(new Rfc7807ExceptionFilter());



  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      exceptionFactory: (errors) => {
        console.error("Validation Errors:", JSON.stringify(errors, null, 2));
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

  // Start server
  const port = parseInt(process.env.PORT || "3001", 10);
  await app.listen(port, "0.0.0.0");

  console.log("");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║                                                        ║");
  console.log(
    process.env.RUNTIME === "docker"
      ? "║   🚀 Zenvix Platform Backend - PRODUCTION_MODE        ║"
      : "║   🚀 Zenvix Platform Backend - DEV_MOCK_MODE          ║",
  );
  console.log("║                                                        ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  console.log(`║   Server running on: http://localhost:${port}           ║`);
  console.log(
    process.env.RUNTIME === "docker"
      ? "║   Mode: Production (PostgreSQL Persistence)            ║"
      : "║   Mode: Development (Mock Repositories)                ║",
  );
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
