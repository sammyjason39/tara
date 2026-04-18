import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IHRRepository } from "./hr.repository.interface";
import { Employee } from "../entities/employee.entity";
import { Candidate } from "../entities/candidate.entity";
import { Position } from "../entities/position.entity";
import { Compensation } from "../entities/compensation.entity";
import { Department } from "../entities/department.entity";
import { JobRequisition } from "../entities/requisition.entity";
import { Attendance } from "../entities/attendance.entity";
import { LeaveRequest } from "../entities/leave-request.entity";
import { Payroll } from "../entities/payroll.entity";
import { PerformanceCycle } from "../entities/performance-cycle.entity";
import { PerformanceReview } from "../entities/performance-review.entity";
import { HRCase } from "../entities/hr-case.entity";
import { Contract } from "../entities/contract.entity";
import { Interview } from "../entities/interview.entity";
import { TalentLead } from "../entities/talent-lead.entity";
import { ComplianceDocument } from "../entities/compliance-document.entity";
import { BenefitPlan } from "../entities/benefit-plan.entity";
import { EmployeeBenefit } from "../entities/employee-benefit.entity";
import { CareerPath } from "../entities/career-path.entity";
import { MentorshipPair } from "../entities/mentorship-pair.entity";
import { PositionSkill } from "../entities/position-skill.entity";
import { PerformanceGoal } from "../entities/performance-goal.entity";
import { TrainingProgram } from "../entities/training-program.entity";
import { TrainingAssignment } from "../entities/training-assignment.entity";
import { ProgramSkill } from "../entities/program-skill.entity";
import { BudgetScenario } from "../entities/budget-scenario.entity";
import { HeadcountPlan } from "../entities/headcount-plan.entity";
import { ExchangeRate } from "../entities/exchange-rate.entity";
import { PayrollRun } from "../entities/payroll-run.entity";
import { PayrollLine } from "../entities/payroll-line.entity";
import { SuccessionPlan } from "../entities/succession-plan.entity";
import { SuccessionCandidate } from "../entities/succession-candidate.entity";
import { Skill } from "../entities/skill.entity";
import { EmployeeSkill } from "../entities/employee-skill.entity";
import { CreateEmployeeDto } from "../dto/create-employee.dto";
import { UpdateEmployeeDto } from "../dto/update-employee.dto";
import { CreateLeaveRequestDto } from "../dto/create-leave-request.dto";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { CreateRequisitionDto } from "../dto/create-requisition.dto";
import { CreatePerformanceCycleDto } from "../dto/create-performance-cycle.dto";
import { SubmitReviewDto } from "../dto/submit-review.dto";
import { CreateCaseDto } from "../dto/create-case.dto";
import { CreateContractDto } from "../dto/create-contract.dto";

@Injectable()
export class HRMockRepository extends IHRRepository {
  private employees: Employee[] = [];
  private candidates: Candidate[] = [];
  private positions: Position[] = [];
  private compensations: Compensation[] = [];
  private departments: Department[] = [];
  private interviews: Interview[] = [];
  private leads: TalentLead[] = [];
  private documents: ComplianceDocument[] = [];
  private scenarios: BudgetScenario[] = [];
  private plans: HeadcountPlan[] = [];
  private rates: ExchangeRate[] = [];
  private runs: PayrollRun[] = [];
  private lines: PayrollLine[] = [];
  private successionPlans: SuccessionPlan[] = [];
  private successionCandidates: SuccessionCandidate[] = [];
  private skills: Skill[] = [];
  private employeeSkills: EmployeeSkill[] = [];
  private benefitPlans: BenefitPlan[] = [];
  private employeeBenefits: EmployeeBenefit[] = [];
  private careerPaths: CareerPath[] = [];
  private mentorshipPairs: MentorshipPair[] = [];
  private positionSkills: PositionSkill[] = [];
  private performanceReviews: PerformanceReview[] = [];
  private performanceGoals: PerformanceGoal[] = [];
  private trainingPrograms: TrainingProgram[] = [];
  private trainingAssignments: TrainingAssignment[] = [];
  private programSkills: ProgramSkill[] = [];
  private attendance: Attendance[] = [];
  private requisitions: JobRequisition[] = [];
  private cases: HRCase[] = [];
  private contracts: Contract[] = [];
  private performanceCycles: PerformanceCycle[] = [];
  private leaveRequests: LeaveRequest[] = [];
  private payrolls: Payroll[] = [];

