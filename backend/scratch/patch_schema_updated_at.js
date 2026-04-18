const fs = require('fs');

const schemaPath = 'c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/prisma/schema.prisma';
const modelsToUpdate = [
  "adminAuditEvent", "agenticEvent", "assetDepreciationEntry", "assetEvent", "auditHashAnchor", "auditLog",
  "bulletinComment", "bulletinReaction", "bulletinRead", "chatMember", "chatReaction", "commsChatMessage",
  "costLayer", "costSnapshot", "domainEvent", "farmingSensorLog", "financeAccountBalanceSnapshot",
  "financeAlert", "financeApPaymentAllocation", "financeArInvoiceLine", "financeArPaymentAllocation",
  "financeBankStatement", "financeBankTransaction", "financeBudgetActual", "financeCertification",
  "financeInsightSnapshot", "financeInsight", "financeJournalLine", "financeJournalReversal",
  "financeLedgerEventLog", "financeLedgerEventLogArchive", "financeLedgerHashAnchor", "financeLedgerIdempotency",
  "financeLedgerPostingLine", "financeReconMatche", "financeTaxConfig", "financeTaxRate", "financeTaxRule",
  "financeTransactionTax", "fnbIngredient", "hrContextSnapshot", "hrInsight", "hrRecommendationFeedback",
  "hrRecommendation", "hrSystemAlert", "hrSystemMetric", "hrThresholdAudit", "idempotencyKey", "itDeviceEvent",
  "itDevice", "itSystemHealth", "mailFolderItem", "mailFolder", "mailLabel", "mailMessage", "marketingAttribution",
  "marketingAuditEvent", "moduleLicenseLog", "moneySource", "notification", "paymentAuditEvent",
  "paymentEvidencePack", "paymentRetryAttempt", "priceSnapshot", "priceVersion", "procurementAuditEvent",
  "procurementRatingLog", "procurementReceipt", "retailGatewayNode", "retailOrderItem", "salesAuditEvent",
  "salesTimelineEvent", "stockMovement", "stockSnapshot", "supplierPortalMessage", "sysIdempotencyKey", "systemLog"
];

let content = fs.readFileSync(schemaPath, 'utf8');
const lines = content.split('\n');
let newLines = [];
let currentModelName = null;
let currentModelLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  if (trimmed.startsWith('model ')) {
    currentModelName = trimmed.split(' ')[1];
    currentModelLines = [line];
  } else if (trimmed === '}' && currentModelName) {
    if (modelsToUpdate.includes(currentModelName)) {
      const hasUpdatedAt = currentModelLines.some(l => l.trim().includes('updated_at '));
      if (!hasUpdatedAt) {
        // Insert before any @@ tags if possible, or just before the closing brace
        let insertIndex = currentModelLines.findLastIndex(l => !l.trim().startsWith('@@') && l.trim() !== '}');
        if (insertIndex === -1) insertIndex = currentModelLines.length - 1;
        currentModelLines.splice(insertIndex + 1, 0, '  updated_at DateTime @default(now())');
      } else {
        // Ensure it has @default(now())
        for (let j = 0; j < currentModelLines.length; j++) {
          if (currentModelLines[j].trim().includes('updated_at ')) {
            currentModelLines[j] = '  updated_at DateTime @default(now())';
          }
        }
      }
    }
    currentModelLines.push(line);
    newLines.push(...currentModelLines);
    currentModelName = null;
    currentModelLines = [];
  } else if (currentModelName) {
    currentModelLines.push(line);
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Successfully updated schema.prisma with idempotent updated_at fields.');
