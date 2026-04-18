import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PricingEngineService } from './pricing-engine.service';
import { PricingQuoteDto } from './dto/pricing-quote.dto';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingEngine: PricingEngineService) {}

  @Get('quote')
  async getQuote(
    @Query('tenant_id') tenant_id: string,
    @Query('skuId') skuId: string,
    @Query('location_id') location_id: string,
  ): Promise<PricingQuoteDto> {
    // In a real scenario, tenant_id would be extracted from the request header via a guard
    return this.pricingEngine.getQuote(tenant_id, skuId, location_id);
  }
}
