import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { EcommerceConnectorGuard } from './guards/ecommerce-connector.guard';
import { RetailEventsService, RetailEvent } from './retail-events.service';

@Controller('retail/events')
@UseGuards(EcommerceConnectorGuard)
export class RetailEventsController {
  constructor(private readonly eventsService: RetailEventsService) {}

  @Post()
  async ingestEvent(@Req() request: Request, @Body() body: RetailEvent) {
    if (!body?.type || !body?.actor || !body?.timestamp) {
      return {
        success: false,
        error: 'Invalid Event Schema',
      };
    }

    const scope = (request as any).ecommerceScope;
    const event: RetailEvent = {
      ...body,
      scope: {
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        ecommerceId: scope.ecommerceId,
      },
    };

    const ledger = await this.eventsService.appendEvent(event);
    const engine = await this.eventsService.processEvent(event);

    return {
      success: true,
      ledger,
      engine,
    };
  }
}
