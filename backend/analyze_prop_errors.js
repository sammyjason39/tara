const fs = require('fs');

const output = fs.readFileSync('final_tsc_errors.txt', 'utf8');
const lines = output.split('\n');

const propErrors = {};
let currentError = null;

for (const line of lines) {
    if (line.includes("Property") && line.includes("does not exist")) {
        const match = line.match(/^([a-zA-Z0-9_\-\.\/\\]+\.ts)\(\d+,\d+\): error TS\d+: Property '([^']+)' does not exist on type '([^']+)'/);
        if (match) {
            const prop = match[2];
            const type = match[3];
            const key = `'${prop}' on '${type}'`;
            propErrors[key] = (propErrors[key] || 0) + 1;
        }
    }
}

const sorted = Object.entries(propErrors).sort((a, b) => b[1] - a[1]);
console.log("Specific Property Errors:");
for (const [msg, count] of sorted) {
    console.log(`${count}x: ${msg}`);
}
