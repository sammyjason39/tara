const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

const mapping = {
  'hr_cases': 'hrCase',
  'hr_system_alerts': 'hrSystemAlert',
  'hr_insights': 'hrInsight',
  'hr_recommendations': 'hrRecommendation',
  'hr_performance_cycles': 'hrPerformanceCycle',
  'hr_payroll_runs': 'hrPayrollRun',
  'hr_system_metrics': 'hrSystemMetric',
  'hr_context_snapshots': 'hrContextSnapshot',
  'finance_journal_lines': 'financeJournalLine',
  'payroll_lines': 'payrollLine',
  'supplier_masters': 'supplierMaster',
  'payment_retry_attempts': 'paymentRetryAttempt',
  'stock_levels': 'stockLevel',
  'user_companies': 'userCompany',
  'schedule_assignments': 'scheduleAssignment',
  'training_programs': 'trainingProgram',
  'training_assignments': 'trainingAssignment',
  'candidates': 'candidate',
  'sys_outbox_events': 'sysOutboxEvent',
  'positions': 'position',
  'users': 'user',
  'employees': 'employee',
  'contracts': 'contract'
};

// 1. First, fix the model headers by matching their @@map tags
Object.keys(mapping).forEach(mapName => {
  const modelName = mapping[mapName];
  // Regex to find a model block that contains the specific @@map
  const regex = new RegExp('(model\\s+\\w+\\s+\\{[\\s\\S]*?@@map\\("' + mapName + '"\\))', 'g');
  content = content.replace(regex, (match) => {
    return match.replace(/model\s+\w+\s+\{/, 'model ' + modelName + ' {');
  });
});

// 2. Ensure every model has an ID field if it got deleted
// (The previous corruption might have left some models without the 'id String @id' line)
Object.values(mapping).forEach(modelName => {
  const regex = new RegExp('(model\\s+' + modelName + '\\s+\\{)([\\s\\S]*?\\})', 'g');
  content = content.replace(regex, (match, header, body) => {
    if (!body.includes('id String') && !body.includes('id  String')) {
      return header + '\n  id String @id @default(uuid())\n' + body;
    }
    // Also ensure @default(uuid()) is present if missing
    if (body.includes('id String @id') && !body.includes('@default(uuid())')) {
       return match.replace('id String @id', 'id String @id @default(uuid())');
    }
    return match;
  });
});

// 3. Fix the stray '@default(uuid())' lines that are not attached to an id
content = content.replace(/^\s*@default\(uuid\(\)\)\s*$/gm, '');

fs.writeFileSync(path, content);
console.log('Schema alignment complete.');
