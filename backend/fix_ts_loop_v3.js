const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetFiles = [
    'src/agentic/inventory/replenishment.service.ts',
    'src/core/finance/ar/repositories/ar-credit-memo.db.repository.ts',
    'src/core/finance/ar/repositories/ar-customer-credit.db.repository.ts',
    'src/core/finance/ar/repositories/ar-customer.db.repository.ts',
    'src/core/finance/ar/repositories/ar-invoice.db.repository.ts',
    'src/core/finance/ar/repositories/ar-payment.db.repository.ts',
    'src/core/finance/ar/services/ar-invoice.service.ts',
    'src/core/finance/repositories/account-balance.db.repository.ts',
    'src/core/finance/repositories/coa.db.repository.ts',
    'src/core/finance/repositories/finance.db.repository.ts',
    'src/core/finance/repositories/fiscal-period.db.repository.ts',
    'src/core/finance/repositories/journal-reversal.db.repository.ts',
    'src/core/finance/repositories/journal.db.repository.ts',
    'src/core/finance/repositories/ledger-event-log.db.repository.ts',
    'src/core/finance/repositories/ledger-posting.db.repository.ts',
    'src/core/finance/repositories/payroll.db.repository.ts',
    'src/core/finance/services/audit-dashboard.service.ts',
    'src/core/finance/services/bank-ingestion.service.ts',
    'src/core/finance/services/budgeting.service.ts',
    'src/core/finance/services/cashflow.service.ts',
    'src/core/finance/services/expense-policy.service.ts',
    'src/core/finance/services/financial-dashboard.service.ts',
    'src/core/finance/services/insight.service.ts',
    'src/core/finance/services/payment-lifecycle.service.ts',
    'src/core/finance/services/tax-export.service.ts',
    'src/core/finance/services/workflow-integration.service.ts',
    'src/core/finance/subledger/repositories/inventory-subledger.db.repository.ts',
    'src/core/hr/repositories/hr.db.repository.ts',
    'src/core/inventory/inventory.service.ts',
    'src/core/inventory/repositories/inventory.db.repository.ts',
    'src/core/it-settings/repositories/it-settings.db.repository.ts',
    'src/core/it/repositories/it.db.repository.ts',
    'src/core/payment/repositories/payment.db.repository.ts',
    'src/core/procurement/repositories/procurement.db.repository.ts',
    'src/core/procurement/workflows/bidding.workflow.ts',
    'src/core/procurement/workflows/procurement-workflow.interface.ts',
    'src/core/retail/repositories/retail.db.repository.ts',
    'src/core/sales/sales-management.service.ts',
    'src/core/sales/sales-operational.service.ts',
    'src/modules/retail/repositories/retail.db.repository.ts'
];

const manualReplacements = {
    'journalEntry': 'financeJournalEntry',
    'journalLine': 'financeJournalLine',
    'ledgerPosting': 'financeLedgerPosting',
    'ledgerPostingLine': 'financeLedgerPostingLine',
    'chartOfAccount': 'financeChartOfAccount',
    'ledgerEventLog': 'financeLedgerEventLog',
    'arCustomer': 'financeArCustomer',
    'fiscalPeriod': 'financeFiscalPeriod',
    'arCreditMemo': 'financeArCreditMemo',
    'customerCreditBalance': 'financeArCustomerCreditBalance',
    'journalReversal': 'financeJournalReversal',
    'ledgerIdempotency': 'financeLedgerPosting',
    'budgetLine': 'financeBudgetLine',
    'budgetActual': 'financeBudgetActual',
    'expensePolicy': 'financeExpensePolicy',
    'bankStatement': 'financeBankStatement',
    'insightSnapshot': 'financeInsightSnapshot',
    'arPaymentAllocation': 'financeArPaymentAllocation',
    'arInvoice': 'financeArInvoice',
    'apPaymentAllocation': 'financeApPaymentAllocation',
    'inventorySubledgerEntry': 'inventorySubledgerEntry',
    'sourcingEvent': 'procurementSourcingEvent',
    'purchaseOrder': 'procurementPurchaseOrder',
    'requisition': 'procurementRequisition',
    'inventoryPool': 'inventoryPool',
    'replenishmentPlan': 'inventoryReplenishmentPlan',
    'itSetting': 'itSetting',
    'retailOrder': 'retailOrder',
    'retailOrderItem': 'retailOrderItem',
    'retailPromotion': 'retailPromotion',
    'retailCustomer': 'retailCustomer',
    'retailCart': 'retailCart',
    'retailCartItem': 'retailCartItem',
    'retailWishlist': 'retailWishlist'
};

const rogueFields = ['sourceModule', 'inventoryTransactionId', 'title', 'pointsEarned', 'pointsSpent'];

