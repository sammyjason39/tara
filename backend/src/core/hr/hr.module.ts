import { Module, OnModuleInit } from "@nestjs/common";
import { HRController } from "./hr.controller";
import { WorkflowController } from "../../shared/workflow/workflow.controller";
import { HRService } from "./hr.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { HRDbRepository } from "./repositories/hr.db.repository";
import { TalentSourcingService } from "./talent-sourcing.service";
import { ComplianceService } from "./compliance.service";
import { ContractGeneratorService } from "./contract-generator.service";
import { AnalyticsService } from "./analytics.service";
import { WorkforcePlannerService } from "./workforce-planner.service";
import { PayrollConsolidationService } from "./payroll-consolidation.service";
import { OcrService } from "./ocr.service";
import { SuccessionService } from "./succession.service";
import { SkillsService } from "./skills.service";
import { TotalRewardsService } from "./total-rewards.service";
import { CareerPathService } from "./career-path.service";
import { JobDescriptionService } from "./job-description.service";
import { PerformancePredictorService } from "./performance-predictor.service";
import { LearningService } from "./learning.service";
import { LaborCostService } from "./labor-cost.service";
import { HRInsightService } from "./hr-insight.service";
import { HRActionService } from "./hr-action.service";
import { HRConsistencyService } from "./hr-consistency.service";
import { HRMetricService } from "./hr-metric.service";
import { SchedulingService } from "./scheduling.service";
import { HrSettlementService } from "./hr-settlement.service";
import { HrPayrollService } from "./hr-payroll.service";
import { HrPayrollController } from "./controllers/hr-payroll.controller";
import { ComplianceController } from "./controllers/compliance.controller";
import { HrSchedulingController } from "./controllers/hr-scheduling.controller";
import { PayrollEngineService } from "./payroll-engine.service";
import { PayslipService } from "./payslip.service";
import { FinanceModule } from "../finance/finance.module";
import { HRMutationInterceptor } from "./interceptors/hr-mutation.interceptor";
import { IdempotencyInterceptor } from "../../shared/interceptors/idempotency.interceptor";
import { PrismaService } from "../../persistence/prisma.service";

import { FileProcessingModule } from "../../shared/file-processing/file-processing.module";
import { AuditModule } from "../../shared/audit/audit.module";
import { LoggerModule } from "../../shared/logger/logger.module";
import { ComplianceEngineModule } from "../../modules/compliance/compliance.module";
import { ComplianceEngineService } from "../../modules/compliance/compliance.service";

// Phase 3: Automation Hooks
import { HRAutomationModule } from "./automation/automation.module";

// Phase 4: Time & Attendance
import { TimeAndAttendanceModule } from "./time/time.module";

// Phase 1: Command Layer
import {
  HireEmployeeCommandHandler,
  PromoteEmployeeCommandHandler,
  TransferEmployeeCommandHandler,
  TerminateEmployeeCommandHandler,
  SuspendEmployeeCommandHandler,
  CreateJobOpeningCommandHandler,
  ConvertLeadToCandidateCommandHandler,
  ScheduleInterviewCommandHandler,
  ExecutePayrollCommandHandler,
  AdjustCompensationCommandHandler,
  GeneratePayslipCommandHandler,
  GenerateComplianceReportCommandHandler,
  ExportGovernmentReportCommandHandler,
  EnableComplianceModuleCommandHandler,
  HRCommandRegistrar,
} from "./commands/hr.command-handlers";

import { CommsModule } from "../../shared/comms/comms.module";

/**
 * HR Module
 * Core module for Human Resources operations
 */
@Module({
  imports: [FileProcessingModule, AuditModule, LoggerModule, ComplianceEngineModule, HRAutomationModule, TimeAndAttendanceModule, CommsModule, FinanceModule],
  controllers: [HRController, WorkflowController, ComplianceController, HrPayrollController, HrSchedulingController],
  providers: [
    HRService,
    TalentSourcingService,
    ComplianceService,
    ContractGeneratorService,
    AnalyticsService,
    WorkforcePlannerService,
    PayrollConsolidationService,
    OcrService,
    SuccessionService,
    SkillsService,
    TotalRewardsService,
    CareerPathService,
    JobDescriptionService,
    PerformancePredictorService,
    LearningService,
    LaborCostService,
    HRInsightService,
    HRActionService,
    HRConsistencyService,
    HRMetricService,
    SchedulingService,
    HrSettlementService,
    HrPayrollService,
    PayrollEngineService,
    PayslipService,
    PrismaService,
    HRMutationInterceptor,
    IdempotencyInterceptor,
    // Phase 1: Command Handlers
    HireEmployeeCommandHandler,
    PromoteEmployeeCommandHandler,
    TransferEmployeeCommandHandler,
    TerminateEmployeeCommandHandler,
    SuspendEmployeeCommandHandler,
    CreateJobOpeningCommandHandler,
    ConvertLeadToCandidateCommandHandler,
    ScheduleInterviewCommandHandler,
    ExecutePayrollCommandHandler,
    AdjustCompensationCommandHandler,
    GeneratePayslipCommandHandler,
    GenerateComplianceReportCommandHandler,
    ExportGovernmentReportCommandHandler,
    EnableComplianceModuleCommandHandler,
    HRCommandRegistrar,
    // Phase 4: Compliance Engine
    ComplianceEngineService,
    {
      provide: IHRRepository,
      useClass: HRDbRepository,
    },
  ],
  exports: [HRService, SchedulingService, HrSettlementService, IHRRepository],
})
export class HRModule implements OnModuleInit {
  constructor(private readonly registrar: HRCommandRegistrar) {}

  onModuleInit(): void {
    this.registrar.register();
  }
}
