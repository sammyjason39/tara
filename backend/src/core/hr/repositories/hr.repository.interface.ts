import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateEmployeeDto } from "../dto/create-employee.dto";
import { UpdateEmployeeDto } from "../dto/update-employee.dto";
import { CreateLeaveRequestDto } from "../dto/create-leave-request.dto";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { CreateRequisitionDto } from "../dto/create-requisition.dto";
import { CreatePerformanceCycleDto } from "../dto/create-performance-cycle.dto";
import { SubmitReviewDto } from "../dto/submit-review.dto";
import { CreateCaseDto } from "../dto/create-case.dto";
import { CreateContractDto } from "../dto/create-contract.dto";
import { CreateBudgetScenarioDto } from "../dto/create-budget-scenario.dto";
import { CreateHeadcountPlanDto } from "../dto/create-headcount-plan.dto";
import { Employee } from "../entities/employee.entity";
import { Attendance } from "../entities/attendance.entity";
import { LeaveRequest } from "../entities/leave-request.entity";
import { Payroll } from "../entities/payroll.entity";
import { Department } from "../entities/department.entity";
import { JobRequisition } from "../entities/requisition.entity";
import { PerformanceCycle } from "../entities/performance-cycle.entity";
import { PerformanceReview } from "../entities/performance-review.entity";
import { HRCase } from "../entities/hr-case.entity";
import { Contract } from "../entities/contract.entity";
import { Candidate } from "../entities/candidate.entity";
import { Position } from "../entities/position.entity";
import { Compensation } from "../entities/compensation.entity";
import { Interview } from "../entities/interview.entity";
import { TalentLead } from "../entities/talent-lead.entity";
import { ComplianceDocument } from "../entities/compliance-document.entity";
import { BudgetScenario } from "../entities/budget-scenario.entity";
import { HeadcountPlan } from "../entities/headcount-plan.entity";
import { ExchangeRate } from "../entities/exchange-rate.entity";
import { PayrollRun } from "../entities/payroll-run.entity";
import { PayrollLine } from "../entities/payroll-line.entity";
import { SuccessionPlan } from "../entities/succession-plan.entity";
import { SuccessionCandidate } from "../entities/succession-candidate.entity";
import { Skill } from "../entities/skill.entity";
import { EmployeeSkill } from "../entities/employee-skill.entity";
import { BenefitPlan } from "../entities/benefit-plan.entity";
import { EmployeeBenefit } from "../entities/employee-benefit.entity";
import { CareerPath } from "../entities/career-path.entity";
import { MentorshipPair } from "../entities/mentorship-pair.entity";
import { PositionSkill } from "../entities/position-skill.entity";
import { PerformanceGoal } from "../entities/performance-goal.entity";
import { TrainingProgram } from "../entities/training-program.entity";
import { TrainingAssignment } from "../entities/training-assignment.entity";
import { ProgramSkill } from "../entities/program-skill.entity";

@Injectable()
export abstract class IHRRepository {
  // Get By ID Methods
  abstract getEmployeeById(tenant_id: string, employee_id: string): Promise<Employee | null>;
  abstract getGlobalEmployeeById(employee_id: string): Promise<Employee | null>;
  abstract getRequisitionById(tenant_id: string, id: string): Promise<JobRequisition | null>;
  abstract getContractById(tenant_id: string, id: string): Promise<Contract | null>;
  abstract getTrainingAssignmentById(tenant_id: string, id: string): Promise<any | null>;
  abstract getLeaveRequestById(tenant_id: string, id: string): Promise<LeaveRequest | null>;
  abstract getDepartmentById(tenant_id: string, department_id: string): Promise<Department | null>;
  abstract getPerformanceCycleById(tenant_id: string, id: string): Promise<PerformanceCycle | null>;
  abstract getCaseById(tenant_id: string, id: string): Promise<HRCase | null>;
  abstract getCandidateById(tenant_id: string, id: string): Promise<Candidate | null>;
  abstract getPositionById(tenant_id: string, id: string): Promise<Position | null>;
  abstract getInterviewById(tenant_id: string, id: string): Promise<Interview | null>;
  abstract getTalentLeadById(tenant_id: string, id: string): Promise<TalentLead | null>;
  abstract getGoalById(tenant_id: string, id: string): Promise<PerformanceGoal | null>;
  abstract getTrainingProgramById(tenant_id: string, id: string): Promise<TrainingProgram | null>;

