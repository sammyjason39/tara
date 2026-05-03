import { Controller, Get, Res, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { PrismaService } from "../persistence/prisma.service";

/**
 * Health Controller
 * Provides liveness and readiness probes for Docker/K8s
 */
@Controller('monitoring')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness probe
   */
  @Get("health")
  async getHealth(@Res() res: Response) {
    res.status(HttpStatus.OK).json({
      status: "up",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Readiness probe - checks DB connectivity
   */
  @Get("readiness")
  async getReadiness(@Res() res: Response) {
    try {
      // Simple query to check DB connection
      await this.prisma.$queryRaw`SELECT 1`;

      res.status(HttpStatus.OK).json({
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: "not_ready",
        database: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
