const fs = require('fs');
const path = require('path');

// Read the latest TSC output
const tscOutput = fs.readFileSync('tsc_hr_current_fixed.txt', 'utf8');
const lines = tscOutput.split('\n');
const REPO_FILE = 'src/core/hr/repositories/hr.db.repository.ts';

const changes = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(REPO_FILE)) {
        const match = line.match(/\((\d+),(\d+)\): error TS(2551|2339|2561|2353):/);
        if (match) {
            const row = parseInt(match[1], 10);
            const col = parseInt(match[2], 10);
            
            // Find "Did you mean" in this line or next lines
            let suggestion = null;
            for (let j = i; j < i + 10 && j < lines.length; j++) {
                const meanMatch = lines[j].match(/Did you mean( to write)? '([^']+)'\?/);
                if (meanMatch) {
                    suggestion = meanMatch[2];
                    break;
                }
            }
            
            if (suggestion) {
                changes.push({ row, col, suggestion });
            }
        }
    }
}

if (changes.length === 0) {
    console.log('No "Did you mean" suggestions found for HR repository.');
    process.exit(0);
}

// Sort changes by row DESC and col DESC to avoid shifting
changes.sort((a, b) => {
    if (a.row !== b.row) return b.row - a.row;
    return b.col - a.col;
});

let repoContent = fs.readFileSync(REPO_FILE, 'utf8').split('\n');

for (const change of changes) {
    let line = repoContent[change.row - 1];
    if (!line) continue;
    
    // The error usually happens at a property access. 
    // We expect the "bad" word to be at change.col - 1
    // But sometimes TSC column is slightly off due to tabs/spaces.
    // We'll find the identifier around that column.
    
    const wordRegex = /[a-zA-Z0-9_]+/;
    const contentAfterCol = line.substring(change.col - 1);
    const wordMatch = contentAfterCol.match(wordRegex);
    
    if (wordMatch && wordMatch.index === 0) {
        const badWord = wordMatch[0];
        const newLine = line.substring(0, change.col - 1) + change.suggestion + line.substring(change.col - 1 + badWord.length);
        repoContent[change.row - 1] = newLine;
        console.log(`Fixed line ${change.row}: ${badWord} -> ${change.suggestion}`);
    } else {
        // Fallback: search for a candidate word around the column
        const lineStart = Math.max(0, change.col - 20);
        const lineEnd = Math.min(line.length, change.col + 20);
        const window = line.substring(lineStart, lineEnd);
        // This is riskier, but let's try to find an obvious mismatch if the col was off
        // Actually, let's just skip if not sure.
        console.log(`Could not confidently fix line ${change.row} at col ${change.col}. Window: "${window}"`);
    }
}

fs.writeFileSync(REPO_FILE, repoContent.join('\n'));
console.log(`Applied ${changes.length} TSC suggestions to HR repository.`);
