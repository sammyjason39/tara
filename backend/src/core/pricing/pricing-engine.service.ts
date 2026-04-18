import { Injectable, Logger, Inject } from '@nestjs/common';
import { IPricingRepository } from './repositories/interfaces/pricing.repository.interface';
import { IInventorySubledgerService } from '../finance/subledger/inventory-subledger.service.interface';
import { PricingQuoteDto } from './dto/pricing-quote.dto';

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);
  private cache = new Map<string, { quote: PricingQuoteDto; expiry: number }>();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  constructor(
    @Inject('IPricingRepository')
    private readonly repository: IPricingRepository,
    @Inject(IInventorySubledgerService)
    private readonly inventorySubledger: IInventorySubledgerService,
  ) {}

  /**
   * Calculates the real-time price for an SKU based on cost and active rules.
   * L0 (Cost) -> L1 (Internal) -> L2 (Sales Exposure)
   */
  async calculatePrice(tenant_id: string, skuId: string, location_id: string): Promise<PricingQuoteDto> {
    const cacheKey = `${tenant_id}:${skuId}:${location_id}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.quote;
    }

    // ... (rest of the logic remains same, will wrap in the file)
    // 1. Fetch L0: Real-time Cost from Sub-ledger
    const valuation = await this.inventorySubledger.getSkuValuation(tenant_id, skuId, location_id);
    const baseCost = valuation.unitCost;

    // 2. Fetch active rules sorted by priority
    const rules = await this.repository.getRules(tenant_id);

    if (rules.length === 0) {
      this.logger.warn(`No active pricing rules for tenant ${tenant_id}. Using cost as price.`);
      return {
        skuId,
        location_id,
        baseCost,
        salesPrice: baseCost,
        ruleId: 'NONE',
        margin: 0,
        currency: valuation.currency,
      };
    }

    // 3. Apply first matching rule (Rule Engine)
    // For now, we take the highest priority rule (top of sorted list)
    const rule = rules[0];
    let salesPrice = baseCost;
    const [action, value] = rule.logic.split(':');

    switch (action) {
      case 'MARKUP_PERCENT':
        salesPrice = baseCost * (1 + parseFloat(value) / 100);
        break;
      case 'MARGIN_PERCENT':
        salesPrice = baseCost / (1 - parseFloat(value) / 100);
        break;
      case 'FIXED':
        salesPrice = parseFloat(value);
        break;
      default:
        this.logger.error(`Unknown pricing logic: ${action}`);
    }

    // 4. Apply Constraints (Floor/Ceiling)
    if (rule.floorPrice && salesPrice < rule.floorPrice) salesPrice = rule.floorPrice;
    if (rule.ceilingPrice && salesPrice > rule.ceilingPrice) salesPrice = rule.ceilingPrice;

    const margin = salesPrice - baseCost;

    const quote: PricingQuoteDto = {
      skuId,
      location_id,
      baseCost,
      salesPrice,
      ruleId: rule.id,
      margin,
      currency: valuation.currency,
    };

    // Populate Cache
    this.cache.set(cacheKey, {
      quote,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });

    return quote;
  }

  /**
   * Exposure Layer API for POS/Orders
   */
  async getQuote(tenant_id: string, skuId: string, location_id: string): Promise<PricingQuoteDto> {
    return this.calculatePrice(tenant_id, skuId, location_id);
  }
}
