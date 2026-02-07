import type { Department, DepartmentCode } from "./departmentTypes";
import { defaultDepartments } from "./defaultDepartments";

export function listDepartments(): Department[] {
  return [...defaultDepartments];
}

export function resolveDepartment(
  input: DepartmentCode | string | undefined,
): Department | undefined {
  if (!input) return undefined;
  return defaultDepartments.find(
    (dept) => dept.id === input || dept.code === input,
  );
}

export function isValidDepartment(input: DepartmentCode | string): boolean {
  return Boolean(resolveDepartment(input));
}
