const fs = require('fs');
const path = require('path');

const schemaPath = 'c:/Users/user/Documents/Software-Developer/zenvix-demo/business-flow-suite-v2/backend/prisma/schema.prisma';
const content = fs.readFileSync(schemaPath, 'utf8');

const lines = content.split('\n');
const results = [];
let currentModel = null;
let hasUpdatedAt = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.startsWith('model ')) {
    if (currentModel && !hasUpdatedAt) {
      results.push(currentModel);
    }
    currentModel = line.split(' ')[1];
    hasUpdatedAt = false;
  } else if (line.includes('updated_at')) {
    hasUpdatedAt = true;
  } else if (line.startsWith('}') && currentModel) {
    if (!hasUpdatedAt) {
      results.push(currentModel);
    }
    currentModel = null;
  }
}

console.log(JSON.stringify(results, null, 2));
