const fs = require('fs');
const path = require('path');

const compileErrorsPath = path.join(__dirname, '..', 'compile_errors.txt');
const backendDir = path.join(__dirname, '..');

const manualMappings = {
  'user': 'users',
  'company': 'companies',
  'location': 'locations',
  'department': 'departments',
  'product': 'products',
  'device': 'it_devices',
  'itSetting': 'it_settings',
  'adminRequest': 'admin_requests',
  'adminAuditEvent': 'admin_audit_events',
  'arInvoice': 'ar_invoices',
  'arPayment': 'ar_payments',
  'arCustomer': 'ar_customers',
  'arCreditMemo': 'ar_credit_memos',
  'fixedAsset': 'fixed_assets',
  'moneySource': 'money_sources',
  'journalEntry': 'journal_entries',
  'journalLine': 'journal_lines',
  'chartOfAccount': 'chart_of_accounts',
  'payrollRun': 'payroll_runs',
  'payrollLine': 'payroll_lines',
  'attendanceRecord': 'hr_attendance_records',
  'hRCase': 'hr_cases',
  'leaveRequest': 'leave_requests',
  'jobRequisition': 'job_requisitions',
  'performanceCycle': 'hr_performance_cycles',
  'performanceReview': 'performance_reviews',
  'performanceGoal': 'hr_performance_goals',
  'trainingProgram': 'training_programs',
  'trainingAssignment': 'training_assignments',
  'candidate': 'candidates',
  'position': 'positions',
  'compensation': 'compensations',
  'interview': 'interviews',
  'talentLead': 'hr_talent_leads',
  'complianceDocument': 'hr_compliance_documents',
  'budgetScenario': 'hr_budget_scenarios',
  'headcountPlan': 'hr_headcount_plans',
  'exchangeRate': 'exchange_rates',
  'successionPlan': 'hr_succession_plans',
  'successionCandidate': 'hr_succession_candidates',
  'skill': 'hr_skills',
  'employeeSkill': 'hr_employee_skills',
  'benefitPlan': 'hr_benefit_plans',
  'employeeBenefit': 'hr_employee_benefits',
  'careerPath': 'hr_career_paths',
  'mentorshipPair': 'hr_mentorship_pairs',
  'positionSkill': 'hr_position_skills',
  'holiday': 'hr_holidays',
  'complianceModule': 'hr_compliance_modules',
  'complianceReport': 'hr_compliance_reports',
  'workSchedule': 'hr_work_schedules',
  'workShift': 'hr_work_shifts',
  'stockLevel': 'stock_levels',
  'stockMovement': 'stock_movements',
  'inventoryAlert': 'inventory_alerts',
  'inventoryAdjustment': 'inventory_adjustments',
  'procurementRequisition': 'procurement_requisitions',
  'procurementFinalPO': 'procurement_final_pos',
  'agenticEvent': 'agentic_events',
  'stockSnapshot': 'stock_snapshots',
  'ecommerceConnector': 'ecommerce_connectors',
  'systemLog': 'system_logs',
  'retailOrder': 'retail_orders',
  'retailShift': 'retail_shifts',
  'paymentTransaction': 'payment_transactions',
  'receivable': 'receivables',
  'payable': 'payables',
  'customerCreditBalance': 'customer_credit_balances',
  'payrollProfile': 'payroll_profiles',
  'budgetActual': 'budget_actuals',
  'budgetLine': 'budget_lines',
  'accountBalance': 'account_balances',
  'accountBalanceSnapshot': 'account_balance_snapshots',
  'ledgerEventLog': 'ledger_event_logs',
  'ledgerPosting': 'ledger_postings',
  'marketingCampaign': 'marketing_campaigns',
  'marketingLead': 'marketing_leads',
  'marketingExecutionRun': 'marketing_executions',
  'marketingConnectedAccount': 'marketing_connected_accounts',
  'marketingAttribution': 'marketing_attribution',
  'marketingAlert': 'marketing_alerts',
  'marketingAuditEvent': 'marketing_audit_events',
  'itProvisioningRequest': 'it_provisioning_requests',
  'itSystemHealth': 'it_system_health',
  'deviceEvent': 'device_events',
  'paymentProvider': 'payment_providers',
  'paymentRoutingPolicy': 'payment_routing_policies',
  'paymentPosDevice': 'payment_pos_devices',
  'paymentRefund': 'payment_refunds',
  'paymentDispute': 'payment_disputes',
  'paymentChargeback': 'payment_chargebacks',
  'paymentSettlement': 'payment_settlements',
  'paymentEvidencePack': 'payment_evidence_packs',
  'paymentAuditEvent': 'payment_audit_events',
  'procurementAuditEvent': 'procurement_audit_events',
  'procurementRiskSignal': 'procurement_risk_signals',
  'procurementDraftPO': 'procurement_draft_pos',
  'procurementContract': 'procurement_contracts',
  'supplierMaster': 'supplier_masters',
  'supplierBranch': 'supplier_branches',
  'supplierProduct': 'supplier_products',
  'workflowRequest': 'workflow_requests'
};

