const fs = require('fs');

const tscOutput = fs.readFileSync('tsc_post_fix1.txt', 'utf8');
const lines = tscOutput.split('\n');
const changesByFile = {};

let currentFile = null;
let currentLine = null;
let currentCol = null;
let currentBad = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match TS2551
    const match2551 = line.match(/^(.*?)\((\d+),(\d+)\):\s*error\s*TS(2551|2339):\s*Property\s*'([^']+)'\s*does not exist/);
    if (match2551) {
        currentFile = match2551[1].trim();
        currentLine = parseInt(match2551[2], 10);
        currentCol = parseInt(match2551[3], 10);
        currentBad = match2551[5];
        
        const meanMatch = line.match(/Did you mean '([^']+)'\?/);
        if (meanMatch) {
            addChange(currentFile, currentLine, currentCol, currentBad, meanMatch[1]);
            currentFile = null;
        }
        continue;
    }

    // Match TS2561 (Object literal)
    const match2561 = line.match(/^(.*?)\((\d+),(\d+)\):\s*error\s*TS2561:\s*Object literal may only specify known properties, but\s*'([^']+)'\s*does not exist/);
    if (match2561) {
        currentFile = match2561[1].trim();
        currentLine = parseInt(match2561[2], 10);
        currentCol = parseInt(match2561[3], 10);
        currentBad = match2561[4];
        
        const meanMatch = line.match(/Did you mean( to write)? '([^']+)'\?/);
        if (meanMatch) {
            addChange(currentFile, currentLine, currentCol, currentBad, meanMatch[2]);
            currentFile = null;
        }
        continue;
    }
    
    // Look ahead if it wrapped over multiple lines
    if (currentFile && line.includes('Did you mean')) {
        const meanMatch = line.match(/Did you mean( to write)? '([^']+)'\?/);
        if (meanMatch) {
            addChange(currentFile, currentLine, currentCol, currentBad, meanMatch[2]);
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
    let dirty = false;
    
    for (const [lineStr, changes] of Object.entries(changesByLine)) {
        const lineNum = parseInt(lineStr, 10);
        let str = contentLines[lineNum - 1];
        if (str === undefined) continue;
        
        // Sort right to left
        changes.sort((a, b) => b.col - a.col);
        
        for (const change of changes) {
            const startIdx = change.col - 1;
            
            if (str.substring(startIdx, startIdx + change.bad.length) === change.bad) {
                str = str.substring(0, startIdx) + change.good + str.substring(startIdx + change.bad.length);
                totalReplacements++;
                dirty = true;
            } else {
                const regex = new RegExp(`\\b${change.bad}\\b`);
                if (regex.test(str)) {
                    str = str.replace(regex, change.good);
                    totalReplacements++;
                    dirty = true;
                } else if (change.bad === 'updated_at' || change.bad === 'created_at') {
                    // Quick fallback for common properties misaligned by comments
                    const fallbackRegex = new RegExp(`${change.bad}`);
                    if (fallbackRegex.test(str)) {
                        str = str.replace(fallbackRegex, change.good);
                        totalReplacements++;
                        dirty = true;
                    }
                }
            }
        }
        
        contentLines[lineNum - 1] = str;
    }
    
    if (dirty) {
        fs.writeFileSync(file, contentLines.join('\n'));
    }
}

console.log(`Successfully made ${totalReplacements} TS error replacements.`);
