import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { ITSettingsService } from "./it-settings.service";
import { RegisterDeviceDto } from "./dto/register-device.dto";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { TenantContext } from "../../gateway/tenant-context.interface";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("it-settings")
@UseInterceptors(TenantInterceptor)
export class ITSettingsController {
  constructor(private readonly itSettingsService: ITSettingsService) {}

  @Get("devices")
  async getDevices(
    @Req() request: RequestWithTenant,
    @Query("location_id") location_id?: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const devices = await this.itSettingsService.getDevices(
      tenant_id,
      location_id,
    );
    return {
      success: true,
      tenant_id,
      count: devices.length,
      data: devices,
    };
  }

  @Post("devices")
  async registerDevice(
    @Req() request: RequestWithTenant,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const device = await this.itSettingsService.registerDevice(
      tenant_id,
      registerDeviceDto,
      user_id,
    );
    return {
      success: true,
      tenant_id,
      message: "Device registered successfully",
      data: device,
    };
  }

  @Put("devices/:id/status")
  async updateDeviceStatus(
    @Req() request: RequestWithTenant,
    @Param("id") device_id: string,
    @Body() body: { status: string },
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const device = await this.itSettingsService.updateDeviceStatus(
      tenant_id,
      device_id,
      body.status,
      user_id,
    );
    return {
      success: true,
      tenant_id,
      message: "Device status updated",
      data: device,
    };
  }

  @Get("settings")
  async getSettings(
    @Req() request: RequestWithTenant,
    @Query("category") category?: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const settings = await this.itSettingsService.getSettings(
      tenant_id,
      category,
    );
    return {
      success: true,
      tenant_id,
      count: settings.length,
      data: settings,
    };
  }

  @Get("settings/:key")
  async getSetting(
    @Req() request: RequestWithTenant,
    @Param("key") key: string,
  ) {
    const { tenant_id } = request.tenantContext;
    const setting = await this.itSettingsService.getSetting(tenant_id, key);
    if (!setting) {
      return {
        success: false,
        tenant_id,
        message: "Setting not found",
        data: null,
      };
    }
    return {
      success: true,
      tenant_id,
      data: setting,
    };
  }

  @Put("settings/:key")
  async updateSetting(
    @Req() request: RequestWithTenant,
    @Param("key") key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const setting = await this.itSettingsService.updateSetting(
      tenant_id,
      key,
      updateSettingDto,
      user_id,
    );
    return {
      success: true,
      tenant_id,
      message: "Setting updated successfully",
      data: setting,
    };
  }
}
