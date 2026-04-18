const fs = require('fs');
const path = require('path');

const compileErrorsPath = path.join(__dirname, '..', 'compile_errors_v4.txt');
const backendDir = path.join(__dirname, '..');

const compileErrors = fs.readFileSync(compileErrorsPath, 'utf8');
const lines = compileErrors.split('\n');

const fixesPerFile = {};

// Regex for Shorthand errors: No value exists in scope for the shorthand property '...'
const shorthandRegex = /^(.+)\((\d+),(\d+)\): error TS18004: No value exists in scope for the shorthand property '(\w+)'.+/;

for (const line of lines) {
    const match = line.match(shorthandRegex);
    if (match) {
        const [_, filePath, lineNum, colNum, propName] = match;
        const absPath = path.resolve(backendDir, filePath);
        if (!fixesPerFile[absPath]) fixesPerFile[absPath] = [];
        
        // Map common snake_case properties back to camelCase variables
        let varName = propName;
        if (propName === 'tenant_id') varName = 'tenantId';
        else if (propName === 'location_id') varName = 'locationId';
        else if (propName === 'product_id') varName = 'productId';
        else if (propName === 'employee_id') varName = 'employeeId';
        else if (propName === 'department_id') varName = 'departmentId';
        else if (propName === 'company_id') varName = 'companyId';
        else if (propName === 'created_at') varName = 'createdAt';
        else if (propName === 'updated_at') varName = 'updatedAt';
        else if (propName === 'resolved_by') varName = 'resolvedBy';
        else if (propName === 'requested_by') varName = 'requestedBy';
        else if (propName === 'invoice_id') varName = 'invoiceId';
        else if (propName === 'payment_id') varName = 'paymentId';

        fixesPerFile[absPath].push({ line: parseInt(lineNum), propName, varName });
    }
}

console.log(`Planned v4 fixes for ${Object.keys(fixesPerFile).length} files.`);

for (const absPath in fixesPerFile) {
    if (!fs.existsSync(absPath)) continue;
    const contentLines = fs.readFileSync(absPath, 'utf8').split('\n');
    const fixes = fixesPerFile[absPath];
    fixes.sort((a, b) => b.line - a.line);
    
    for (const fix of fixes) {
        const lineIndex = fix.line - 1;
        const originalLine = contentLines[lineIndex];
        if (originalLine && originalLine.includes(fix.propName)) {
            // Replace shorthand with explicit mapping
            // Note: need to be careful with regex to only match the shorthand part
            const regex = new RegExp(`\\b${fix.propName}\\b`, 'g');
            contentLines[lineIndex] = originalLine.replace(regex, `${fix.propName}: ${fix.varName}`);
        }
    }
    fs.writeFileSync(absPath, contentLines.join('\n'));
}

console.log('Remediation script v4 (shorthand fix) finished.');
