const fs = require('fs');

const output = fs.readFileSync('final_tsc_errors.txt', 'utf8');
const lines = output.split('\n');

const objErrors = {};

for (const line of lines) {
    if (line.includes("Object literal may only specify known properties")) {
        const match = line.match(/^([a-zA-Z0-9_\-\.\/\\]+\.ts)\(\d+,\d+\): error TS\d+: Object literal may only specify known properties, and '([^']+)' does not exist in type '([^']+)'/);
        if (match) {
            const prop = match[2];
            const type = match[3];
            const key = `'${prop}' in '${type}'`;
            objErrors[key] = (objErrors[key] || 0) + 1;
        }
    }
}

const sorted = Object.entries(objErrors).sort((a, b) => b[1] - a[1]);
console.log("Specific Object Literal Errors:");
for (const [msg, count] of sorted) {
    console.log(`${count}x: ${msg}`);
}
