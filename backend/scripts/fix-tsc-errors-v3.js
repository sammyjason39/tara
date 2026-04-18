const fs = require('fs');
const path = require('path');

const compileErrorsPath = path.join(__dirname, '..', 'compile_errors_v3.txt');
const backendDir = path.join(__dirname, '..');
const modelsPath = path.join(__dirname, '..', 'models.json');

const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

// Common field mappings to be used as fallback when suggestions are missing
const commonFieldMap = {
    'tenantId': 'tenant_id',
    'locationId': 'location_id',
    'departmentId': 'department_id',
    'employeeId': 'employee_id',
    'companyId': 'company_id',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'requestedBy': 'requested_by',
    'approvedBy': 'approved_by',
    'totalAmount': 'total_amount',
    'unitCost': 'unit_cost',
    'invoiceId': 'invoice_id',
    'paymentId': 'payment_id',
    'ledgerPostingId': 'ledger_posting_id',
    'moduleKey': 'module_key',
    'updatedBy': 'updated_by',
    'resolvedBy': 'resolved_by'
};

const compileErrors = fs.readFileSync(compileErrorsPath, 'utf8');
const lines = compileErrors.split('\n');

const fixesPerFile = {};

// Regex for suggestings: Did you mean [to write] '...'?
const suggestionRegex = /^(.+)\((\d+),(\d+)\): error TS\d+: .+Did you mean\s+(?:to write\s+)?'(\w+)'\?/;

// Regex for Object Literal errors that might not have a suggestion
const objectLiteralRegex = /^(.+)\((\d+),(\d+)\): error TS2561: Object literal may only specify known properties, but '(\w+)' does not exist in type '(\w+)'.+/;

for (const line of lines) {
    let match = line.match(suggestionRegex);
    if (match) {
        const [_, filePath, lineNum, colNum, newProp] = match;
        const propMatch = line.match(/but '(\w+)' does not exist/) || line.match(/Property '(\w+)'/);
        if (propMatch) {
            const oldProp = propMatch[1];
            const absPath = path.resolve(backendDir, filePath);
            if (!fixesPerFile[absPath]) fixesPerFile[absPath] = [];
            fixesPerFile[absPath].push({ line: parseInt(lineNum), oldProp, newProp });
        }
    } else {
        match = line.match(objectLiteralRegex);
        if (match) {
            const [_, filePath, lineNum, colNum, oldProp, typeName] = match;
            const newProp = commonFieldMap[oldProp];
            if (newProp) {
                const absPath = path.resolve(backendDir, filePath);
                if (!fixesPerFile[absPath]) fixesPerFile[absPath] = [];
                fixesPerFile[absPath].push({ line: parseInt(lineNum), oldProp, newProp });
            }
        }
    }
}

// Special case: "Property 'journal_entries' does not exist on type 'TransactionClient'" 
// If property does not exist and it has a prefix in models.json, auto-fix it.
const missingPropRegex = /^(.+)\((\d+),(\d+)\): error TS2339: Property '(\w+)' does not exist on type '(.+)'\./;
for (const line of lines) {
    const match = line.match(missingPropRegex);
    if (match) {
        const [_, filePath, lineNum, colNum, oldProp, typeName] = match;
        // Don't auto-prefix if it already has a suggestion handled above
        if (line.includes("Did you mean")) continue; 

        // Find match in models.json
        const variants = [`finance_${oldProp}`, `hr_${oldProp}`, `it_${oldProp}`, `inventory_${oldProp}`, `procurement_${oldProp}`];
        const hit = models.find(m => variants.includes(m));
        if (hit) {
            const absPath = path.resolve(backendDir, filePath);
            if (!fixesPerFile[absPath]) fixesPerFile[absPath] = [];
            fixesPerFile[absPath].push({ line: parseInt(lineNum), oldProp, newProp: hit });
        }
    }
}

console.log(`Planned v3 fixes for ${Object.keys(fixesPerFile).length} files.`);

for (const absPath in fixesPerFile) {
    if (!fs.existsSync(absPath)) continue;
    const contentLines = fs.readFileSync(absPath, 'utf8').split('\n');
    const fixes = fixesPerFile[absPath];
    const uniqueFixes = [];
    const seen = new Set();
    for (const f of fixes) {
        const key = `${f.line}:${f.oldProp}:${f.newProp}`;
        if (!seen.has(key)) { uniqueFixes.push(f); seen.add(key); }
    }
    uniqueFixes.sort((a, b) => b.line - a.line);
    for (const fix of uniqueFixes) {
        const lineIndex = fix.line - 1;
        const originalLine = contentLines[lineIndex];
        if (originalLine && originalLine.includes(fix.oldProp)) {
            const regex = new RegExp(`\\b${fix.oldProp}\\b`, 'g');
            contentLines[lineIndex] = originalLine.replace(regex, fix.newProp);
        }
    }
    fs.writeFileSync(absPath, contentLines.join('\n'));
}

console.log('Remediation script v3 finished.');
