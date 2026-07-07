import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowSeedService } from './workflow-seed.service';
import {
  WORKFLOW_ACTION_CATALOG,
  WORKFLOW_CATEGORIES,
  WORKFLOW_NODE_CATALOG,
} from './workflow.types';
import {
  WORKFLOW_OPERATOR_CATALOG,
  getFieldsForTrigger,
  WORKFLOW_RECIPIENT_MODES,
} from './workflow-field-catalog';

@Controller('workflows')
@UseGuards(JwtGuard, RolesGuard)
@Roles('SuperAdmin', 'HR_Admin')
export class WorkflowController {
  constructor(
    private readonly definitionService: WorkflowDefinitionService,
    private readonly engineService: WorkflowEngineService,
    private readonly seedService: WorkflowSeedService,
  ) {}

  @Get('catalog')
  getCatalog(@Query('trigger_event') triggerEvent?: string) {
    return {
      success: true,
      data: {
        categories: WORKFLOW_CATEGORIES,
        node_types: WORKFLOW_NODE_CATALOG,
        action_types: WORKFLOW_ACTION_CATALOG,
        operators: WORKFLOW_OPERATOR_CATALOG,
        fields: getFieldsForTrigger(triggerEvent),
        recipient_modes: WORKFLOW_RECIPIENT_MODES,
        trigger_events: [
          'leave.request.submitted',
          'leave.request.approved',
          'leave.request.rejected',
          'leave.balance.adjusted',
          'attendance.clock_in',
          'attendance.clock_out',
          'attendance.tardiness_detected',
          'whatsapp.message.inbound',
          'employee.created',
          'employee.updated',
          'notification.sent',
          'onboarding.workflow_completed',
        ],
      },
    };
  }

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('is_active') is_active?: string,
  ) {
    const rows = await this.definitionService.list({
      category: category || undefined,
      is_active: is_active === undefined ? undefined : is_active === 'true',
    });
    return { success: true, data: rows };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const row = await this.definitionService.getById(id);
    return { success: true, data: row };
  }

  @Get(':id/executions')
  async getExecutions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('is_test') is_test?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : 30;
    const rows = await this.definitionService.listExecutions(
      id,
      Number.isFinite(parsed) ? parsed : 30,
      is_test === undefined ? undefined : is_test === 'true',
    );
    return { success: true, data: rows };
  }

  @Get(':id/executions/:executionId')
  async getExecution(
    @Param('id') id: string,
    @Param('executionId') executionId: string,
  ) {
    const row = await this.definitionService.getExecution(id, executionId);
    return { success: true, data: row };
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const row = await this.definitionService.create({
      slug: String(body.slug || '').trim(),
      name: String(body.name || '').trim(),
      description: body.description,
      category: String(body.category || 'notification'),
      trigger_event: body.trigger_event,
      graph: body.graph,
      updated_by: req.user?.sub,
    });
    this.engineService.invalidateCache();
    return { success: true, data: row };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    if (body.is_active !== undefined) {
      const row = body.is_active
        ? await this.definitionService.activate(id, req.user?.sub)
        : await this.definitionService.deactivate(id, req.user?.sub);
      this.engineService.invalidateCache();
      return { success: true, data: row };
    }

    const row = await this.definitionService.update(id, {
      name: body.name,
      description: body.description,
      category: body.category,
      trigger_event: body.trigger_event,
      graph: body.graph,
      updated_by: req.user?.sub,
    });
    this.engineService.invalidateCache();
    return { success: true, data: row };
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string, @Req() req: any) {
    const row = await this.definitionService.publish(id, req.user?.sub);
    this.engineService.invalidateCache();
    return { success: true, data: row, message: 'Workflow dipublish' };
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string, @Req() req: any) {
    const row = await this.definitionService.activate(id, req.user?.sub);
    this.engineService.invalidateCache();
    return { success: true, data: row, message: 'Workflow diaktifkan' };
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string, @Req() req: any) {
    const row = await this.definitionService.deactivate(id, req.user?.sub);
    this.engineService.invalidateCache();
    return { success: true, data: row, message: 'Workflow dinonaktifkan' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.definitionService.delete(id);
    this.engineService.invalidateCache();
    return { success: true };
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async testRun(@Param('id') id: string, @Body() body: any) {
    const result = await this.engineService.runWorkflowById(id, {
      employee_id: body?.employee_id,
      actor_employee_id: body?.actor_employee_id,
      phone: body?.phone,
      event: body?.event,
    });
    return {
      success: result.status === 'completed',
      data: result,
      message:
        result.status === 'completed'
          ? `Test selesai — ${result.steps.length} langkah`
          : result.error ?? 'Test gagal',
    };
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async reseed() {
    await this.seedService.seedDefaults();
    this.engineService.invalidateCache();
    return { success: true, message: 'Workflow templates re-seeded' };
  }
}