  // Employee Management
  abstract getEmployees(tenant_id: string, location_id?: string, company_id?: string, department_id?: string, page?: number, limit?: number): Promise<{ data: Employee[]; total: number }>;
  abstract getGlobalEmployees(location_id?: string, page?: number, limit?: number): Promise<{ data: Employee[]; total: number }>;
  abstract createEmployee(tenant_id: string, data: CreateEmployeeDto, tx?: Prisma.TransactionClient): Promise<Employee>;
  abstract updateEmployee(tenant_id: string, employee_id: string, data: UpdateEmployeeDto, tx?: Prisma.TransactionClient): Promise<Employee>;
  abstract deactivateEmployee(tenant_id: string, employee_id: string, tx?: Prisma.TransactionClient): Promise<Employee>;
  abstract promoteEmployee(tenant_id: string, employee_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Employee>;
  abstract transferEmployee(tenant_id: string, employee_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Employee>;
  abstract suspendEmployee(tenant_id: string, employee_id: string, reason: string, tx?: Prisma.TransactionClient): Promise<Employee>;

  // Attendance & Shifts
  abstract getAttendance(tenant_id: string, location_id?: string, employee_id?: string, start_date?: string, end_date?: string, page?: number, limit?: number): Promise<{ data: Attendance[]; total: number }>;
  abstract getGlobalAttendance(employee_id?: string, start_date?: string, end_date?: string, page?: number, limit?: number): Promise<{ data: Attendance[]; total: number }>;
  abstract clock_in(tenant_id: string, employee_id: string, location_id: string, shift_id?: string, method?: string, metadata?: any, tx?: Prisma.TransactionClient): Promise<Attendance>;
  abstract clock_out(tenant_id: string, employee_id: string, tx?: Prisma.TransactionClient): Promise<Attendance>;
  abstract assignShift(tenant_id: string, employee_id: string, shift_id: string, location_id: string, date: string, tx?: Prisma.TransactionClient): Promise<void>;

  // Global Scheduling
  abstract getWorkSchedules(tenant_id: string, location_id?: string, status?: string): Promise<any[]>;
  abstract createWorkSchedule(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<any>;
  abstract updateWorkSchedule(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<any>;
  abstract getWorkShifts(tenant_id: string, scheduleId?: string, employee_id?: string): Promise<any[]>;
  abstract createWorkShift(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<any>;
  abstract updateWorkShift(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<any>;
  abstract approveWorkSchedule(tenant_id: string, id: string, approved_by: string, tx?: Prisma.TransactionClient): Promise<any>;

  // Leave Management
  abstract getLeaveRequests(tenant_id: string, location_id?: string, status?: string, employee_id?: string): Promise<LeaveRequest[]>;
  abstract getGlobalLeaveRequests(status?: string, employee_id?: string): Promise<LeaveRequest[]>;
  abstract createLeaveRequest(tenant_id: string, data: CreateLeaveRequestDto, tx?: Prisma.TransactionClient): Promise<LeaveRequest>;
  abstract approveLeaveRequest(tenant_id: string, request_id: string, reviewerId: string, notes?: string, tx?: Prisma.TransactionClient): Promise<LeaveRequest>;
  abstract rejectLeaveRequest(tenant_id: string, request_id: string, reviewerId: string, notes: string, tx?: Prisma.TransactionClient): Promise<LeaveRequest>;

  // Payroll Management
  abstract getPayroll(tenant_id: string, location_id?: string, employee_id?: string, period?: string): Promise<Payroll[]>;
  abstract getGlobalPayroll(employee_id: string, period?: string): Promise<Payroll[]>;
  abstract getPayrollRuns(tenant_id: string): Promise<PayrollRun[]>;
  abstract getPayrollRunById(tenant_id: string, id: string): Promise<PayrollRun | null>;
  abstract createPayrollRun(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<PayrollRun>;
  abstract updatePayrollRun(tenant_id: string, id: string, data: Partial<PayrollRun>, tx?: Prisma.TransactionClient): Promise<PayrollRun>;
  abstract getPayrollLines(tenant_id: string, runId: string): Promise<PayrollLine[]>;
  abstract createDisbursementLog(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<any>;
  abstract getDisbursementLogs(tenant_id: string, runId: string): Promise<any[]>;

  // Organization Management
  abstract getLocations(tenant_id: string): Promise<any[]>;
  abstract getDepartments(tenant_id: string): Promise<Department[]>;
  abstract getGlobalDepartments(): Promise<Department[]>;
  abstract createDepartment(tenant_id: string, data: CreateDepartmentDto, tx?: Prisma.TransactionClient): Promise<Department>;

  // Recruitment & Talent
  abstract getRequisitions(tenant_id: string, status?: string): Promise<JobRequisition[]>;
  abstract getGlobalRequisitions(status?: string): Promise<JobRequisition[]>;
  abstract createRequisition(tenant_id: string, data: CreateRequisitionDto, tx?: Prisma.TransactionClient): Promise<JobRequisition>;
  abstract updateRequisition(tenant_id: string, id: string, data: Partial<JobRequisition>, tx?: Prisma.TransactionClient): Promise<JobRequisition>;
  abstract getCandidates(tenant_id: string, status?: string): Promise<Candidate[]>;
  abstract createCandidate(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Candidate>;
  abstract updateCandidate(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<Candidate>;
  abstract hireCandidate(tenant_id: string, candidateId: string, data: any, tx?: Prisma.TransactionClient): Promise<Employee>;
  abstract getTalentLeads(tenant_id: string, status?: string): Promise<TalentLead[]>;
  abstract createTalentLead(tenant_id: string, data: any): Promise<TalentLead>;
  abstract updateTalentLead(tenant_id: string, id: string, data: any): Promise<TalentLead>;
  abstract getInterviews(tenant_id: string, candidateId?: string): Promise<Interview[]>;
  abstract scheduleInterview(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Interview>;
  abstract updateInterviewStatus(tenant_id: string, id: string, status: string, tx?: Prisma.TransactionClient): Promise<Interview>;

  // Headcount & Compensation
  abstract getPositions(tenant_id: string, deptId?: string): Promise<Position[]>;
  abstract createPosition(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Position>;
  abstract updatePosition(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<Position>;
  abstract getCompensation(tenant_id: string, employee_id: string): Promise<Compensation | null>;
  abstract updateCompensation(tenant_id: string, employee_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Compensation>;

  // Performance Management
  abstract getPerformanceCycles(tenant_id: string): Promise<PerformanceCycle[]>;
  abstract createPerformanceCycle(tenant_id: string, data: CreatePerformanceCycleDto): Promise<PerformanceCycle>;
  abstract updatePerformanceCycle(tenant_id: string, id: string, data: any): Promise<PerformanceCycle>;
  abstract getPerformanceReviews(tenant_id: string, cycleId?: string, employee_id?: string): Promise<PerformanceReview[]>;
  abstract getGlobalPerformanceReviews(cycleId?: string, employee_id?: string): Promise<PerformanceReview[]>;
  abstract submitPerformanceReview(tenant_id: string, data: SubmitReviewDto, tx?: Prisma.TransactionClient): Promise<PerformanceReview>;
  abstract getEmployeePerformanceHistory(tenant_id: string, employee_id: string): Promise<PerformanceReview[]>;
  abstract getEmployeeGoals(tenant_id: string, employee_id: string): Promise<PerformanceGoal[]>;
  abstract updatePerformanceGoal(tenant_id: string, data: any): Promise<PerformanceGoal>;
  abstract updatePerformanceGoalStatus?(tenant_id: string, id: string, status: string): Promise<PerformanceGoal>;

  // Case Management
  abstract getCases(tenant_id: string, location_id?: string, status?: string, employee_id?: string): Promise<HRCase[]>;
  abstract createCase(tenant_id: string, data: CreateCaseDto, tx?: Prisma.TransactionClient): Promise<HRCase>;
  abstract updateCase(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<HRCase>;

  // Contract Management
  abstract getContracts(tenant_id: string, location_id?: string, employee_id?: string): Promise<Contract[]>;
  abstract getGlobalContracts(employee_id?: string): Promise<Contract[]>;
  abstract createContract(tenant_id: string, data: CreateContractDto, tx?: Prisma.TransactionClient): Promise<Contract>;
  abstract updateContract(tenant_id: string, id: string, data: any): Promise<Contract>;

  // Skills & Training
  abstract getSkills(tenant_id: string, category?: string): Promise<Skill[]>;
  abstract createSkill(tenant_id: string, data: any): Promise<Skill>;
  abstract getEmployeeSkills(tenant_id: string, employee_id: string): Promise<EmployeeSkill[]>;
  abstract addEmployeeSkill(tenant_id: string, data: any): Promise<EmployeeSkill>;
  abstract updateEmployeeSkill(tenant_id: string, data: any): Promise<EmployeeSkill>;
  abstract getPositionSkills(tenant_id: string, position_id: string): Promise<PositionSkill[]>;
  abstract updatePositionSkill(tenant_id: string, data: any): Promise<PositionSkill>;
  abstract findTalentBySkills(tenant_id: string, skillIds: string[], limit?: number): Promise<any[]>;
  abstract findReplacementCandidates(tenant_id: string, position_id: string): Promise<any[]>;
  abstract getTrainingPrograms(tenant_id: string): Promise<any[]>;
  abstract getTrainingProgramsBySkills(tenant_id: string, skillIds: string[]): Promise<TrainingProgram[]>;
  abstract getEmployeeTrainingHistory(tenant_id: string, employee_id: string): Promise<TrainingAssignment[]>;
  abstract createTrainingProgram(tenant_id: string, data: any): Promise<any>;
  abstract enrollInTrainingProgram(tenant_id: string, employee_id: string, programId: string): Promise<TrainingAssignment>;
  abstract getTrainingAssignments(tenant_id: string): Promise<any[]>;
  abstract createTrainingAssignment(tenant_id: string, data: any): Promise<any>;
  abstract updateTrainingAssignment(tenant_id: string, id: string, data: any): Promise<any>;

  // Benefits & Career
  abstract getBenefitPlans(tenant_id: string): Promise<BenefitPlan[]>;
  abstract createBenefitPlan(tenant_id: string, data: any): Promise<BenefitPlan>;
  abstract getEmployeeBenefits(tenant_id: string, employee_id: string): Promise<EmployeeBenefit[]>;
  abstract enrollInBenefit(tenant_id: string, data: any): Promise<EmployeeBenefit>;
  abstract getCareerPaths(tenant_id: string): Promise<CareerPath[]>;
  abstract createCareerPath(tenant_id: string, data: any): Promise<CareerPath>;
  abstract getMentorshipPairs(tenant_id: string, employee_id: string): Promise<MentorshipPair[]>;
  abstract createMentorshipPair(tenant_id: string, data: any): Promise<MentorshipPair>;

  // Compliance
  abstract getComplianceDocuments(tenant_id: string, employee_id?: string): Promise<ComplianceDocument[]>;
  abstract uploadComplianceDocument(tenant_id: string, data: any): Promise<ComplianceDocument>;
  abstract getGlobalComplianceStatus(tenant_id: string, status?: string): Promise<any>;
  abstract verifyDocument(tenant_id: string, documentId: string, verified_by: string, status: string, details?: any): Promise<ComplianceDocument>;
  abstract getComplianceModules(tenant_id: string): Promise<any[]>;
  abstract enableComplianceModule(tenant_id: string, moduleKey: string, config?: any): Promise<any>;
  abstract getComplianceReports(tenant_id: string): Promise<any[]>;
  abstract createComplianceReport(tenant_id: string, data: any): Promise<any>;

  // Strategic Workforce & Succession
  abstract getBudgetScenarios(tenant_id: string): Promise<BudgetScenario[]>;
  abstract createBudgetScenario(tenant_id: string, data: CreateBudgetScenarioDto): Promise<BudgetScenario>;
  abstract getHeadcountPlans(tenant_id: string, scenario_id: string): Promise<HeadcountPlan[]>;
  abstract createHeadcountPlan(tenant_id: string, data: CreateHeadcountPlanDto): Promise<HeadcountPlan>;
  abstract updateHeadcountPlan(tenant_id: string, id: string, data: any): Promise<HeadcountPlan>;
  abstract getExchangeRates(tenant_id: string): Promise<ExchangeRate[]>;
  abstract createExchangeRate(tenant_id: string, data: any): Promise<ExchangeRate>;
  abstract getSuccessionPlans(tenant_id: string): Promise<SuccessionPlan[]>;
  abstract getSuccessionPlan(tenant_id: string, position_id: string): Promise<SuccessionPlan | null>;
  abstract createSuccessionPlan(tenant_id: string, data: any): Promise<SuccessionPlan>;
  abstract addSuccessionCandidate(tenant_id: string, data: any): Promise<SuccessionCandidate>;
  abstract getBenchStrength(tenant_id: string, department_id?: string): Promise<any>;

  // Analytics & Reporting
  abstract getHeadcountTrend(tenant_id: string): Promise<any[]>;
  abstract getTurnoverStats(tenant_id: string): Promise<any>;
  abstract getDepartmentAnalytics(tenant_id: string): Promise<any[]>;
  abstract getCompensationAnalytics(tenant_id: string): Promise<any>;
  abstract getExperienceRate(tenant_id: string): Promise<any>;
  abstract getActualLaborCostHistory(tenant_id: string, department_id: string, monthLimit: number): Promise<any[]>;
  abstract getDepartmentBudgetData(tenant_id: string, department_id: string): Promise<any>;
  abstract getHolidays(tenant_id: string): Promise<any[]>;
  abstract createHoliday(tenant_id: string, data: any): Promise<any>;
  abstract getRetentionRiskData(tenant_id: string): Promise<any[]>;
  abstract getEngagementMetrics(tenant_id: string): Promise<any>;

  // Miscellaneous
  abstract updatePositionJobPost(tenant_id: string, position_id: string, data: any): Promise<any>;
  abstract getPositionJobPost(tenant_id: string, position_id: string): Promise<any>;

  // Hardening & Workforce Extension
  abstract getOverviewMetrics(tenant_id: string): Promise<any>;
  abstract getRetailOverviewMetrics(tenant_id: string): Promise<any>;
  abstract isModuleActive(tenant_id: string, module_key: string): Promise<boolean>;
  abstract getTenantSettings(tenant_id: string): Promise<any>;

  // Shift Templates
  abstract getShiftTemplates(tenant_id: string, location_id?: string): Promise<any[]>;
  abstract createShiftTemplate(tenant_id: string, data: any): Promise<any>;
  abstract deleteShiftTemplate(tenant_id: string, id: string): Promise<any>;

  abstract getStrategicHeadcount(tenant_id: string): Promise<any>;
}
