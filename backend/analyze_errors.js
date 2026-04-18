const fs = require('fs');

const output = fs.readFileSync('final_tsc_errors.txt', 'utf8');
const lines = output.split('\n');

const errors = {};
let currentError = null;

for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9_\-\.\/\\]+\.ts)\((\d+),\d+\): error TS(\d+): (.*)/);
    if (match) {
        let msg = match[4];
        // clean up msg to make it generic for grouping
        msg = msg.replace(/'[^']+'/g, "'X'"); // replace all quoted strings with 'X'
        msg = msg.replace(/type '{[^}]+}'/g, "type '{...}'");
        
        errors[msg] = (errors[msg] || 0) + 1;
    }
}

const sorted = Object.entries(errors).sort((a, b) => b[1] - a[1]);
console.log("Unique Error Patterns:");
for (const [msg, count] of sorted) {
    console.log(`${count}x: ${msg}`);
}