const compileErrors = fs.readFileSync(compileErrorsPath, 'utf8');
const lines = compileErrors.split('\n');

const fixesPerFile = {};

// Regex for errors with suggestions: src/path/to/file.ts(18,51): error TS2551: Property 'stockMovement' does not exist on type 'PrismaService'. Did you mean 'stock_movements'?
const suggestionRegex = /^(.+)\((\d+),(\d+)\): error TS\d+: Property '(\w+)' does not exist on type '.+'. Did you mean '(\w+)'\?/;

// Regex for errors without suggestions: src/path/to/file.ts(18,51): error TS2551: Property 'user' does not exist on type 'PrismaService'.
const simpleErrorRegex = /^(.+)\((\d+),(\d+)\): error TS\d+: Property '(\w+)' does not exist on type '.+'\./;

for (const line of lines) {
  let match = line.match(suggestionRegex);
  if (match) {
    const [_, filePath, lineNum, colNum, oldProp, newProp] = match;
    const absPath = path.resolve(backendDir, filePath);
    if (!fixesPerFile[absPath]) fixesPerFile[absPath] = [];
    fixesPerFile[absPath].push({ line: parseInt(lineNum), oldProp, newProp });
    continue;
  }

  match = line.match(simpleErrorRegex);
  if (match) {
    const [_, filePath, lineNum, colNum, oldProp] = match;
    const newProp = manualMappings[oldProp];
    if (newProp) {
        const absPath = path.resolve(backendDir, filePath);
        if (!fixesPerFile[absPath]) fixesPerFile[absPath] = [];
        fixesPerFile[absPath].push({ line: parseInt(lineNum), oldProp, newProp });
    }
  }
}

console.log(`Found fixes for ${Object.keys(fixesPerFile).length} files.`);

for (const absPath in fixesPerFile) {
  if (!fs.existsSync(absPath)) {
      console.warn(`File not found: ${absPath}`);
      continue;
  }
  
  const contentLines = fs.readFileSync(absPath, 'utf8').split('\n');
  const fixes = fixesPerFile[absPath];
  
  // Sort fixes by line number descending to avoid displacement issues if we ever change line length drastically
  // (though here we are just swapping property names)
  fixes.sort((a, b) => b.line - a.line);
  
  let fixesApplied = 0;
  for (const fix of fixes) {
    const originalLine = contentLines[fix.line - 1];
    if (originalLine && originalLine.includes(fix.oldProp)) {
        // Use a regex with word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${fix.oldProp}\\b`, 'g');
        contentLines[fix.line - 1] = originalLine.replace(regex, fix.newProp);
        fixesApplied++;
    }
  }
  
  fs.writeFileSync(absPath, contentLines.join('\n'));
  console.log(`Applied ${fixesApplied}/${fixes.length} fixes to ${path.relative(backendDir, absPath)}`);
}

console.log('Remediation script finished.');
