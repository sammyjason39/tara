const fs = require('fs');
const path = require('path');

const models = [
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

const srcDir = 'c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/src';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const modelRegexes = models.map(m => ({
  name: m,
  create: new RegExp(`(\\.(create|upsert)\\(\\s*{\\s*data\\s*:\\s*{)`, 'g')
}));

let filesChanged = 0;

walk(srcDir, (filePath) => {
  if (!filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changed = false;

  // This is a simplified regex approach. A better one would be to look for the model name before .create
  for (const model of models) {
    // Look for: prisma.modelName.create({ data: {
    const regex = new RegExp(`(\\.(create|upsert)\\(\\s*{\\s*data\\s*:\\s*{)`, 'g');
    // We only want to target the specific models, but regex is tricky here.
    // Let's use a more specific one: [prisma|tx].[model].create
    const specificRegex = new RegExp(`(\\.(?:prisma|tx)\\.${model}\\.(?:create|upsert)\\(\\s*{\\s*data\\s*:\\s*{)`, 'g');
    
    if (content.match(specificRegex)) {
      content = content.replace(specificRegex, (match) => {
        if (!content.includes('updated_at:')) {
           return match + '\n          updated_at: new Date(),';
        }
        return match;
      });
      changed = true;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    filesChanged++;
  }
});

console.log(`Updated ${filesChanged} files with missing updated_at fields.`);