  // Get By ID Methods
  async getEmployeeById(tenant_id: string, employee_id: string): Promise<Employee | null> {
    return this.employees.find((e) => e.id === employee_id && e.tenant_id === tenant_id) || null;
  }
  async getGlobalEmployeeById(employee_id: string): Promise<Employee | null> { return this.employees.find((e) => e.id === employee_id) || null; }
  async getRequisitionById(tenant_id: string, id: string): Promise<JobRequisition | null> {
    return this.requisitions.find((r) => r.id === id && r.tenant_id === tenant_id) || null;
  }
  async getContractById(tenant_id: string, id: string): Promise<Contract | null> {
    return this.contracts.find((c) => c.id === id && c.tenant_id === tenant_id) || null;
  }
  async getTrainingAssignmentById(tenant_id: string, id: string): Promise<any | null> {
    return this.trainingAssignments.find((a) => a.id === id && a.tenant_id === tenant_id) || null;
  }
  async getLeaveRequestById(tenant_id: string, id: string): Promise<LeaveRequest | null> {
    return this.leaveRequests.find((r) => r.id === id && r.tenant_id === tenant_id) || null;
  }
  async getDepartmentById(tenant_id: string, department_id: string): Promise<Department | null> {
    return this.departments.find((d) => d.id === department_id && d.tenant_id === tenant_id) || null;
  }
  async getPerformanceCycleById(tenant_id: string, id: string): Promise<PerformanceCycle | null> {
    return this.performanceCycles.find((c) => c.id === id && c.tenant_id === tenant_id) || null;
  }
  async getCaseById(tenant_id: string, id: string): Promise<HRCase | null> {
    return this.cases.find((c) => c.id === id && c.tenant_id === tenant_id) || null;
  }
  async getCandidateById(tenant_id: string, id: string): Promise<Candidate | null> {
    return this.candidates.find((c) => c.id === id && c.tenant_id === tenant_id) || null;
  }
  async getPositionById(tenant_id: string, id: string): Promise<Position | null> {
    return this.positions.find((p) => p.id === id && p.tenant_id === tenant_id) || null;
  }
  async getInterviewById(tenant_id: string, id: string): Promise<Interview | null> {
    return this.interviews.find((i) => i.id === id && i.tenant_id === tenant_id) || null;
  }
  async getTalentLeadById(tenant_id: string, id: string): Promise<TalentLead | null> {
    return this.leads.find((l) => l.id === id && l.tenant_id === tenant_id) || null;
  }
  async getGoalById(tenant_id: string, id: string): Promise<PerformanceGoal | null> {
    return this.performanceGoals.find((g) => g.id === id && g.tenant_id === tenant_id) || null;
  }
  async getTrainingProgramById(tenant_id: string, id: string): Promise<TrainingProgram | null> {
    return this.trainingPrograms.find((p) => p.id === id && p.tenant_id === tenant_id) || null;
  }

