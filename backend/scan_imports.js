const fs = require('fs');
const path = require('path');

function checkExports() {
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

    console.log('--- STARTING EXPORT RESOLUTION CHECK ---');
    files.forEach(file => {
        try {
            // We can't easily require .ts files directly in node without ts-node/register
            // but we can check the import paths.
            const content = fs.readFileSync(file, 'utf8');
            const imports = content.matchAll(/import { (\w+) } from ['"](.+)['"]/g);
            for (const match of imports) {
                const [full, name, location] = match;
                if (name.endsWith('Module')) {
                   // Check if the location exists
                   const resolved = path.resolve(path.dirname(file), location);
                   const tsPath = resolved + '.ts';
                   const tsPathIndex = path.join(resolved, 'index.ts');
                   const tsPathModule = resolved + '.module.ts';
                   
                   if (!fs.existsSync(tsPath) && !fs.existsSync(tsPathIndex) && !fs.existsSync(tsPathModule) && !resolved.includes('persistence')) {
                       console.log(`[WARNING] Potential broken import in ${file}: ${name} from ${location} (Resolved: ${resolved})`);
                   }
                }
            }
        } catch (e) {}
    });
    console.log('--- CHECK COMPLETE ---');
}

checkExports();
