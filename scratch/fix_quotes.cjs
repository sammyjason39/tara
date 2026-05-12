const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const srcDir = 'c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/src';
const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Unescape escaped quotes
    content = content.replace(/\\"/g, '"');
    
    // General unicode unescape \uXXXX
    content = content.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Fixed ${file}`);
    }
});
