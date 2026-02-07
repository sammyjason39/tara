import type { TrainingAssignment, TrainingProgram } from "@/core/types/hr/training";
import { ensureSeed, nextId, saveToStorage } from "./storage";

const programKey = (tenantId: string) => `hr:${tenantId}:training-programs`;
const assignmentKey = (tenantId: string) => `hr:${tenantId}:training-assignments`;

const seedPrograms = (tenantId: string): TrainingProgram[] => [
  {
    id: `${tenantId}-train-001`,
    tenantId,
    name: "Security Awareness",
    status: "in_progress",
    completionRate: 89,
    dueDate: "2026-02-22",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: `${tenantId}-train-002`,
    tenantId,
    name: "Manager Essentials",
    status: "in_progress",
    completionRate: 72,
    dueDate: "2026-03-10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const seedAssignments = (tenantId: string): TrainingAssignment[] => [
  {
    id: `${tenantId}-assign-001`,
    tenantId,
    programId: `${tenantId}-train-001`,
    employeeId: `${tenantId}-emp-001`,
    status: "in_progress",
    assignedAt: "2026-01-15",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const trainingRepo = {
  listPrograms(tenantId: string): TrainingProgram[] {
    return ensureSeed(programKey(tenantId), seedPrograms(tenantId));
  },

  listAssignments(tenantId: string): TrainingAssignment[] {
    return ensureSeed(assignmentKey(tenantId), seedAssignments(tenantId));
  },

  assignTraining(
    tenantId: string,
    payload: Omit<TrainingAssignment, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): TrainingAssignment {
    const assignments = this.listAssignments(tenantId);
    const now = new Date().toISOString();
    const assignment: TrainingAssignment = {
      ...payload,
      id: nextId(`${tenantId}-assign`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [assignment, ...assignments];
    saveToStorage(assignmentKey(tenantId), updated);
    return assignment;
  },

  createProgram(
    tenantId: string,
    payload: Omit<TrainingProgram, "id" | "tenantId" | "createdAt" | "updatedAt">,
  ): TrainingProgram {
    const programs = this.listPrograms(tenantId);
    const now = new Date().toISOString();
    const program: TrainingProgram = {
      ...payload,
      id: nextId(`${tenantId}-train`),
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [program, ...programs];
    saveToStorage(programKey(tenantId), updated);
    return program;
  },

  updateAssignment(
    tenantId: string,
    assignmentId: string,
    patch: Partial<TrainingAssignment>,
  ): TrainingAssignment | null {
    const assignments = this.listAssignments(tenantId);
    let updatedAssignment: TrainingAssignment | null = null;
    const updated = assignments.map((assignment) => {
      if (assignment.id !== assignmentId) return assignment;
      updatedAssignment = { ...assignment, ...patch, updatedAt: new Date().toISOString() };
      return updatedAssignment;
    });
    if (!updatedAssignment) return null;
    saveToStorage(assignmentKey(tenantId), updated);
    return updatedAssignment;
  },
};
