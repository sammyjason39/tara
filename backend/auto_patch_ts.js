const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'batch_tsc_errors.txt');
if (!fs.existsSync(logPath)) {
    console.log("No batch_tsc_errors.txt found.");
    process.exit(0);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

const manualMap = {
    'company': 'companies',
    'adminModuleStatus': 'adminModuleStatu',
    'adminModuleStatuses': 'adminModuleStatus',
    'location': 'locations',
    'department': 'departments',
    'employee': 'employees',
    'moduleDefinition': 'module_definitions',
    'eventDeliveries': 'event_deliveries',
    'financeAccountBalance': 'finance_account_balances',
    'adminAuditEvent': 'adminAuditEvents',
    'adminRequest': 'adminRequests',
    'user': 'users',
    'userCompany': 'user_companies',
    'retailOrder': 'retailOrders',
    'retailOrderLine': 'retailOrderLines',
    'stockMovement': 'stockMovements',
    'inventoryPool': 'inventoryPools'
};

const filePatches = {}; // file -> { lineZeroIndexed: { bad, good } }

lines.forEach(line => {
    // Format: src/path/file.ts(17,31): error TS... Property 'X' does not exist... [Did you mean 'Y'?]
    // Or: ... but 'X' does not exist in type 'YInclude...'. [Did you mean to write 'Z'?]
    const match = line.match(/(src\/[^\\(]+)\((\d+),\d+\): error TS\d+: (.*)/);
    if (match) {
        const file = match[1];
        const lineNum = parseInt(match[2], 10) - 1; // 0-indexed
        const msg = match[3];

        let badProp = null;
        let goodProp = null;

        // Try extracting badProp
        const propMatch = msg.match(/Property '([^']+)'/);
        const objMatch = msg.match(/but '([^']+)' does not exist/);
        
        if (propMatch) badProp = propMatch[1];
        else if (objMatch) badProp = objMatch[1];

        // Try extracting goodProp
        const meanMatch = msg.match(/Did you mean (?:to write )?'([^']+)'/);
        if (meanMatch) goodProp = meanMatch[1];
        else if (badProp && manualMap[badProp]) goodProp = manualMap[badProp];

        if (badProp && goodProp) {
            if (!filePatches[file]) filePatches[file] = {};
            // Prefer the latest patch if multiple on same line? No we just store an array of patches per line
            if (!filePatches[file][lineNum]) filePatches[file][lineNum] = [];
            filePatches[file][lineNum].push({ bad: badProp, good: goodProp });
        }
    }
});

let patchedCount = 0;

for (const [file, linePatches] of Object.entries(filePatches)) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) continue;

    const fileLines = fs.readFileSync(fullPath, 'utf8').split('\n');

    for (const [lineIdxStr, patches] of Object.entries(linePatches)) {
        const lineIdx = parseInt(lineIdxStr, 10);
        let currentLine = fileLines[lineIdx];

        if (currentLine !== undefined) {
             patches.forEach(({ bad, good }) => {
                 // only replace the whole word
                 const regex = new RegExp(`\\b${bad}\\b`, 'g');
                 currentLine = currentLine.replace(regex, good);
             });
             fileLines[lineIdx] = currentLine;
             patchedCount++;
        }
    }

    fs.writeFileSync(fullPath, fileLines.join('\n'));
}

console.log(`Successfully applied ${patchedCount} line patches.`);
