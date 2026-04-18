const fs = require('fs');
const path = require('path');

function findCircular() {
    const modules = {};
    const files = [];

    function walk(dir) {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (file !== 'node_modules' && file !== 'dist') walk(fullPath);
            } else if (file.endsWith('.module.ts')) {
                files.push(fullPath);
            }
        });
    }

    walk('src');

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const classNameMatch = content.match(/export class (\w+)/);
        const className = classNameMatch ? classNameMatch[1] : path.basename(file);
        
        const imports = [];
        const importMatches = content.matchAll(/import { \w+ } from ['"](.+)['"]/g);
        for (const match of importMatches) {
            if (match[1].endsWith('.module') || match[1].includes('.module')) {
                imports.push(match[1]);
            }
        }
        modules[className] = { path: file, imports };
    });

    console.log(JSON.stringify(modules, null, 2));
}

findCircular();
