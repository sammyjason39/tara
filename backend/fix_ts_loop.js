const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run() {
    console.log("Running tsc...");
    try {
        execSync('npx tsc --noEmit', { stdio: 'pipe' });
        console.log("SUCCESS! No TS errors.");
        return true;
    } catch (e) {
        const output = e.stdout.toString() + e.stderr.toString();
        const lines = output.split('\n');
        const patches = {};

        for (const line of lines) {
            // Format: src/path/file.ts(line,col): error TSxxx: message
            const match = line.match(/^([a-zA-Z0-9_\-\.\/\\]+\.ts)\((\d+),\d+\): error TS\d+: (.*)/);
            if (!match) continue;

            const file = match[1];
            const lineNum = parseInt(match[2], 10) - 1;
            const msg = match[3];

            let badProp = null;
            let goodProp = null;

            const propMatch = msg.match(/Property '([^']+)' does not exist/);
            const objMatch = msg.match(/but '([^']+)' does not exist/);
            
            if (propMatch) badProp = propMatch[1];
            else if (objMatch) badProp = objMatch[1];

            const meanMatch = msg.match(/Did you mean (?:to write )?'([^']+)'/);
            // Some specific known ones if compiler gives no suggestion
            if (meanMatch) {
                 goodProp = meanMatch[1];
            } else if (msg.includes("Property 'financeAccountBalance' does not exist")) {
                 goodProp = 'financeAccountBalance'; 
            } else if (badProp === 'sys_idempotency_keies') {
                 goodProp = 'sysIdempotencyKey';
            } else if (msg.includes("does not exist on type 'TransactionClient'") && badProp) {
                 // Try to guess from the prisma client if available? No, wait, if there's no suggestion, skip it or let the loop handle it
                 // Actually TransactionClient errors DONT have suggestions. But they are usually exactly camelCase.
                 continue; // We only parse explicit suggestions for safety.
            }

            if (badProp && goodProp) {
                if (!patches[file]) patches[file] = {};
                if (!patches[file][lineNum]) patches[file][lineNum] = [];
                patches[file][lineNum].push({ bad: badProp, good: goodProp });
            }
        }

        let applied = 0;
        for (const [file, linePatches] of Object.entries(patches)) {
            const fullPath = path.join(__dirname, file);
            if (!fs.existsSync(fullPath)) continue;

            const fileLines = fs.readFileSync(fullPath, 'utf8').split('\n');
            let modified = false;

            for (const [lineIdx, patchArr] of Object.entries(linePatches)) {
                let currentLine = fileLines[lineIdx];
                if (currentLine !== undefined) {
                    patchArr.forEach(({bad, good}) => {
                        const regex = new RegExp(`\\b${bad}\\b(?!')`, 'g');
                        // Prevent infinite loop if bad == good
                        if (bad !== good && currentLine.includes(bad)) {
                            currentLine = currentLine.replace(regex, good);
                            modified = true;
                            applied++;
                        }
                    });
                    fileLines[lineIdx] = currentLine;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, fileLines.join('\n'));
            }
        }
        
        console.log(`Applied ${applied} patches.`);
        if (applied === 0) {
            console.log("No patches could be applied. Aborting loop.");
            console.log(output.substring(0, 5000));
            return false; 
        }
        return false;
    }
}

// Run for a max of 3 iterations
let ok = false;
for (let i = 0; i < 3; i++) {
    console.log(`--- Iteration ${i+1} ---`);
    if (run()) {
        ok = true;
        break;
    }
}
if (!ok) console.log("Did not resolve all errors after max iterations.");

