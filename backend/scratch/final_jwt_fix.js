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
  if (content.includes('expiresIn: "1d"')) {
    content = content.replace(/expiresIn: "1d"/g, 'expiresIn: "1d" as any');
    fs.writeFileSync(filePath, content);
    console.log(`Fixed expiresIn in ${filePath}`);
  }
});
