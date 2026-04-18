import { Controller, Get, Post, Body, Headers, Param } from '@nestjs/common';
import { ClinicService } from './clinic.service';

@Controller('clinic')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Get('reservations/:id')
  async getReservation(
    @Headers('x-tenant-id') tenant_id: string,
    @Param('id') id: string,
  ) {
    return this.clinicService.getReservation(tenant_id || 'system', id);
  }

  @Post('reservations')
  async createReservation(
    @Headers('x-tenant-id') tenant_id: string,
    @Body() data: any,
  ) {
    return this.clinicService.createReservation(tenant_id || 'system', data);
  }
}
