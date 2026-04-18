const fs = require('fs');

const output = fs.readFileSync('final_tsc_errors.txt', 'utf8');
const lines = output.split('\n');

const exportErrors = {};

for (const line of lines) {
    if (line.includes("has no exported member named")) {
        const match = line.match(/^([a-zA-Z0-9_\-\.\/\\]+\.ts)\(\d+,\d+\): error TS\d+: '([^']+)' has no exported member named '([^']+)'/);
        if (match) {
            const member = match[3];
            const file = match[2];
            const key = `'${member}' from '${file}'`;
            exportErrors[key] = (exportErrors[key] || 0) + 1;
        }
    }
}

const sorted = Object.entries(exportErrors).sort((a, b) => b[1] - a[1]);
console.log("Specific Export Errors:");
for (const [msg, count] of sorted) {
    console.log(`${count}x: ${msg}`);
}
