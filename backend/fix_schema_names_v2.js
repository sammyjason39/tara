const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../myschema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toPascal = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

// 1. Identify all models (find both snake and Pascal already there)
const modelMatches = [...content.matchAll(/model\s+(\w+)\s+{/g)];
const models = modelMatches.map(m => m[1]);

console.log(`Found ${models.length} models.`);

// 2. Create mapping
const mapping = {};
models.forEach(name => {
  // If it's plural snake_case, or has underscores, or is lowercase
  if (name.includes('_') || name === name.toLowerCase()) {
    mapping[name] = toPascal(name);
  }
});

console.log(`Identified ${Object.keys(mapping).length} models to rename.`);

// 3. Global string replacement for types
// This is the "sledgehammer" approach: replace all occurrences of the snake_case name 
// when it appears as a standalone word (type or model name).
let newContent = content;

// Sort by length descending to avoid partial matches (e.g. "user" vs "user_company")
const sortedKeys = Object.keys(mapping).sort((a,b) => b.length - a.length);

for (const snake of sortedKeys) {
  const pascal = mapping[snake];
  if (snake === pascal) continue;

  // Regex to match the word 'snake' but NOT when it's part of a property name 
  // (Prisma properties are usually camelCase or snake_case followed by a type)
  // Actually, in Prisma, types follow property names: "propertyName Type"
  // So we look for " Type" or " Type[" or " Type?"
  
  // Replace model definition
  const modelDefRegex = new RegExp(`model\\s+${snake}\\s+{`, 'g');
  newContent = newContent.replace(modelDefRegex, `model ${pascal} {`);

  // Replace as a type
  const typeRegex = new RegExp(`(\\s+)${snake}(\\s|[\\?\\[])`, 'g');
  newContent = newContent.replace(typeRegex, `$1${pascal}$2`);
}

// 4. Ensure @@map exists for renamed models
const lines = newContent.split('\n');
let currentModel = null;
let hasMap = false;
const processedLines = [];

for (let line of lines) {
  const modelMatch = line.match(/^model\s+(\w+)\s+{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    hasMap = false;
  }
  
  if (line.includes('@@map')) {
    hasMap = true;
  }

  if (line.trim() === '}' && currentModel) {
    // Look up original snake name from reverse mapping
    const originalSnake = Object.keys(mapping).find(key => mapping[key] === currentModel);
    if (originalSnake && !hasMap && originalSnake !== currentModel) {
      processedLines.push(`  @@map("${originalSnake}")`);
    }
    currentModel = null;
  }
  processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Schema V2 repair complete.');
