/**
 * HR Command Handlers
 * Phase 1B — CommandBus Infrastructure Extension
 *
 * Each handler implements ICommandHandler<TCommand, TResult>.
 * Handlers are registered with the CommandBusService during module init.
 */
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ICommandHandler } from '../../../shared/command-bus/command-handler.interface';
import { CommandBusService } from '../../../shared/command-bus/command-bus.service';
import { HRService } from '../hr.service';
import { IHRRepository } from '../repositories/hr.repository.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { EVENT_NAMES } from '../events/event-names';
import { ComplianceEngineService } from '../../../modules/compliance/compliance.service';
import {
  HireEmployeeCommand,
  PromoteEmployeeCommand,
  TransferEmployeeCommand,
  TerminateEmployeeCommand,
  SuspendEmployeeCommand,
  CreateJobOpeningCommand,
  ConvertLeadToCandidateCommand,
  ScheduleInterviewCommand,
  ExecutePayrollCommand,
  AdjustCompensationCommand,
  GeneratePayslipCommand,
  GenerateComplianceReportCommand,
  ExportGovernmentReportCommand,
  EnableComplianceModuleCommand,
  HR_COMMAND_NAMES,
} from './hr.commands';

// ─────────────────────────────────────────────────────────────────────────────
// Result Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CommandResult {
  tenant_id: string;
  success: boolean;
  message: string;
  data?: any;
}

export interface PayrollExecutionResult {
  tenant_id: string;
  period_start: Date;
  period_end: Date;
  currency: string;
  processedEmployees: number;
  totalGrossPay: number;
  complianceModulesRun: string[];
  status: 'COMPLETED' | 'PARTIAL';
  payrollRunId?: string;
  message: string;
}

