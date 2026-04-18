const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

const mapToModel = {
  'hr_cases': 'hrCase',
  'hr_recommendations': 'hrRecommendation',
  'hr_insights': 'hrInsight',
  'hr_recommendation_feedbacks': 'hrRecommendationFeedback',
  'hr_payroll_runs': 'hrPayrollRun',
  'hr_system_alerts': 'hrSystemAlert',
  'hr_system_metrics': 'hrSystemMetric',
  'hr_context_snapshots': 'hrContextSnapshot',
  'finance_journal_lines': 'financeJournalLine',
  'payroll_lines': 'payrollLine',
  'supplier_masters': 'supplierMaster',
  'candidates': 'candidate',
  'contracts': 'contract',
  'employees': 'employee',
  'positions': 'position',
  'users': 'user',
  'user_companies': 'userCompany',
  'schedule_assignments': 'scheduleAssignment',
  'training_programs': 'trainingProgram',
  'training_assignments': 'trainingAssignment',
  'sys_outbox_events': 'sysOutboxEvent',
  'hr_performance_cycles': 'hrPerformanceCycle',
  'accounting_periods': 'accountingPeriod',
  'stock_levels': 'stockLevel',
  'payment_retry_attempts': 'paymentRetryAttempt',
  'finance_bank_transactions': 'financeBankTransaction'
};

const blocks = content.split(/\n(?=model\s+\w+\s+\{)/);

const updatedBlocks = blocks.map(block => {
  const mapMatch = block.match(/@@map\("(\w+)"\)/);
  if (mapMatch) {
    const mapName = mapMatch[1];
    const correctModelName = mapToModel[mapName];
    if (correctModelName) {
      return block.replace(/model\s+\w+\s+\{/, `model ${correctModelName} {`);
    }
  }
  return block;
});

content = updatedBlocks.join('\n');

Object.values(mapToModel).forEach(modelName => {
  const regex = new RegExp('(model\\s+' + modelName + '\\s+\\{)([\\s\\S]*?\\})', 'g');
  content = content.replace(regex, (match, header, body) => {
    if (!body.includes('id String') && !body.includes('id  String')) {
      return header + '\n  id String @id @default(uuid())\n' + body;
    }
    if (body.includes('@id') && !body.includes('@default(uuid())')) {
        return match.replace(/id\s+String\s+@id/, 'id String @id @default(uuid())');
    }
    return match;
  });
});

fs.writeFileSync(path, content);
console.log('Recovery v4 complete!');
