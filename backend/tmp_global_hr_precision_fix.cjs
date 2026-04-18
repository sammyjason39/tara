const fs = require('fs');
const path = require('path');

// Read the latest TSC output for HR
const tscOutput = fs.readFileSync('tsc_hr_after_backend_gen.txt', 'utf8');
const lines = tscOutput.split('\n');

const changesByFile = {};

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(src\/core\/hr\/[^:\(]+)\((\d+),(\d+)\): error TS(2551|2339|2561|2353):/);
    if (match) {
        const file = match[1];
        const row = parseInt(match[2], 10);
        const col = parseInt(match[3], 10);
        
        let suggestion = null;
        for (let j = i; j < i + 10 && j < lines.length; j++) {
            const meanMatch = lines[j].match(/Did you mean( to write)? '([^']+)'\?/);
            if (meanMatch) {
                suggestion = meanMatch[2];
                break;
            }
        }
        
        if (suggestion) {
            if (!changesByFile[file]) changesByFile[file] = [];
            changesByFile[file].push({ row, col, suggestion });
        }
    }
}

for (const [file, changes] of Object.entries(changesByFile)) {
    if (!fs.existsSync(file)) continue;
    
    let content = fs.readFileSync(file, 'utf8').split('\n');
    // Sort changes by row DESC and col DESC
    changes.sort((a, b) => {
        if (a.row !== b.row) return b.row - a.row;
        return b.col - a.col;
    });

    for (const s of changes) {
        let line = content[s.row - 1];
        if (!line) continue;
        
        const lineContentAfter = line.substring(s.col - 1);
        const identifier = lineContentAfter.match(/^[a-zA-Z0-9_]+/);
        if (identifier) {
            const badWord = identifier[0];
            content[s.row - 1] = line.substring(0, s.col - 1) + s.suggestion + line.substring(s.col - 1 + badWord.length);
        }
    }
    
    fs.writeFileSync(file, content.join('\n'));
    console.log(`Applied ${changes.length} TSC suggestions to ${file}`);
}
