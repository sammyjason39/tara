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

const replacements = [
  { from: '\\.tenantId', to: '.tenant_id' },
  { from: '\\.companyId', to: '.company_id' },
  { from: '\\.locationId', to: '.location_id' },
  { from: '\\.userId', to: '.user_id' },
  { from: 'tenantId:', to: 'tenant_id:' },
  { from: 'companyId:', to: 'company_id:' },
  { from: 'locationId:', to: 'location_id:' },
  { from: 'userId:', to: 'user_id:' },
  { from: 'createdAt:', to: 'created_at:' },
  { from: 'updatedAt:', to: 'updated_at:' },
  { from: 'deletedAt:', to: 'deleted_at:' }
];

let filesChanged = 0;

walk(srcDir, (filePath) => {
  if (!filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const rep of replacements) {
    const regex = new RegExp(rep.from, 'g');
    content = content.replace(regex, rep.to);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    filesChanged++;
  }
});

console.log(`Systemically standardized casing in ${filesChanged} files.`);
