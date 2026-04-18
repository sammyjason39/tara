const fs = require('fs');
const path = require('path');

const REPO_FILE = path.resolve(__dirname, '..', 'backend', 'src', 'core', 'hr', 'repositories', 'hr.db.repository.ts');
const tscOutput = fs.readFileSync(path.resolve(__dirname, '..', 'backend', 'tsc_final_verify.txt'), 'utf8');

const lines = tscOutput.split('\n');
const suggestions = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('src/core/hr/repositories/hr.db.repository.ts')) {
        const match = line.match(/\((\d+),(\d+)\): error TS(2551|2339|2561|2353):/);
        if (match) {
            const row = parseInt(match[1], 10);
            const col = parseInt(match[2], 10);
            
            let suggestion = null;
            // Look for "Did you mean" in the immediate vicinity
            for (let j = i; j < i + 10 && j < lines.length; j++) {
                const meanMatch = lines[j].match(/Did you mean( to write)? '([^']+)'\?/);
                if (meanMatch) {
                    suggestion = meanMatch[2];
                    break;
                }
            }
            
            if (suggestion) {
                suggestions.push({ row, col, suggestion });
            }
        }
    }
}

console.log(`Found ${suggestions.length} suggestions.`);

let repoContent = fs.readFileSync(REPO_FILE, 'utf8').split('\n');
// Sort by row/col descending
suggestions.sort((a,b) => {
    if (a.row !== b.row) return b.row - a.row;
    return b.col - a.col;
});

let applied = 0;
for (const s of suggestions) {
    let line = repoContent[s.row - 1];
    if (!line) continue;
    
    const content = line.substring(s.col - 1);
    const identifier = content.match(/^[a-zA-Z0-9_]+/);
    if (identifier) {
        const badWord = identifier[0];
        repoContent[s.row - 1] = line.substring(0, s.col - 1) + s.suggestion + line.substring(s.col - 1 + badWord.length);
        applied++;
    }
}

fs.writeFileSync(REPO_FILE, repoContent.join('\n'));
console.log(`Successfully applied ${applied} TSC suggestions to HR repository!`);
