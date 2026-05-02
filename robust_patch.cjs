const fs = require('fs');
const path = require('path');

const targetDir = path.join(process.cwd(), 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

// More robust regex to find .filter() or .map() calls
// It looks for things like: someVar.map( or some.nested.var.filter(
const findRegex = /([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[^\]]+\])*)\s*(\?\.|\.)(filter|map)\s*\(/g;

const files = walk(targetDir);
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    content = content.replace(findRegex, (match, expr, op, method, index) => {
        // Skip if already patched
        const lookbehind = content.substring(Math.max(0, index - 50), index);
        if (lookbehind.includes('Array.isArray(' + expr + ')')) {
            return match;
        }

        // Skip built-in objects
        if (['Array', 'Object', 'JSON', 'Math', 'console', 'fs', 'path', 'Promise', 'React'].includes(expr)) return match;
        
        // Skip if it looks like a chained call (preceded by a closing parenthesis or another dot)
        const charBefore = content[index - 1];
        if (charBefore === ')' || charBefore === '.') {
            return match;
        }

        console.log(`Patching ${method} on ${expr} in ${path.basename(file)}`);
        return `(Array.isArray(${expr}) ? ${expr} : []).${method}(`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content);
    }
});