  // Employee Management
  // Employee Management
  async getEmployees(tenant_id: string, location_id?: string, page: number = 1, limit: number = 20): Promise<{ data: Employee[]; total: number }> {
    const filtered = this.employees.filter((e) => e.tenant_id === tenant_id && (!location_id || e.location_id === location_id));
    return { data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
  }
  async getGlobalEmployees(location_id?: string, page: number = 1, limit: number = 20): Promise<{ data: Employee[]; total: number }> {
    const filtered = this.employees.filter((e) => !location_id || e.location_id === location_id);
    return { data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
  }
  async createEmployee(tenant_id: string, data: CreateEmployeeDto, tx?: Prisma.TransactionClient): Promise<Employee> {
    const employee: Employee = { 
      id: `emp-${Date.now()}`, 
      tenant_id, 
      ...data, 
      full_name: `${data.first_name} ${data.last_name}`, 
      status: "active", 
      employee_code: `EMP-${Date.now()}`,
      hire_date: new Date(),
      employment_type: "full_time",
      position: (data as any).position || "Staff",
      department_id: data.department_id || "DEPT-001",
      role_title: (data as any).role_title || "Staff",
      created_at: new Date(), 
      updated_at: new Date() 
    } as any;
    this.employees.push(employee); return employee;
  }
  async updateEmployee(tenant_id: string, employee_id: string, data: UpdateEmployeeDto, tx?: Prisma.TransactionClient): Promise<Employee> {
    const idx = this.employees.findIndex((e) => e.id === employee_id && e.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Employee not found");
    this.employees[idx] = { ...this.employees[idx], ...data, updated_at: new Date() } as any; return this.employees[idx];
  }
  async deactivateEmployee(tenant_id: string, employee_id: string, tx?: Prisma.TransactionClient): Promise<Employee> {
    const idx = this.employees.findIndex((e) => e.id === employee_id && e.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Employee not found");
    this.employees[idx].status = "terminated"; return this.employees[idx];
  }
  async promoteEmployee(tenant_id: string, employee_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Employee> {
    const idx = this.employees.findIndex((e) => e.id === employee_id && e.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Employee not found");
    this.employees[idx] = { ...this.employees[idx], position: data.newRole, role_title: data.newRoleTitle || this.employees[idx].role_title, updated_at: new Date() };
    return this.employees[idx];
  }
  async transferEmployee(tenant_id: string, employee_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Employee> {
    const idx = this.employees.findIndex((e) => e.id === employee_id && e.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Employee not found");
    this.employees[idx] = { ...this.employees[idx], department_id: data.targetDepartment || this.employees[idx].department_id, location_id: data.targetLocation || this.employees[idx].location_id, updated_at: new Date() };
    return this.employees[idx];
  }
  async suspendEmployee(tenant_id: string, employee_id: string, reason: string, tx?: Prisma.TransactionClient): Promise<Employee> {
    const idx = this.employees.findIndex((e) => e.id === employee_id && e.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Employee not found");
    this.employees[idx].status = "suspended"; return this.employees[idx];
  }

  // Attendance & Shifts
  // Attendance & Shifts
  async getAttendance(tenant_id: string, location_id?: string, employee_id?: string, start_date?: string, end_date?: string, page: number = 1, limit: number = 50): Promise<{ data: Attendance[]; total: number }> {
    const filtered = this.attendance.filter((a) => a.tenant_id === tenant_id && (!location_id || a.location_id === location_id) && (!employee_id || a.employee_id === employee_id));
    return { data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
  }
  async getGlobalAttendance(employee_id?: string, start_date?: string, end_date?: string, page: number = 1, limit: number = 50): Promise<{ data: Attendance[]; total: number }> {
    const filtered = this.attendance.filter((a) => !employee_id || a.employee_id === employee_id);
    return { data: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
  }
  async clock_in(tenant_id: string, employee_id: string, location_id: string, shift_id?: string, method?: string, metadata?: any, tx?: Prisma.TransactionClient): Promise<Attendance> {
    const a: Attendance = { id: `att-${Date.now()}`, tenant_id, employee_id, location_id, clock_in: new Date(), status: "present", date: new Date(), created_at: new Date(), updated_at: new Date() } as any;
    this.attendance.push(a); return a;
  }
  async clock_out(tenant_id: string, employee_id: string, tx?: Prisma.TransactionClient): Promise<Attendance> {
    const att = this.attendance.find((a) => a.employee_id === employee_id && a.tenant_id === tenant_id && !a.clock_out);
    if (!att) throw new Error("No active clock-in found"); att.clock_out = new Date(); return att;
  }
  async assignShift(tenant_id: string, employee_id: string, shift_id: string, location_id: string, date: string, tx?: Prisma.TransactionClient): Promise<void> { return; }

  // Global Scheduling
  async getWorkSchedules(tenant_id: string, location_id?: string, status?: string): Promise<any[]> { return []; }
  async createWorkSchedule(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<any> { return { id: `sch-${Date.now()}`, ...data }; }
  async updateWorkSchedule(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<any> { return { id, ...data }; }
  async getWorkShifts(tenant_id: string, scheduleId?: string, employee_id?: string): Promise<any[]> { return []; }
  async createWorkShift(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<any> { return { id: `shf-${Date.now()}`, ...data }; }
  async updateWorkShift(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<any> { return { id, ...data }; }
  async approveWorkSchedule(tenant_id: string, id: string, approved_by: string, tx?: Prisma.TransactionClient): Promise<any> { return { id, status: "APPROVED" }; }

  // Leave Management
  async getLeaveRequests(tenant_id: string, location_id?: string, status?: string, employee_id?: string): Promise<LeaveRequest[]> { return this.leaveRequests.filter((r) => r.tenant_id === tenant_id && (!status || r.status === status) && (!employee_id || r.employee_id === employee_id)); }
  async getGlobalLeaveRequests(status?: string, employee_id?: string): Promise<LeaveRequest[]> { return this.leaveRequests.filter((r) => (!status || r.status === status) && (!employee_id || r.employee_id === employee_id)); }
  async createLeaveRequest(tenant_id: string, data: CreateLeaveRequestDto, tx?: Prisma.TransactionClient): Promise<LeaveRequest> {
    const r: LeaveRequest = { id: `lv-${Date.now()}`, tenant_id, ...data, status: "pending", requested_at: new Date(), start_date: new Date(data.start_date), end_date: new Date(data.end_date), created_at: new Date(), updated_at: new Date() } as any;
    this.leaveRequests.push(r); return r;
  }
  async approveLeaveRequest(tenant_id: string, id: string, revId: string, n?: string, tx?: Prisma.TransactionClient): Promise<LeaveRequest> {
    const r = this.leaveRequests.find((r) => r.id === id && r.tenant_id === tenant_id);
    if (!r) throw new Error("Not found"); r.status = "approved"; (r as any).reviewed_by = revId; r.reviewed_at = new Date(); r.updated_at = new Date(); return r;
  }
  async rejectLeaveRequest(tenant_id: string, id: string, revId: string, n: string, tx?: Prisma.TransactionClient): Promise<LeaveRequest> {
    const r = this.leaveRequests.find((r) => r.id === id && r.tenant_id === tenant_id);
    if (!r) throw new Error("Not found"); r.status = "rejected"; (r as any).reviewed_by = revId; r.reviewed_at = new Date(); r.updated_at = new Date(); return r;
  }

  // Payroll Management
  async getPayroll(t: string, l?: string, e?: string, p?: string): Promise<Payroll[]> { return this.payrolls.filter((pa) => pa.tenant_id === t && (!e || pa.employee_id === e) && (!p || pa.period === p)); }
  async getGlobalPayroll(e: string, p?: string): Promise<Payroll[]> { return this.payrolls.filter((pa) => pa.employee_id === e && (!p || pa.period === p)); }
  async calculatePayroll(tenant_id: string, employee_id: string, period: string, tx?: Prisma.TransactionClient): Promise<Payroll> {
    const pa: Payroll = { id: `pay-${Date.now()}`, tenant_id, employee_id, period, grossPay: 5000, netPay: 4000, status: "draft", base_salary: 5000, created_at: new Date(), updated_at: new Date() } as any;
    this.payrolls.push(pa); return pa;
  }
  async getPayrollRuns(tenant_id: string): Promise<PayrollRun[]> { return this.runs.filter(r => r.tenant_id === tenant_id); }
  async getPayrollLines(tenant_id: string, runId: string): Promise<PayrollLine[]> { return this.lines.filter(l => l.payrollRunId === runId); }

  // Organization Management
  async getLocations(tenant_id: string): Promise<any[]> { return []; }
  async getDepartments(tenant_id: string): Promise<Department[]> { return this.departments.filter((d) => d.tenant_id === tenant_id); }
  async getGlobalDepartments(): Promise<Department[]> { return this.departments; }
  async createDepartment(tenant_id: string, data: CreateDepartmentDto, tx?: Prisma.TransactionClient): Promise<Department> {
    const d: Department = { id: `dept-${Date.now()}`, tenant_id, ...data, status: "active", created_at: new Date(), updated_at: new Date() };
    this.departments.push(d); return d;
  }

  // Recruitment & Talent
  async getRequisitions(t: string, s?: string): Promise<JobRequisition[]> { return this.requisitions.filter((r) => r.tenant_id === t && (!s || r.status === s)); }
  async getGlobalRequisitions(s?: string): Promise<JobRequisition[]> { return this.requisitions.filter((r) => (!s || r.status === s)); }
  async createRequisition(t: string, data: CreateRequisitionDto, tx?: Prisma.TransactionClient): Promise<JobRequisition> {
    const r: JobRequisition = { id: `req-${Date.now()}`, tenant_id: t, ...data, status: "open", created_at: new Date(), updated_at: new Date() };
    this.requisitions.push(r); return r;
  }
  async updateRequisition(t: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<JobRequisition> {
    const idx = this.requisitions.findIndex((r) => r.id === id && r.tenant_id === t);
    if (idx === -1) throw new Error("Not found");
    this.requisitions[idx] = { ...this.requisitions[idx], ...data, updated_at: new Date() }; return this.requisitions[idx];
  }
  async getCandidates(t: string, s?: string): Promise<Candidate[]> { return this.candidates.filter((c) => c.tenant_id === t && (!s || c.status === s)); }
  async createCandidate(tenant_id: string, data: any, tx?: Prisma.TransactionClient): Promise<Candidate> {
    const c: Candidate = { id: `cand-${Date.now()}`, tenant_id, ...data, status: "applied", created_at: new Date(), updated_at: new Date() };
    this.candidates.push(c); return c;
  }
  async updateCandidate(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<Candidate> {
    const idx = this.candidates.findIndex((c) => c.id === id && c.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Not found");
    this.candidates[idx] = { ...this.candidates[idx], ...data, updated_at: new Date() }; return this.candidates[idx];
  }
  async hireCandidate(tenant_id: string, candidateId: string, data: any, tx?: Prisma.TransactionClient): Promise<Employee> {
    const c = this.candidates.find((c) => c.id === candidateId && c.tenant_id === tenant_id);
    if (!c) throw new Error("Not found");
    return this.createEmployee(tenant_id, { first_name: c.first_name, last_name: c.last_name, email: c.email, role: "employee", department_id: "new" } as any, tx);
  }
  async getTalentLeads(t: string, s?: string): Promise<TalentLead[]> { return this.leads.filter((l) => l.tenant_id === t && (!s || l.status === s)); }
  async createTalentLead(t: string, data: any): Promise<TalentLead> {
    const l: TalentLead = { id: `lead-${Date.now()}`, tenant_id: t, ...data, status: "new", created_at: new Date(), updated_at: new Date() };
    this.leads.push(l); return l;
  }
  async updateTalentLead(t: string, id: string, data: any): Promise<TalentLead> {
    const idx = this.leads.findIndex((l) => l.id === id && l.tenant_id === t);
    if (idx === -1) throw new Error("Not found");
    this.leads[idx] = { ...this.leads[idx], ...data, updated_at: new Date() }; return this.leads[idx];
  }
  async getInterviews(t: string, cid?: string): Promise<Interview[]> { return this.interviews.filter((i) => i.tenant_id === t && (!cid || i.candidateId === cid)); }
  async scheduleInterview(t: string, data: any, tx?: Prisma.TransactionClient): Promise<Interview> {
    const i: Interview = { id: `int-${Date.now()}`, tenant_id: t, ...data, status: "scheduled", created_at: new Date(), updated_at: new Date() };
    this.interviews.push(i); return i;
  }
  async updateInterviewStatus(t: string, id: string, s: string, tx?: Prisma.TransactionClient): Promise<Interview> {
    const i = this.interviews.find((i) => i.id === id && i.tenant_id === t);
    if (!i) throw new Error("Not found"); i.status = s as any; return i;
  }

  // Headcount & Compensation
  async getPositions(t: string, d?: string): Promise<Position[]> { return this.positions.filter((p) => p.tenant_id === t && (!d || p.department_id === d)); }
  async createPosition(t: string, data: any, tx?: Prisma.TransactionClient): Promise<Position> {
    const p: Position = { id: `pos-${Date.now()}`, tenant_id: t, ...data, status: "open", created_at: new Date(), updated_at: new Date() };
    this.positions.push(p); return p;
  }
  async updatePosition(t: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<Position> {
    const idx = this.positions.findIndex((p) => p.id === id && p.tenant_id === t);
    if (idx === -1) throw new Error("Not found");
    this.positions[idx] = { ...this.positions[idx], ...data, updated_at: new Date() }; return this.positions[idx];
  }
  async getCompensation(t: string, eid: string): Promise<Compensation | null> { return this.compensations.find((c) => c.employee_id === eid && c.tenant_id === t) || null; }
  async updateCompensation(t: string, eid: string, data: any, tx?: Prisma.TransactionClient): Promise<Compensation> {
    const idx = this.compensations.findIndex((c) => c.employee_id === eid && c.tenant_id === t);
    if (idx !== -1) { this.compensations[idx] = { ...this.compensations[idx], ...data, updated_at: new Date() }; return this.compensations[idx]; }
    const c: Compensation = { id: `comp-${Date.now()}`, tenant_id: t, employee_id: eid, ...data, created_at: new Date(), updated_at: new Date() };
    this.compensations.push(c); return c;
  }

  // Performance Management
  async getPerformanceCycles(t: string): Promise<PerformanceCycle[]> { return this.performanceCycles.filter((c) => c.tenant_id === t); }
  async createPerformanceCycle(tenant_id: string, data: CreatePerformanceCycleDto): Promise<PerformanceCycle> {
    const c: PerformanceCycle = { id: `pc-${Date.now()}`, tenant_id, ...data, status: "active", created_at: new Date(), updated_at: new Date(), start_date: new Date(data.start_date), end_date: new Date(data.end_date), dueDate: new Date(data.dueDate) } as any;
    this.performanceCycles.push(c); return c;
  }
  async updatePerformanceCycle(tenant_id: string, id: string, data: any): Promise<PerformanceCycle> {
    const idx = this.performanceCycles.findIndex((c) => c.id === id && c.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Not found");
    this.performanceCycles[idx] = { ...this.performanceCycles[idx], ...data, updated_at: new Date() }; return this.performanceCycles[idx];
  }
  async getPerformanceReviews(t: string, cid?: string, eid?: string): Promise<PerformanceReview[]> { return this.performanceReviews.filter((r) => r.tenant_id === t && (!cid || r.cycleId === cid) && (!eid || r.employee_id === eid)); }
  async getGlobalPerformanceReviews(cid?: string, eid?: string): Promise<PerformanceReview[]> { return this.performanceReviews.filter((r) => (!cid || r.cycleId === cid) && (!eid || r.employee_id === eid)); }
  async submitPerformanceReview(tenant_id: string, data: SubmitReviewDto, tx?: Prisma.TransactionClient): Promise<PerformanceReview> {
    const r: PerformanceReview = { id: `pr-${Date.now()}`, tenant_id, ...data, status: "submitted", submittedAt: new Date(), created_at: new Date(), updated_at: new Date() } as any;
    this.performanceReviews.push(r); return r;
  }
  async getEmployeePerformanceHistory(t: string, eid: string): Promise<PerformanceReview[]> { return this.performanceReviews.filter((r) => r.employee_id === eid && r.tenant_id === t); }
  async getEmployeeGoals(t: string, eid: string): Promise<PerformanceGoal[]> { return this.performanceGoals.filter((g) => g.employee_id === eid && g.tenant_id === t); }
  async updatePerformanceGoal(tenant_id: string, data: any): Promise<PerformanceGoal> {
    const idx = this.performanceGoals.findIndex((g) => g.id === data.id && g.tenant_id === tenant_id);
    if (idx !== -1) { this.performanceGoals[idx] = { ...this.performanceGoals[idx], ...data, updated_at: new Date() }; return this.performanceGoals[idx]; }
    const g: PerformanceGoal = { id: `goal-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() } as any;
    this.performanceGoals.push(g); return g;
  }
  async updatePerformanceGoalStatus(tenant_id: string, id: string, status: string): Promise<PerformanceGoal> {
    const goal = this.performanceGoals.find(g => g.id === id && g.tenant_id === tenant_id);
    if (!goal) throw new Error("Goal not found"); goal.status = status as any; goal.updated_at = new Date(); return goal;
  }

  // Case Management
  async getCases(t: string, lid?: string, s?: string, eid?: string): Promise<HRCase[]> { return this.cases.filter((c) => c.tenant_id === t && (!s || c.status === s) && (!eid || c.employee_id === eid)); }
  async createCase(tenant_id: string, data: CreateCaseDto, tx?: Prisma.TransactionClient): Promise<HRCase> {
    const c: HRCase = { id: `case-${Date.now()}`, tenant_id, ...data, status: "open", priority: data.priority || "medium", created_at: new Date(), updated_at: new Date() } as any;
    this.cases.push(c); return c;
  }
  async updateCase(tenant_id: string, id: string, data: any, tx?: Prisma.TransactionClient): Promise<HRCase> {
    const idx = this.cases.findIndex((c) => c.id === id && c.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Not found");
    this.cases[idx] = { ...this.cases[idx], ...data, updated_at: new Date() }; return this.cases[idx];
  }

  // Contract Management
  async getContracts(t: string, lid?: string, eid?: string): Promise<Contract[]> { return this.contracts.filter((c) => c.tenant_id === t && (!eid || c.employee_id === eid)); }
  async getGlobalContracts(eid?: string): Promise<Contract[]> { return this.contracts.filter((c) => !eid || c.employee_id === eid); }
  async createContract(tenant_id: string, data: CreateContractDto): Promise<Contract> {
    const c: Contract = { id: `ctr-${Date.now()}`, tenant_id, ...data, status: "active", start_date: new Date(data.start_date), end_date: data.end_date ? new Date(data.end_date) : undefined, created_at: new Date(), updated_at: new Date() } as any;
    this.contracts.push(c); return c;
  }
  async updateContract(tenant_id: string, id: string, data: any): Promise<Contract> {
    const idx = this.contracts.findIndex((c) => c.id === id && c.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Not found");
    this.contracts[idx] = { ...this.contracts[idx], ...data, updated_at: new Date() }; return this.contracts[idx];
  }

  // Skills & Training
  async getSkills(tenant_id: string, category?: string): Promise<Skill[]> { return this.skills.filter((s) => s.tenant_id === tenant_id && (!category || (s as any).category === category)); }
  async createSkill(tenant_id: string, data: any): Promise<Skill> {
    const sk: Skill = { id: `sk-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.skills.push(sk); return sk;
  }
  async getEmployeeSkills(tenant_id: string, empId: string): Promise<EmployeeSkill[]> { return this.employeeSkills.filter((s) => s.employee_id === empId && s.tenant_id === tenant_id); }
  async addEmployeeSkill(tenant_id: string, data: any): Promise<EmployeeSkill> {
    const es: EmployeeSkill = { id: `es-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.employeeSkills.push(es); return es;
  }
  async updateEmployeeSkill(t: string, data: any): Promise<EmployeeSkill> {
    const idx = this.employeeSkills.findIndex((es) => es.employee_id === data.employee_id && es.skill_id === data.skill_id && es.tenant_id === t);
    if (idx !== -1) { this.employeeSkills[idx] = { ...this.employeeSkills[idx], ...data, updated_at: new Date() }; return this.employeeSkills[idx]; }
    return this.addEmployeeSkill(t, data);
  }
  async findTalentBySkills(t: string, ids: string[], limit: number = 20): Promise<any[]> { return []; }
  async findReplacementCandidates(tenant_id: string, position_id: string): Promise<any[]> { return []; }
  async getPositionSkills(tenant_id: string, position_id: string): Promise<PositionSkill[]> { return this.positionSkills.filter(ps => ps.position_id === position_id); }
  async updatePositionSkill(tenant_id: string, data: any): Promise<PositionSkill> {
    const ps: PositionSkill = { id: `ps-${Date.now()}`, ...data, created_at: new Date(), updated_at: new Date() };
    this.positionSkills.push(ps); return ps;
  }
  async getTrainingProgramsBySkills(tenant_id: string, skillIds: string[]): Promise<TrainingProgram[]> { return []; }
  async getEmployeeTrainingHistory(t: string, id: string): Promise<TrainingAssignment[]> { return this.trainingAssignments.filter((a) => a.employee_id === id && a.tenant_id === t); }
  async enrollInTrainingProgram(t: string, eid: string, pid: string): Promise<TrainingAssignment> {
    const a: TrainingAssignment = { id: `ta-${Date.now()}`, tenant_id: t, employee_id: eid, programId: pid, status: "enrolled", assignedAt: new Date(), created_at: new Date(), updated_at: new Date() };
    this.trainingAssignments.push(a); return a;
  }
  async getTrainingPrograms(tenant_id: string): Promise<any[]> { return this.trainingPrograms.filter(p => p.tenant_id === tenant_id); }
  async createTrainingProgram(tenant_id: string, data: any): Promise<any> {
    const p: TrainingProgram = { id: `tp-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.trainingPrograms.push(p); return p;
  }
  async getTrainingAssignments(tenant_id: string): Promise<any[]> { return this.trainingAssignments.filter(a => a.tenant_id === tenant_id); }
  async createTrainingAssignment(tenant_id: string, data: any): Promise<any> {
    const a: TrainingAssignment = { id: `ta-${Date.now()}`, tenant_id, ...data, status: "assigned", assignedAt: new Date(), created_at: new Date(), updated_at: new Date() };
    this.trainingAssignments.push(a); return a;
  }
  async updateTrainingAssignment(tenant_id: string, id: string, data: any): Promise<any> {
    const idx = this.trainingAssignments.findIndex((a) => a.id === id && a.tenant_id === tenant_id);
    if (idx === -1) throw new Error("Assignment not found");
    this.trainingAssignments[idx] = { ...this.trainingAssignments[idx], ...data, updated_at: new Date() };
    return this.trainingAssignments[idx];
  }

  // Benefits & Career
  async getBenefitPlans(tenant_id: string): Promise<BenefitPlan[]> { return this.benefitPlans.filter((p) => p.tenant_id === tenant_id); }
  async createBenefitPlan(tenant_id: string, data: any): Promise<BenefitPlan> {
    const p: BenefitPlan = { id: `bp-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.benefitPlans.push(p); return p;
  }
  async getEmployeeBenefits(tenant_id: string, empId: string): Promise<EmployeeBenefit[]> { return this.employeeBenefits.filter((b) => b.employee_id === empId && b.tenant_id === tenant_id); }
  async enrollInBenefit(tenant_id: string, data: any): Promise<EmployeeBenefit> {
    const b: EmployeeBenefit = { id: `eb-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.employeeBenefits.push(b); return b;
  }
  async getCareerPaths(tenant_id: string): Promise<CareerPath[]> { return this.careerPaths.filter((p) => p.tenant_id === tenant_id); }
  async createCareerPath(tenant_id: string, data: any): Promise<CareerPath> {
    const p: CareerPath = { id: `cp-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.careerPaths.push(p); return p;
  }
  async getMentorshipPairs(tenant_id: string, empId: string): Promise<MentorshipPair[]> { return this.mentorshipPairs.filter((p) => (p.mentorId === empId || p.menteeId === empId) && p.tenant_id === tenant_id); }
  async createMentorshipPair(tenant_id: string, data: any): Promise<MentorshipPair> {
    const m: MentorshipPair = { id: `mp-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.mentorshipPairs.push(m); return m;
  }

  // Compliance
  async getComplianceDocuments(t: string, empId?: string): Promise<ComplianceDocument[]> { return this.documents.filter((d) => d.tenant_id === t && (!empId || d.employee_id === empId)); }
  async uploadComplianceDocument(tenant_id: string, data: any): Promise<ComplianceDocument> {
    const doc: ComplianceDocument = { id: `doc-${Date.now()}`, tenant_id, ...data, verification_status: "pending", created_at: new Date(), updated_at: new Date() };
    this.documents.push(doc); return doc;
  }
  async getGlobalComplianceStatus(tenant_id: string, status?: string): Promise<any> {
    const docs = this.documents.filter((d) => d.tenant_id === tenant_id && (!status || d.verification_status === status));
    return { total: docs.length, verified: docs.filter(d => d.verification_status === "verified").length };
  }
  async verifyDocument(tenant_id: string, id: string, by: string, status: string): Promise<ComplianceDocument> {
    const doc = this.documents.find(d => d.id === id && d.tenant_id === tenant_id);
    if (!doc) throw new Error("Not found"); doc.verification_status = status as any; (doc as any).verified_by = by; doc.updated_at = new Date(); return doc;
  }
  async getComplianceModules(tenant_id: string): Promise<any[]> { return []; }
  async enableComplianceModule(tenant_id: string, key: string, config?: any): Promise<any> { return {}; }
  async getComplianceReports(tenant_id: string): Promise<any[]> { return []; }
  async createComplianceReport(tenant_id: string, data: any): Promise<any> { return {}; }

  // Strategic Workforce & Succession
  async getBudgetScenarios(tenant_id: string): Promise<BudgetScenario[]> { return this.scenarios.filter((s) => s.tenant_id === tenant_id); }
  async createBudgetScenario(tenant_id: string, data: any): Promise<BudgetScenario> {
    const s: BudgetScenario = { id: `bc-${Date.now()}`, tenant_id, ...data, status: "DRAFT", created_at: new Date(), updated_at: new Date() };
    this.scenarios.push(s); return s;
  }
  async getHeadcountPlans(tenant_id: string, scenario_id: string): Promise<HeadcountPlan[]> { return this.plans.filter((p) => p.scenario_id === scenario_id && p.tenant_id === tenant_id); }
  async updateHeadcountPlan(t: string, id: string, data: any): Promise<HeadcountPlan> {
    const idx = this.plans.findIndex((p) => p.id === id && p.tenant_id === t);
    if (idx === -1) throw new Error("Not found");
    this.plans[idx] = { ...this.plans[idx], ...data, updated_at: new Date() }; return this.plans[idx];
  }
  async getExchangeRates(tenant_id: string): Promise<ExchangeRate[]> { return this.rates.filter(r => r.tenant_id === tenant_id); }
  async getSuccessionPlans(tenant_id: string): Promise<SuccessionPlan[]> { return this.successionPlans.filter((p) => p.tenant_id === tenant_id); }
  async getSuccessionPlan(t: string, pid: string): Promise<SuccessionPlan | null> {
    const p = this.successionPlans.find(p => p.position_id === pid && p.tenant_id === t);
    if (!p) return null; return { ...p, candidates: this.successionCandidates.filter(c => c.planId === p.id) };
  }
  async createSuccessionPlan(tenant_id: string, data: any): Promise<SuccessionPlan> {
    const p: SuccessionPlan = { id: `sp-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.successionPlans.push(p); return p;
  }
  async addSuccessionCandidate(tenant_id: string, data: any): Promise<SuccessionCandidate> {
    const sc: SuccessionCandidate = { id: `sc-${Date.now()}`, tenant_id, ...data, created_at: new Date(), updated_at: new Date() };
    this.successionCandidates.push(sc); return sc;
  }
  async getBenchStrength(t: string, d?: string): Promise<any> { return { department_id: d, criticalRoles: 0, benchStrengthScore: 0, readinessCounts: {} }; }

  // Analytics & Reporting
  async getDepartmentBudgetData(t: string, id: string): Promise<any> { return {}; }
  async getActualLaborCostHistory(t: string, id: string, l: number): Promise<any[]> { return []; }
  async getHolidays(tenant_id: string): Promise<any[]> { return []; }
  async createHoliday(tenant_id: string, data: any): Promise<any> { return {}; }
  async getHeadcountTrend(tenant_id: string): Promise<any[]> { return []; }
  async getExperienceRate(tenant_id: string): Promise<any> { return { rate: 0 }; }
  async getTurnoverStats(tenant_id: string): Promise<any> { return {}; }
  async getDepartmentAnalytics(tenant_id: string): Promise<any[]> { return []; }
  async getCompensationAnalytics(tenant_id: string): Promise<any> { return {}; }
  async getRetentionRiskData(tenant_id: string): Promise<any[]> { return []; }
  async getEngagementMetrics(tenant_id: string): Promise<any> { return {}; }

  // Miscellaneous
  async updatePositionJobPost(tenant_id: string, position_id: string, data: any): Promise<any> { return {}; }
  async getPositionJobPost(tenant_id: string, position_id: string): Promise<any> { return {}; }
  async executePayrollTransaction(tenant_id: string, period: string, activeEmployees: any[], tx?: Prisma.TransactionClient): Promise<any> {
    const totalNetPay = activeEmployees.length * 4000;
    const run = { 
      id: `run-${Date.now()}`, 
      tenant_id, 
      name: period, 
      status: 'PROCESSED', 
      totalNetPay, 
      totalGrossPay: totalNetPay * 1.2, 
      period_start: new Date(),
      period_end: new Date(),
      created_at: new Date() 
    };
    this.runs.push(run as any);
    return run;
  }
}
