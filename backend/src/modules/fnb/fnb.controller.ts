import { Controller, Get, Post, Body, Headers, Param, ParseIntPipe } from '@nestjs/common';
import { FnbService } from './fnb.service';

@Controller('fnb')
export class FnbController {
  constructor(private readonly fnbService: FnbService) {}

  @Get('recipes')
  async getRecipes(@Headers('x-tenant-id') tenant_id: string) {
    return this.fnbService.getAllRecipes(tenant_id || 'system');
  }

  @Post('recipes/:id/produce')
  async auditProduction(
    @Headers('x-tenant-id') tenant_id: string,
    @Param('id') recipeId: string,
    @Body('yieldQty', ParseIntPipe) yieldQty: number,
  ) {
    return this.fnbService.auditProduction(tenant_id || 'system', recipeId, yieldQty);
  }
}