export interface ComplianceReportResult {
  tenant_id: string;
  country: string;
  module: string;
  period: string;
  format: string;
  data: string | object;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE LIFECYCLE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class HireEmployeeCommandHandler implements ICommandHandler<HireEmployeeCommand, CommandResult> {
  private readonly logger = new Logger(HireEmployeeCommandHandler.name);

  constructor(
    private readonly hrService: HRService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(command: HireEmployeeCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    this.logger.log(`HireEmployeeCommand: converting candidate ${payload.candidateId}`);

    const employee = await this.hrService.hireCandidate(tenant_id, payload.candidateId, payload);

    // Event emission AFTER successful transaction
    await this.eventBus.publish({
      event_type: EVENT_NAMES.EMPLOYEE_HIRED,
      tenant_id,
      entity_id: employee.id,
      entity_type: "EMPLOYEE",
      source_module: "HR",
      payload: {
        candidateId: payload.candidateId,
        employee_id: employee.id,
        positions: employee.role_title,
        department_id: payload.department_id,
      },
    });

    return { tenant_id, success: true, message: 'Employee hired', data: employee.id };
  }
}

@Injectable()
export class PromoteEmployeeCommandHandler implements ICommandHandler<PromoteEmployeeCommand, CommandResult> {
  private readonly logger = new Logger(PromoteEmployeeCommandHandler.name);

  constructor(private readonly hrService: HRService, private readonly auditService: AuditService, private readonly eventBus: EventBusService) {}

  async execute(command: PromoteEmployeeCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    await this.hrService.promoteEmployee(tenant_id, payload.employee_id, {
      newPosition: payload.newPosition,
      newSalary: payload.newSalary,
      effectiveDate: payload.effectiveDate,
      approved_by: payload.approved_by,
    }, payload.approved_by);

    await this.eventBus.publish({
      event_type: EVENT_NAMES.EMPLOYEE_PROMOTED,
      tenant_id,
      entity_id: payload.employee_id,
      entity_type: "EMPLOYEE",
      source_module: "HR",
      payload: { newPosition: payload.newPosition, newSalary: payload.newSalary },
    });

    return { tenant_id, success: true, message: 'Employee promoted' };
  }
}

@Injectable()
export class TransferEmployeeCommandHandler implements ICommandHandler<TransferEmployeeCommand, CommandResult> {
  private readonly logger = new Logger(TransferEmployeeCommandHandler.name);
  constructor(private readonly hrService: HRService, private readonly eventBus: EventBusService) {}

  async execute(command: TransferEmployeeCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    await this.hrService.transferEmployee(tenant_id, payload.employee_id, {
      department_id: payload.targetDepartmentId,
      location_id: payload.targetLocationId,
      effectiveDate: payload.effectiveDate,
      reason: payload.reason,
    });

    await this.eventBus.publish({
      event_type: EVENT_NAMES.EMPLOYEE_TRANSFERRED,
      tenant_id,
      entity_id: payload.employee_id,
      entity_type: "EMPLOYEE",
      source_module: "HR",
      payload: { targetDepartmentId: payload.targetDepartmentId, targetLocationId: payload.targetLocationId },
    });

    return { tenant_id, success: true, message: 'Employee transferred' };
  }
}

@Injectable()
export class TerminateEmployeeCommandHandler implements ICommandHandler<TerminateEmployeeCommand, CommandResult> {
  private readonly logger = new Logger(TerminateEmployeeCommandHandler.name);

  constructor(private readonly hrService: HRService, private readonly repository: IHRRepository, private readonly eventBus: EventBusService) {}

  async execute(command: TerminateEmployeeCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    const employee = await this.repository.getEmployeeById(tenant_id, payload.employee_id);
    if (!employee) throw new NotFoundException(`Employee ${payload.employee_id} not found`);

    await this.hrService.deactivateEmployee(tenant_id, payload.employee_id);

    await this.eventBus.publish({
      event_type: EVENT_NAMES.EMPLOYEE_TERMINATED,
      tenant_id,
      entity_id: payload.employee_id,
      entity_type: "EMPLOYEE",
      source_module: "HR",
      payload: { reason: payload.reason, termination_date: payload.termination_date },
    });

    return { tenant_id, success: true, message: 'Employee terminated' };
  }
}

@Injectable()
export class SuspendEmployeeCommandHandler implements ICommandHandler<SuspendEmployeeCommand, CommandResult> {
  private readonly logger = new Logger(SuspendEmployeeCommandHandler.name);
  constructor(private readonly hrService: HRService, private readonly eventBus: EventBusService) {}

  async execute(command: SuspendEmployeeCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    this.logger.log(`SuspendEmployeeCommand: ${payload.employee_id}`);
    
    await this.hrService.suspendEmployee(tenant_id, payload.employee_id, payload.reason);
    
    await this.eventBus.publish({
      event_type: EVENT_NAMES.EMPLOYEE_SUSPENDED,
      tenant_id,
      entity_id: payload.employee_id,
      entity_type: "EMPLOYEE",
      source_module: "HR",
      payload: { reason: payload.reason, suspensionDate: payload.suspensionDate },
    });
    
    return { tenant_id, success: true, message: 'Employee suspended' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITMENT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CreateJobOpeningCommandHandler implements ICommandHandler<CreateJobOpeningCommand, CommandResult> {
  private readonly logger = new Logger(CreateJobOpeningCommandHandler.name);
  constructor(private readonly hrService: HRService) {}

  async execute(command: CreateJobOpeningCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    this.logger.log(`CreateJobOpeningCommand: ${payload.title}`);
    
    const requisition = await this.hrService.createRequisition(tenant_id, {
      title: payload.title,
      department_id: payload.department_id,
      description: payload.description,
      openings: payload.openings || 1,
      status: 'OPEN',
    } as any);

    return { tenant_id, success: true, message: 'Job opening created', data: requisition.id };
  }
}

@Injectable()
export class ConvertLeadToCandidateCommandHandler implements ICommandHandler<ConvertLeadToCandidateCommand, CommandResult> {
  private readonly logger = new Logger(ConvertLeadToCandidateCommandHandler.name);
  constructor(private readonly hrService: HRService, private readonly eventBus: EventBusService) {}

  async execute(command: ConvertLeadToCandidateCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    this.logger.log(`ConvertLeadToCandidateCommand: ${payload.lead_id}`);
    
    const candidate = await this.hrService.convertLeadToCandidate(
      tenant_id,
      payload.lead_id,
      payload.jobOpeningId,
      command.actor_id,
    );

    await this.eventBus.publish({
      event_type: EVENT_NAMES.CANDIDATE_CONVERTED,
      tenant_id,
      entity_id: payload.lead_id,
      entity_type: "CANDIDATE",
      source_module: "HR",
      payload: { candidateId: candidate.id, jobOpeningId: payload.jobOpeningId },
    });

    return { tenant_id, success: true, message: 'Lead converted to candidate', data: candidate.id };
  }
}

@Injectable()
export class ScheduleInterviewCommandHandler implements ICommandHandler<ScheduleInterviewCommand, CommandResult> {
  private readonly logger = new Logger(ScheduleInterviewCommandHandler.name);
  constructor(private readonly repository: IHRRepository, private readonly eventBus: EventBusService) {}

  async execute(command: ScheduleInterviewCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    this.logger.log(`ScheduleInterviewCommand: ${payload.candidateId}`);
    
    const interview = await this.repository.scheduleInterview(tenant_id, {
      candidateId: payload.candidateId,
      scheduledAt: payload.scheduledAt,
      title: 'Interview',
    });

    await this.eventBus.publish({
      event_type: EVENT_NAMES.INTERVIEW_SCHEDULED,
      tenant_id,
      entity_id: payload.candidateId,
      entity_type: "CANDIDATE",
      source_module: "HR",
      payload: { interviewId: interview.id, scheduledAt: payload.scheduledAt },
    });

    return { tenant_id, success: true, message: 'Interview scheduled', data: interview.id };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYROLL HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ExecutePayrollCommandHandler implements ICommandHandler<ExecutePayrollCommand, PayrollExecutionResult> {
  private readonly logger = new Logger(ExecutePayrollCommandHandler.name);

  constructor(
    private readonly repository: IHRRepository,
    private readonly complianceEngine: ComplianceEngineService,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(command: ExecutePayrollCommand): Promise<PayrollExecutionResult> {
    const { tenant_id, payload } = command;
    const period = payload.period_start.toISOString().substring(0, 7);
    
    // PHASE 5: CONCURRENCY GUARD
    // Check if a payroll run is already processing for this period
    const existingRun = await this.repository.getPayrollRuns(tenant_id);
    if (existingRun.some(run => 
      run.period_start.toISOString().substring(0, 7) === period && 
      (run as any).status === 'processing'
    )) {
      throw new ConflictException(`Payroll execution for ${period} is already in progress.`);
    }

    const result = await this.repository.getEmployees(tenant_id);
    const activeEmployees = result.data.filter(e => e.status === 'active' || e.status === 'probation');
    const totalGrossPay = activeEmployees.reduce((sum, e) => sum + Number((e as any).base_salary || 0), 0);
    
    const complianceModulesRun: string[] = [];
    const modulesToRun = ['BPJS_KESEHATAN', 'BPJS_KETENAGAKERJAAN', 'PPH21'];
    
    for (const mod of modulesToRun) {
      // PHASE 3: COMPLIANCE HARD STOP
      // We no longer continue on failure. Any compliance failure stops execution.
      await this.complianceEngine.calculate(tenant_id, mod, period);
      complianceModulesRun.push(mod);
    }
    
    // PHASE 2: TRANSACTIONAL PAYROLL
    const transactionResult = await this.repository.executePayrollTransaction(tenant_id, period, activeEmployees);

    // Event emission moved to Outbox Pattern (Repository level write)

    return {
      tenant_id,
      period_start: payload.period_start,
      period_end: payload.period_end,
      currency: payload.currency || 'USD',
      processedEmployees: activeEmployees.length,
      totalGrossPay,
      complianceModulesRun,
      status: 'COMPLETED',
      payrollRunId: transactionResult.payrollRunId,
      message: `Payroll executed and posted to ledger for ${period}.`,
    };
  }
}

@Injectable()
export class AdjustCompensationCommandHandler implements ICommandHandler<AdjustCompensationCommand, CommandResult> {
  private readonly logger = new Logger(AdjustCompensationCommandHandler.name);
  constructor(private readonly hrService: HRService) {}

  async execute(command: AdjustCompensationCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    this.logger.log(`AdjustCompensationCommand: ${payload.employee_id}`);
    
    await this.hrService.updateCompensation(tenant_id, payload.employee_id, {
      base_salary: payload.newSalary,
      effectiveDate: payload.effectiveDate,
    });

    return { tenant_id, success: true, message: 'Compensation adjusted' };
  }
}

@Injectable()
export class GeneratePayslipCommandHandler implements ICommandHandler<GeneratePayslipCommand, CommandResult> {
  private readonly logger = new Logger(GeneratePayslipCommandHandler.name);
  constructor(private readonly eventBus: EventBusService) {}

  async execute(command: GeneratePayslipCommand): Promise<CommandResult> {
    this.logger.log(`GeneratePayslipCommand: ${command.payload.employee_id}`);
    await this.eventBus.publish({
      event_type: EVENT_NAMES.PAYSLIP_GENERATED,
      tenant_id: command.tenant_id,
      entity_id: command.payload.employee_id,
      entity_type: "PAYROLL",
      source_module: "HR",
      payload: { payrollRunId: command.payload.payrollRunId },
    });
    return { tenant_id: command.tenant_id, success: true, message: 'Payslip generated' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class GenerateComplianceReportCommandHandler implements ICommandHandler<GenerateComplianceReportCommand, ComplianceReportResult> {
  private readonly logger = new Logger(GenerateComplianceReportCommandHandler.name);
  constructor(private readonly complianceEngine: ComplianceEngineService, private readonly eventBus: EventBusService) {}

  async execute(command: GenerateComplianceReportCommand): Promise<ComplianceReportResult> {
    const { tenant_id, payload } = command;
    this.logger.log(`GenerateComplianceReportCommand: ${payload.country}/${payload.module} for ${payload.period}`);
    
    try {
      const result = await this.complianceEngine.calculate(tenant_id, payload.module, payload.period);
      
      await this.eventBus.publish({
        event_type: EVENT_NAMES.COMPLIANCE_REPORT_GENERATED,
        tenant_id,
        entity_id: `${payload.module}-${payload.period}`,
        entity_type: "COMPLIANCE_REPORT",
        source_module: "HR",
        payload: { module: payload.module, period: payload.period },
      });

      return {
        tenant_id,
        country: payload.country,
        module: payload.module,
        period: payload.period,
        format: payload.format,
        data: result,
        message: 'Compliance report generated.',
      };
    } catch (e: any) {
      return { tenant_id, country: payload.country, module: payload.module, period: payload.period, format: payload.format, data: {}, message: `Error: ${e.message}`};
    }
  }
}

@Injectable()
export class ExportGovernmentReportCommandHandler implements ICommandHandler<ExportGovernmentReportCommand, CommandResult> {
  private readonly logger = new Logger(ExportGovernmentReportCommandHandler.name);
  async execute(command: ExportGovernmentReportCommand): Promise<CommandResult> {
    this.logger.log(`ExportGovernmentReportCommand: ${command.payload.module}`);
    return { tenant_id: command.tenant_id, success: true, message: 'Government report exported' };
  }
}

@Injectable()
export class EnableComplianceModuleCommandHandler implements ICommandHandler<EnableComplianceModuleCommand, CommandResult> {
  private readonly logger = new Logger(EnableComplianceModuleCommandHandler.name);
  constructor(private readonly repository: IHRRepository, private readonly eventBus: EventBusService) {}

  async execute(command: EnableComplianceModuleCommand): Promise<CommandResult> {
    const { tenant_id, payload } = command;
    this.logger.log(`EnableComplianceModuleCommand: ${payload.module}`);
    
    await this.repository.enableComplianceModule(tenant_id, payload.module, payload.config);

    await this.eventBus.publish({
      event_type: EVENT_NAMES.COMPLIANCE_MODULE_ENABLED,
      tenant_id,
      entity_id: payload.module,
      entity_type: "COMPLIANCE_MODULE",
      source_module: "HR",
      payload: { country: payload.country },
    });
    return { tenant_id, success: true, message: 'Compliance module enabled' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler Registration Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class HRCommandRegistrar {
  private readonly logger = new Logger('HRCommandRegistrar');

  constructor(
    private readonly commandBus: CommandBusService,
    private readonly hireHandler: HireEmployeeCommandHandler,
    private readonly promoteHandler: PromoteEmployeeCommandHandler,
    private readonly transferHandler: TransferEmployeeCommandHandler,
    private readonly terminateHandler: TerminateEmployeeCommandHandler,
    private readonly suspendHandler: SuspendEmployeeCommandHandler,
    private readonly createJobOpeningHandler: CreateJobOpeningCommandHandler,
    private readonly convertLeadHandler: ConvertLeadToCandidateCommandHandler,
    private readonly scheduleInterviewHandler: ScheduleInterviewCommandHandler,
    private readonly payrollHandler: ExecutePayrollCommandHandler,
    private readonly adjustCompensationHandler: AdjustCompensationCommandHandler,
    private readonly generatePayslipHandler: GeneratePayslipCommandHandler,
    private readonly complianceReportHandler: GenerateComplianceReportCommandHandler,
    private readonly exportGovernmentReportHandler: ExportGovernmentReportCommandHandler,
    private readonly enableComplianceModuleHandler: EnableComplianceModuleCommandHandler,
  ) {}

  register(): void {
    this.commandBus.register(HR_COMMAND_NAMES.HIRE_EMPLOYEE, this.hireHandler);
    this.commandBus.register(HR_COMMAND_NAMES.PROMOTE_EMPLOYEE, this.promoteHandler);
    this.commandBus.register(HR_COMMAND_NAMES.TRANSFER_EMPLOYEE, this.transferHandler);
    this.commandBus.register(HR_COMMAND_NAMES.TERMINATE_EMPLOYEE, this.terminateHandler);
    this.commandBus.register(HR_COMMAND_NAMES.SUSPEND_EMPLOYEE, this.suspendHandler);
    this.commandBus.register(HR_COMMAND_NAMES.CREATE_JOB_OPENING, this.createJobOpeningHandler);
    this.commandBus.register(HR_COMMAND_NAMES.CONVERT_LEAD_CANDIDATE, this.convertLeadHandler);
    this.commandBus.register(HR_COMMAND_NAMES.SCHEDULE_INTERVIEW, this.scheduleInterviewHandler);
    this.commandBus.register(HR_COMMAND_NAMES.EXECUTE_PAYROLL, this.payrollHandler);
    this.commandBus.register(HR_COMMAND_NAMES.ADJUST_COMPENSATION, this.adjustCompensationHandler);
    this.commandBus.register(HR_COMMAND_NAMES.GENERATE_PAYSLIP, this.generatePayslipHandler);
    this.commandBus.register(HR_COMMAND_NAMES.GENERATE_COMPLIANCE_REPORT, this.complianceReportHandler);
    this.commandBus.register(HR_COMMAND_NAMES.EXPORT_GOVERNMENT_REPORT, this.exportGovernmentReportHandler);
    this.commandBus.register(HR_COMMAND_NAMES.ENABLE_COMPLIANCE_MODULE, this.enableComplianceModuleHandler);

    this.logger.log(`Registered ${this.commandBus.listRegistered().length} HR commands.`);
  }
}
