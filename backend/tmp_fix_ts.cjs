const fs = require('fs');

const tscOutput = fs.readFileSync('tsc_post_transform.txt', 'utf8');
const lines = tscOutput.split('\n');

const changesByFile = {};

// We need to parse wrapped lines properly
// A typical TSC error: src/core/hr/repositories/hr.db.repository.ts(75,19): error TS2551: Property 'employees' does not exist on type 'PrismaService'. Did you mean 'employee'?
// If it wraps, it might be:
// src/core/...ts(75,19): error TS2551: Property 'employees' does not exist...
// 'PrismaService'. Did you mean 'employee'?

let currentFile = null;
let currentLine = null;
let currentCol = null;
let currentBad = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const fileMatch = line.match(/^(.*?)\((\d+),(\d+)\):\s*error\s*TS2551:\s*Property\s*'([^']+)'\s*does not exist/);
    if (fileMatch) {
        currentFile = fileMatch[1].trim();
        currentLine = parseInt(fileMatch[2], 10);
        currentCol = parseInt(fileMatch[3], 10);
        currentBad = fileMatch[4];
        
        // try to find "Did you mean" on same line
        const meanMatch = line.match(/Did you mean '([^']+)'\?/);
        if (meanMatch) {
            addChange(currentFile, currentLine, currentCol, currentBad, meanMatch[1]);
            currentFile = null;
        }
        continue;
    }
    
    if (currentFile && line.includes('Did you mean')) {
        const meanMatch = line.match(/Did you mean '([^']+)'\?/);
        if (meanMatch) {
            addChange(currentFile, currentLine, currentCol, currentBad, meanMatch[1]);
            currentFile = null;
        }
    }
}

function addChange(file, line, col, bad, good) {
    if (!changesByFile[file]) {
        changesByFile[file] = {};
    }
    if (!changesByFile[file][line]) {
        changesByFile[file][line] = [];
    }
    changesByFile[file][line].push({ col, bad, good });
}

let totalReplacements = 0;

for (const [file, changesByLine] of Object.entries(changesByFile)) {
    if (!fs.existsSync(file)) continue;
    
    let contentLines = fs.readFileSync(file, 'utf8').split('\n');
    
    for (const [lineStr, changes] of Object.entries(changesByLine)) {
        const lineNum = parseInt(lineStr, 10);
        // 0-based index for lines
        let str = contentLines[lineNum - 1];
        
        // Sort changes right to left to avoid shifting column indices
        changes.sort((a, b) => b.col - a.col);
        
        for (const change of changes) {
            // ts col is 1-based, but is it the start of the word or the end?
            // "src/core/...ts(75,19): error TS2551: Property 'employees'"
            const startIdx = change.col - 1;
            
            // Validate that the property actually exists at this position
            if (str.substring(startIdx, startIdx + change.bad.length) === change.bad) {
                str = str.substring(0, startIdx) + change.good + str.substring(startIdx + change.bad.length);
                totalReplacements++;
            } else {
                // If it doesn't match exactly (sometimes col is slightly off by 1 or due to tabs), 
                // fallback to regex replace of that exact word in the line
                const regex = new RegExp(`\\b${change.bad}\\b`);
                if (regex.test(str)) {
                    str = str.replace(regex, change.good);
                    totalReplacements++;
                }
            }
        }
        
        contentLines[lineNum - 1] = str;
    }
    
    fs.writeFileSync(file, contentLines.join('\n'));
}

console.log(`Successfully made ${totalReplacements} TS2551 replacements.`);
