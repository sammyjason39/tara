const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'core', 'hr', 'repositories', 'hr.db.repository.ts');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Method accessors
  [/\.contract\./g, '.contracts.'],
  [/\.sysOutboxEvent\./g, '.sys_outbox_events.'],
  [/\.hrPayrollRun\./g, '.hr_payroll_runs.'],
  [/\.payrollLine\./g, '.payroll_lines.'],
  [/\.financeLedgerPosting\./g, '.finance_ledger_postings.'],
  [/\.position\./g, '.positions.'],
  [/\.compensation\./g, '.compensations.'],
  [/\.interview\./g, '.interviews.'],
  [/\.hrBudgetScenario\./g, '.hr_budget_scenarios.'],
  [/\.hrSuccessionCandidate\./g, '.hr_succession_candidates.'],
  [/\.hrEmployeeSkill\./g, '.hr_employee_skills.'],
  [/\.department\./g, '.departments.'],
  [/\.hrWorkSchedule\./g, '.hr_work_schedules.'],
  [/\.hrWorkShift\./g, '.hr_work_shifts.'],
  [/\.employee\./g, '.employees.'],
  [/\.attendance\./g, '.attendances.'], // just in case
  
  // Includes (e.g. include: { employee: true } -> employees: true)
  [/employee: /g, 'employees: '],
  [/hrSuccessionCandidate: /g, 'hr_succession_candidates: '],
  [/hrEmployeeSkill: /g, 'hr_employee_skills: '],
  [/compensation: /g, 'compensations: '],
  [/position: /g, 'positions: '], // Be careful if position is used as a property. Wait, "positions:" might conflict. Let's rely on TSC if something breaks.

  // Types
  [/Prisma\.hrBudgetScenarioUpdateInput/g, 'Prisma.hr_budget_scenariosUpdateInput'],
  [/Prisma\.hrWorkScheduleUncheckedCreateInput/g, 'Prisma.hr_work_schedulesUncheckedCreateInput'],
  [/Prisma\.hrWorkShiftUncheckedCreateInput/g, 'Prisma.hr_work_shiftsUncheckedCreateInput']
];

for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
}

// Additional fix for include mapping correctly:
// We replaced "employee:" with "employees:" and "position:" with "positions:", 
// let's ensure we didn't break things like { employee_id: ... } ... no regex was "employee: " with space.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replacements complete.');
