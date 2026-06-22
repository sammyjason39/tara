import { describe, it, expect } from "vitest";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  createDepartmentSchema,
  createLeaveRequestSchema,
  createAttendanceSchema,
  createPayrollRunSchema,
  payrollAdjustmentSchema,
  assignTrainingSchema,
  createPerformanceReviewSchema,
  createWorkflowRequestSchema,
  transferEmployeeSchema,
  promoteEmployeeSchema,
  suspendEmployeeSchema,
  terminateEmployeeSchema,
  createRequisitionSchema,
  createCaseSchema,
  createContractSchema,
} from "./index";

describe("HR Zod Schemas", () => {
  describe("createEmployeeSchema", () => {
    it("accepts valid employee data", () => {
      const result = createEmployeeSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+1234567890",
        departmentId: "dept-eng",
        locationId: "loc-hq",
        roleTitle: "Software Engineer",
        status: "active",
        employmentType: "full_time",
        baseSalary: 50000,
        hireDate: "2024-01-15",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty first name", () => {
      const result = createEmployeeSchema.safeParse({
        firstName: "",
        lastName: "Doe",
        email: "john@example.com",
        departmentId: "dept-eng",
        roleTitle: "Engineer",
        hireDate: "2024-01-15",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors.firstName).toBeDefined();
      }
    });

    it("rejects invalid email", () => {
      const result = createEmployeeSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "not-an-email",
        departmentId: "dept-eng",
        roleTitle: "Engineer",
        hireDate: "2024-01-15",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors.email).toBeDefined();
      }
    });

    it("rejects missing department", () => {
      const result = createEmployeeSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        departmentId: "",
        roleTitle: "Engineer",
        hireDate: "2024-01-15",
      });
      expect(result.success).toBe(false);
    });

    it("coerces salary from string to number", () => {
      const result = createEmployeeSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        departmentId: "dept-eng",
        roleTitle: "Engineer",
        baseSalary: "50000",
        hireDate: "2024-01-15",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.baseSalary).toBe(50000);
      }
    });
  });

  describe("createDepartmentSchema", () => {
    it("accepts valid department data", () => {
      const result = createDepartmentSchema.safeParse({
        name: "Engineering",
        code: "ENG",
        description: "Software engineering department",
        status: "active",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createDepartmentSchema.safeParse({
        name: "",
        code: "ENG",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty code", () => {
      const result = createDepartmentSchema.safeParse({
        name: "Engineering",
        code: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createLeaveRequestSchema", () => {
    it("accepts valid leave request", () => {
      const result = createLeaveRequestSchema.safeParse({
        employeeId: "emp-1",
        type: "annual",
        startDate: "2024-06-01",
        endDate: "2024-06-05",
        reason: "Annual vacation",
      });
      expect(result.success).toBe(true);
    });

    it("rejects end date before start date", () => {
      const result = createLeaveRequestSchema.safeParse({
        employeeId: "emp-1",
        type: "annual",
        startDate: "2024-06-05",
        endDate: "2024-06-01",
        reason: "Annual vacation",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing reason", () => {
      const result = createLeaveRequestSchema.safeParse({
        employeeId: "emp-1",
        type: "sick",
        startDate: "2024-06-01",
        endDate: "2024-06-02",
        reason: "",
      });
      expect(result.success).toBe(false);
    });

    it("validates leave type enum", () => {
      const result = createLeaveRequestSchema.safeParse({
        employeeId: "emp-1",
        type: "invalid_type",
        startDate: "2024-06-01",
        endDate: "2024-06-02",
        reason: "Test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createAttendanceSchema", () => {
    it("accepts valid attendance data", () => {
      const result = createAttendanceSchema.safeParse({
        employeeId: "emp-1",
        date: "2024-06-01",
        checkIn: "09:00",
        checkOut: "17:00",
        status: "present",
        notes: "",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing check-in", () => {
      const result = createAttendanceSchema.safeParse({
        employeeId: "emp-1",
        date: "2024-06-01",
        checkIn: "",
        status: "present",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createPayrollRunSchema", () => {
    it("accepts valid payroll run", () => {
      const result = createPayrollRunSchema.safeParse({
        periodStart: "2024-02-01",
        periodEnd: "2024-02-15",
        notes: "February first half",
      });
      expect(result.success).toBe(true);
    });

    it("rejects end before start", () => {
      const result = createPayrollRunSchema.safeParse({
        periodStart: "2024-02-15",
        periodEnd: "2024-02-01",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("payrollAdjustmentSchema", () => {
    it("accepts valid adjustment", () => {
      const result = payrollAdjustmentSchema.safeParse({
        employeeId: "emp-1",
        period: "2024-02",
        baseSalary: 5000000,
        allowances: 500000,
        deductions: 200000,
        notes: "Monthly adjustment",
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative base salary", () => {
      const result = payrollAdjustmentSchema.safeParse({
        employeeId: "emp-1",
        period: "2024-02",
        baseSalary: -100,
        allowances: 0,
        deductions: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("transferEmployeeSchema", () => {
    it("accepts valid transfer", () => {
      const result = transferEmployeeSchema.safeParse({
        employeeId: "emp-1",
        targetDepartment: "dept-sales",
        targetLocation: "loc-branch",
        reason: "Restructuring",
        effectiveDate: "2024-03-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing reason", () => {
      const result = transferEmployeeSchema.safeParse({
        employeeId: "emp-1",
        targetDepartment: "dept-sales",
        reason: "",
        effectiveDate: "2024-03-01",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("promoteEmployeeSchema", () => {
    it("accepts valid promotion", () => {
      const result = promoteEmployeeSchema.safeParse({
        employeeId: "emp-1",
        newRole: "Senior Engineer",
        newSalary: 75000,
        reason: "Excellent performance",
        effectiveDate: "2024-03-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative salary", () => {
      const result = promoteEmployeeSchema.safeParse({
        employeeId: "emp-1",
        newRole: "Senior Engineer",
        newSalary: -1,
        reason: "Performance",
        effectiveDate: "2024-03-01",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createRequisitionSchema", () => {
    it("accepts valid requisition", () => {
      const result = createRequisitionSchema.safeParse({
        title: "Operations Analyst",
        departmentId: "dept-ops",
        openings: 2,
        description: "Looking for analysts",
        priority: "high",
      });
      expect(result.success).toBe(true);
    });

    it("rejects zero openings", () => {
      const result = createRequisitionSchema.safeParse({
        title: "Analyst",
        departmentId: "dept-ops",
        openings: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createCaseSchema", () => {
    it("accepts valid case", () => {
      const result = createCaseSchema.safeParse({
        employeeId: "emp-1",
        title: "Workplace concern",
        category: "grievance",
        description: "Description of the issue that needs to be addressed.",
        priority: "high",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing description", () => {
      const result = createCaseSchema.safeParse({
        employeeId: "emp-1",
        title: "Test case",
        category: "complaint",
        description: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createContractSchema", () => {
    it("accepts valid contract", () => {
      const result = createContractSchema.safeParse({
        employeeId: "emp-1",
        title: "Full-time Employment Agreement",
        type: "permanent",
        startDate: "2024-01-01",
        endDate: "",
        salary: 60000,
        notes: "",
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative salary", () => {
      const result = createContractSchema.safeParse({
        employeeId: "emp-1",
        title: "Contract",
        type: "fixed_term",
        startDate: "2024-01-01",
        salary: -500,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("assignTrainingSchema", () => {
    it("accepts valid training assignment", () => {
      const result = assignTrainingSchema.safeParse({
        employeeId: "emp-1",
        programId: "prog-1",
        notes: "Priority upskilling",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing program", () => {
      const result = assignTrainingSchema.safeParse({
        employeeId: "emp-1",
        programId: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createWorkflowRequestSchema", () => {
    it("accepts valid workflow request", () => {
      const result = createWorkflowRequestSchema.safeParse({
        entityType: "PERFORMANCE",
        entityId: "emp-1",
        destinationDept: "HR",
        notes: "Review request",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid entity type", () => {
      const result = createWorkflowRequestSchema.safeParse({
        entityType: "INVALID",
        entityId: "emp-1",
        destinationDept: "HR",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("suspendEmployeeSchema", () => {
    it("accepts valid suspension", () => {
      const result = suspendEmployeeSchema.safeParse({
        employeeId: "emp-1",
        reason: "Pending investigation",
        startDate: "2024-03-01",
        endDate: "2024-03-15",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("terminateEmployeeSchema", () => {
    it("accepts valid termination", () => {
      const result = terminateEmployeeSchema.safeParse({
        employeeId: "emp-1",
        reason: "Contract ended",
        effectiveDate: "2024-03-31",
        finalSettlement: 10000,
      });
      expect(result.success).toBe(true);
    });
  });
});
