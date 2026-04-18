const fs = require('fs');
const path = require('path');

const compileErrorsPath = path.join(__dirname, '..', 'compile_errors_v2.txt');
const backendDir = path.join(__dirname, '..');

const manualMappings = {
  // Models
  'arInvoice': 'finance_ar_invoices',
  'arPayment': 'finance_ar_payments',
  'arCustomer': 'finance_ar_customers',
  'arCreditMemo': 'finance_ar_credit_memos',
  'arInvoiceLine': 'finance_ar_invoice_lines',
  'arPaymentAllocation': 'finance_ar_payment_allocations',
  'customerCreditBalance': 'finance_ar_customer_credit_balances',
  'journalEntry': 'finance_journal_entries',
  'journalLine': 'finance_journal_lines',
  'accountBalance': 'finance_account_balances',
  'accountBalanceSnapshot': 'finance_account_balance_snapshots',
  'fiscalPeriod': 'finance_fiscal_periods',
  'journalReversal': 'finance_journal_reversals',
  'ledgerEventLog': 'finance_ledger_event_log',
  'ledgerPosting': 'finance_ledger_postings',
  'ledgerPostingLine': 'finance_ledger_posting_lines',
  'insightSnapshot': 'finance_insight_snapshots',
  'expensePolicy': 'finance_expense_policies',
  'bankStatement': 'finance_bank_statements',
  'bankTransaction': 'finance_bank_transactions',
  'budgetActual': 'finance_budget_actuals',
  'budgetLine': 'finance_budget_lines',
  'payrollRun': 'hr_payroll_runs',
  'payrollLine': 'payroll_lines',
  'attendanceRecord': 'hr_attendance_records',
  'hRCase': 'hr_cases',
  'budgetScenario': 'hr_budget_scenarios',
  'headcountPlan': 'hr_headcount_plans',
  'exchangeRate': 'hr_exchange_rates',
  'contextSnapshot': 'hr_context_snapshots',
  'recommendation': 'hr_recommendations',
  'recommendationFeedback': 'hr_recommendation_feedbacks',
  'systemAlert': 'hr_system_alerts',
  'systemMetric': 'hr_system_metrics',
  'leaveRequest': 'leave_requests',
  'jobRequisition': 'job_requisitions',
  'userCompany': 'user_companies',
  'itProvisioningRequest': 'it_provisioning_requests',
  'itSystemHealth': 'it_system_health',
  'device': 'it_devices',
  'deviceEvent': 'it_device_events',
  'itSetting': 'it_settings',
  'stockLevel': 'stock_levels',
  'stockMovement': 'stock_movements',
  'stockSnapshot': 'stock_snapshots',
  'inventoryAlert': 'inventory_alerts',
  'inventoryAdjustment': 'inventory_adjustments',
  'itemMaster': 'item_masters',

  // Fields
  'tenantId': 'tenant_id',
  'locationId': 'location_id',
  'departmentId': 'department_id',
  'productId': 'product_id',
  'skuId': 'sku_id',
  'companyId': 'company_id',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'deletedAt': 'deleted_at',
  'requestedBy': 'requested_by',
  'approvedBy': 'approved_by',
  'resolvedBy': 'resolved_by',
  'checkIn': 'check_in',
  'checkOut': 'check_out',
  'grossPay': 'gross_pay',
  'netPay': 'net_pay',
  'totalAmount': 'total_amount',
  'openingCash': 'opening_cash',
  'openingBalance': 'opening_balance',
  'closingBalance': 'closing_balance',
  'remainingQty': 'remaining_qty',
  'minBuffer': 'min_buffer',
  'maxBuffer': 'max_buffer',
  'reorderPoint': 'reorder_point',
  'unitCost': 'unit_cost',
  'baseSalary': 'base_salary',
  'payFrequency': 'pay_frequency',
  'moduleKey': 'module_key',
  'updatedBy': 'updated_by',
  'entityType': 'entity_type',
  'entityId': 'entity_id',
  'actorId': 'actor_id',
  'idempotencyKey': 'idempotency_key',
  'extraInfo': 'extra_info',
  'workflowRequestId': 'workflow_request_id',
  'scenarioId': 'scenario_id',
  'snapshotId': 'snapshot_id',
  'certificationHash': 'certification_hash',
  'aggregatedValues': 'aggregated_values',
  'recordedBy': 'recorded_by',
  'assetId': 'asset_id',
  'depreciationExp': 'depreciation_exp',
  'accumulatedDep': 'accumulated_dep',
  'carryingValue': 'carrying_value',
  'journalRef': 'journal_ref',
  'payrollRunId': 'payroll_run_id',
  'employeeId': 'employee_id'
};

const compileErrors = fs.readFileSync(compileErrorsPath, 'utf8');
const lines = compileErrors.split('\n');

const fixesPerFile = {};

// Regex for errors with suggestions: ...Did you mean [to write] '...'?
const suggestionRegex = /^(.+)\((\d+),(\d+)\): error TS\d+: .+Did you mean\s+(?:to write\s+)?'(\w+)'\?/;

// Regex for errors without suggestions
const simpleErrorRegex = /^(.+)\((\d+),(\d+)\): error TS\d+: Property '(\w+)' does not exist on type '.+'\./;

for (const line of lines) {
  let match = line.match(suggestionRegex);
  if (match) {
    const [_, filePath, lineNum, colNum, newProp] = match;
    // We need OLD property name from the line too.
    // "Property 'tenantId' does not exist... Did you mean 'tenant_id'?"
    const propMatch = line.match(/Property '(\w+)'/);
    if (propMatch) {
        const oldProp = propMatch[1];
        const absPath = path.resolve(backendDir, filePath);
        if (!fixesPerFile[absPath]) fixesPerFile[absPath] = [];
        fixesPerFile[absPath].push({ line: parseInt(lineNum), oldProp, newProp });
    }
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

console.log(`Planned fixes for ${Object.keys(fixesPerFile).length} files.`);

for (const absPath in fixesPerFile) {
  if (!fs.existsSync(absPath)) continue;
  
  const content = fs.readFileSync(absPath, 'utf8');
  let contentLines = content.split('\n');
  const fixes = fixesPerFile[absPath];
  
  // Dedup fixes on the same line for the same property
  const uniqueFixes = [];
  const seen = new Set();
  for (const f of fixes) {
      const key = `${f.line}:${f.oldProp}:${f.newProp}`;
      if (!seen.has(key)) {
          uniqueFixes.push(f);
          seen.add(key);
      }
  }

  uniqueFixes.sort((a, b) => b.line - a.line);
  
  let fixesAppliedCount = 0;
  for (const fix of uniqueFixes) {
    const lineIndex = fix.line - 1;
    const originalLine = contentLines[lineIndex];
    if (originalLine && originalLine.includes(fix.oldProp)) {
        const regex = new RegExp(`\\b${fix.oldProp}\\b`, 'g');
        contentLines[lineIndex] = originalLine.replace(regex, fix.newProp);
        fixesAppliedCount++;
    }
  }
  
  fs.writeFileSync(absPath, contentLines.join('\n'));
  console.log(`Applied ${fixesAppliedCount} fixes to ${path.relative(backendDir, absPath)}`);
}

console.log('Remediation script finished.');