function run() {
    console.log("Running tsc on target files...");
    let output = "";
    try {
        output = execSync(`npx tsc --noEmit ${targetFiles.join(' ')}`, { stdio: 'pipe' }).toString();
        console.log("SUCCESS! No non-decimal TS errors in target batch.");
        return false; // Stop
    } catch (e) {
        output = e.stdout.toString() + e.stderr.toString();
        const lines = output.split('\n');
        const patches = {};

        for (const line of lines) {
            const match = line.match(/^([a-zA-Z0-9_\-\.\/\\]+\.ts)\((\d+),\d+\): error TS(\d+): (.*)/);
            if (!match) continue;

            const file = match[1];
            const lineNum = parseInt(match[2], 10) - 1;
            const errCode = match[3];
            const msg = match[4];

            // SKIP DECIMALS COMPLETELY
            if (errCode === '2322' && (msg.includes('Decimal') || msg.includes('number'))) {
                continue;
            }

            let badProp = null;
            let goodProp = null;

            // Suggestion from TSC
            const meanMatch = msg.match(/Did you mean (?:to write )?'([^']+)'/);
            if (meanMatch) goodProp = meanMatch[1];

            // If no suggestion, try manual map
            const propMatch = msg.match(/Property '([^']+)' does not exist on type/);
            if (propMatch) {
                badProp = propMatch[1];
                if (!goodProp && manualReplacements[badProp]) {
                    goodProp = manualReplacements[badProp];
                }
            }

            // Handle Export casing and Cannot find name errors
            if ((errCode === '2724' || errCode === '2304' || errCode === '2552') && (msg.includes('member') || msg.includes('name'))) {
                 const nameMatch = msg.match(/named? '([^']+)'/);
                 if (nameMatch) {
                     const originalName = nameMatch[1];
                     if (originalName.startsWith('Prisma')) {
                         badProp = originalName;
                         goodProp = 'prisma' + originalName.substring(6);
                     } else if (originalName.charAt(0) === originalName.charAt(0).toUpperCase()) {
                         badProp = originalName;
                         goodProp = originalName.charAt(0).toLowerCase() + originalName.slice(1);
                     }
                 }
            }

            if (badProp && goodProp) {
                if (!patches[file]) patches[file] = {};
                if (!patches[file][lineNum]) patches[file][lineNum] = [];
                patches[file][lineNum].push({ bad: badProp, good: goodProp });
            }
        }

        let applied = 0;
        for (const [file, linePatches] of Object.entries(patches)) {
            const fullPath = path.resolve(process.cwd(), file);
            if (!fs.existsSync(fullPath)) continue;

            const fileLines = fs.readFileSync(fullPath, 'utf8').split('\n');
            let modified = false;

            for (const [lineIdx, patchArr] of Object.entries(linePatches)) {
                let currentLine = fileLines[lineIdx];
                if (currentLine === undefined) continue;

                patchArr.forEach(({bad, good}) => {
                    const regex = new RegExp(`(?<=[.\\{\\s<])\\b${bad}\\b`, 'g');
                    if (currentLine.match(regex)) {
                        currentLine = currentLine.replace(regex, good);
                        modified = true;
                        applied++;
                    }
                });
                
                rogueFields.forEach(field => {
                    const rogueRegex = new RegExp(`\\b${field}:[^,}]+,?`, 'g');
                    if (currentLine.includes(field)) {
                         currentLine = currentLine.replace(rogueRegex, '');
                         modified = true;
                    }
                });

                fileLines[lineIdx] = currentLine;
            }
            if (modified) fs.writeFileSync(fullPath, fileLines.join('\n'));
        }

        // Global normalization for imports in these files
        targetFiles.forEach(file => {
             const fullPath = path.resolve(process.cwd(), file);
             if (!fs.existsSync(fullPath)) return;
             let content = fs.readFileSync(fullPath, 'utf8');
             content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]@prisma\/client['"]/g, (m, imp) => {
                  return m.replace(/\b([A-Z][a-zA-Z]+)\b/g, (name) => {
                       if (['PrismaClient', 'Prisma', 'Decimal'].includes(name)) return name;
                       return name.charAt(0).toLowerCase() + name.slice(1);
                  });
             });
             // Fix candidate relations manually in this pass if found
             content = content.replace(/\bcandidate\.requisitionId\b/g, 'candidate.job_requisitions');
             fs.writeFileSync(fullPath, content);
        });

        console.log(`Applied ${applied} patches in this iteration.`);
        return applied > 0;
    }
}

let ok = false;
for (let i = 0; i < 5; i++) {
    console.log(`--- Iteration ${i+1} ---`);
    if (!run()) break;
}
console.log("Batch fix loop finished.");
