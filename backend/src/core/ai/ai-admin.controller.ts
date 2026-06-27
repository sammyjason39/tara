import { Controller, Get, Put, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { AiConfigService } from './ai-config.service';
import { AiLlmService } from './ai-llm.service';
import { AiLogService } from './ai-log.service';
import { SopIndexerService } from './sop-indexer.service';

@Controller('admin/ai')
@UseGuards(JwtGuard, RolesGuard)
@Roles('SuperAdmin', 'HR_Admin')
export class AiAdminController {
  constructor(
    private readonly configService: AiConfigService,
    private readonly llmService: AiLlmService,
    private readonly logService: AiLogService,
    private readonly sopIndexer: SopIndexerService,
  ) {}

  @Get('config')
  async getConfig() {
    return {
      success: true,
      data: {
        ai: this.configService.getAiConfigForApi(),
        whatsapp: this.configService.getWhatsAppConfigForApi(),
      },
    };
  }

  @Put('config')
  async updateConfig(@Body() body: any, @Req() req: any) {
    const modifiedBy = req.user?.sub;

    if (body.ai) {
      await this.configService.updateAiConfig(
        {
          enabled: body.ai.enabled,
          provider: body.ai.provider,
          apiKey: body.ai.apiKey,
          baseUrl: body.ai.baseUrl,
          model: body.ai.model,
          maxTokens: body.ai.maxTokens,
          temperature: body.ai.temperature,
          responseLanguage: body.ai.responseLanguage,
          confirmationTimeoutMinutes: body.ai.confirmationTimeoutMinutes,
          systemPromptOverride: body.ai.systemPromptOverride,
        },
        modifiedBy,
      );
    }

    if (body.whatsapp) {
      await this.configService.updateWhatsAppConfig(
        {
          enabled: body.whatsapp.enabled,
          kapsoApiKey: body.whatsapp.kapsoApiKey,
          phoneNumberId: body.whatsapp.phoneNumberId,
          businessNumber: body.whatsapp.businessNumber,
          webhookVerifyToken: body.whatsapp.webhookVerifyToken,
        },
        modifiedBy,
      );
    }

    await this.configService.refreshCache();

    return {
      success: true,
      data: {
        ai: this.configService.getAiConfigForApi(),
        whatsapp: this.configService.getWhatsAppConfigForApi(),
      },
    };
  }

  @Post('test')
  async testConnection() {
    return { success: true, data: await this.llmService.testConnection() };
  }

  @Post('reindex-sop')
  async reindexSop() {
    const result = await this.sopIndexer.reindexAll();
    return { success: true, data: result };
  }

  @Get('logs')
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employee_id') employeeId?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.logService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      employeeId,
      status,
    });
    return { success: true, data };
  }

  @Get('logs/stats')
  async getLogStats(@Query('days') days?: string) {
    return {
      success: true,
      data: await this.logService.getStats(days ? parseInt(days, 10) : 30),
    };
  }
}
