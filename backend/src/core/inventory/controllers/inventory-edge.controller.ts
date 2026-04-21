import { Controller, Post, Body, Headers, UseGuards, Logger } from "@nestjs/common";
import { InventoryService } from "../inventory.service";

@Controller("v1/inventory/edge")
export class InventoryEdgeController {
  private readonly logger = new Logger(InventoryEdgeController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * High-Concurrency Scanning Entry Point.
   * Minimal overhead for mobile/industrial scanners.
   */
  @Post("scan")
  async processScan(
    @Headers("x-tenant-id") tenant_id: string,
    @Headers("x-user-id") user_id: string,
    @Body() payload: { barcode: string; location_id: string; delta: number; correlation_id?: string },
  ) {
    this.logger.log(`Edge Scan received for barcode ${payload.barcode}`);
    
    return this.inventoryService.processScan(
      tenant_id || "system",
      {
        barcode: payload.barcode,
        location_id: payload.location_id,
        delta: payload.delta,
      },
      user_id || "operational_scanner",
      payload.correlation_id,
    );
  }
}
