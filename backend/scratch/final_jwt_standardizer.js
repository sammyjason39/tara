const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/src';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'dist') return;
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk(srcDir, (filePath) => {
  if (!filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('jwt.sign')) {
    console.log(`Found jwt.sign in: ${filePath}`);
    // Check if it already has (jwt.sign as any)
    if (!content.includes('(jwt.sign as any)')) {
       // Perform the fix
       content = content.replace(/jwt\.sign/g, '(jwt.sign as any)');
       fs.writeFileSync(filePath, content);
       console.log(`Fixed jwt.sign in ${filePath}`);
    }
  }
});
