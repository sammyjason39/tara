const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'core', 'hr', 'repositories', 'hr.db.repository.ts');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  [/\.jobRequisition\./g, '.job_requisitions.'],
  [/Prisma\.jobRequisitionUpdateInput/g, 'Prisma.job_requisitionsUpdateInput'],
  [/\.hrPerformanceCycle\./g, '.hr_performance_cycles.'],
  [/\.performanceReview\./g, '.performance_reviews.'],
  [/\.hrCase\./g, '.hr_cases.'],
  [/\.benefitPlan\./g, '.benefit_plans.'],
  [/\.careerPath\./g, '.career_paths.'],
  [/\.mentorshipPair\./g, '.hr_mentorship_pairs.'],
  [/\.positionSkill\./g, '.position_skills.'],
  [/\.performanceGoal\./g, '.performance_goals.'],
  [/\.trainingProgram\./g, '.training_programs.'],
  [/\.trainingAssignment\./g, '.training_assignments.'],
  [/\.programSkill\./g, '.program_skills.'],
  [/\.budgetScenario\./g, '.hr_budget_scenarios.'],
  [/\.headcountPlan\./g, '.hr_headcount_plans.'],
  [/\.successionPlan\./g, '.hr_succession_plans.'],
  [/\.complianceDocument\./g, '.hr_compliance_documents.'],
  [/\.talentLead\./g, '.talent_leads.'],
];

for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed additional camelCase Prisma models.');
