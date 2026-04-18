const fs = require('fs');
const path = require('path');

const REPO_FILE = path.resolve(__dirname, '..', 'backend', 'src', 'core', 'hr', 'repositories', 'hr.db.repository.ts');
const raw = fs.readFileSync(REPO_FILE, 'utf-8');

let out = raw;

// Aligning with TSC suggestions for TransactionClient
out = out.replace(/db\.userCompany\./g, 'db.userCompanies.');
out = out.replace(/db\.employee\./g, 'db.employees.');
out = out.replace(/db\.hrAttendanceRecord\./g, 'db.hrAttendanceRecords.');
out = out.replace(/db\.leaveRequest\./g, 'db.leaveRequests.');
out = out.replace(/db\.hrPayrollRun\./g, 'db.hrPayrollRuns.');
out = out.replace(/db\.payrollLine\./g, 'db.payrollLines.');
out = out.replace(/db\.jobRequisition\./g, 'db.jobRequisitions.');
out = out.replace(/db\.hrPerformanceCycle\./g, 'db.hrPerformanceCycles.');
out = out.replace(/db\.performanceReview\./g, 'db.performanceReviews.');
out = out.replace(/db\.contract\./g, 'db.contracts.');
out = out.replace(/db\.hrCase\./g, 'db.hrCases.');
out = out.replace(/db\.candidate\./g, 'db.candidates.');
out = out.replace(/db\.position\./g, 'db.positions.');
out = out.replace(/db\.compensation\./g, 'db.compensations.');
out = out.replace(/db\.hrComplianceDocument\./g, 'db.hrComplianceDocuments.');
out = out.replace(/db\.skill\./g, 'db.hrSkills.');
out = out.replace(/db\.employeeSkill\./g, 'db.hrEmployeeSkills.');
out = out.replace(/db\.benefitPlan\./g, 'db.hrBenefitPlans.');
out = out.replace(/db\.employeeBenefit\./g, 'db.hrEmployeeBenefits.');
out = out.replace(/db\.careerPath\./g, 'db.hrCareerPaths.');
out = out.replace(/db\.mentorshipPair\./g, 'db.hrMentorshipPairs.');
out = out.replace(/db\.positionSkill\./g, 'db.hrPositionSkills.');
out = out.replace(/db\.performanceGoal\./g, 'db.hrPerformanceGoals.');
out = out.replace(/db\.trainingProgram\./g, 'db.hrTrainingPrograms.');
out = out.replace(/db\.trainingAssignment\./g, 'db.hrTrainingAssignments.');

fs.writeFileSync(REPO_FILE, out);
console.log('✅ Final HR Repository synchronization complete!');
