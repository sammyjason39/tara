const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../myschema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const toPascal = (s) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

// Models to NOT change (already CamelCase or special)
const skip = new Set(['companies', 'users', 'locations', 'departments', 'FnbRecipe', 'FnbIngredient', 'FarmingSensorLog', 'ClinicReservation']);

// 1. Find all models
const modelMatches = [...content.matchAll(/model\s+([a-z_][a-z0-9_]*)\s+{/g)];
const mapping = {};

modelMatches.forEach(m => {
  const name = m[1];
  if (!skip.has(name)) {
    mapping[name] = toPascal(name);
  } else {
    mapping[name] = name;
  }
});

console.log(`Mapping ${Object.keys(mapping).length} models...`);

// 2. Process models
let newContent = content;

// Replace model definitions and add @@map if missing
for (const [snake, pascal] of Object.entries(mapping)) {
  if (snake === pascal) continue;

  const modelRegex = new RegExp(`model\\s+${snake}\\s+{`, 'g');
  newContent = newContent.replace(modelRegex, (match) => {
    return `model ${pascal} {`;
  });

  // Check for @@map in this model's block
  // This is tricky with regex, so we'll do a simpler sweep for all models later
}

// 3. Replace usages in types (e.g. "field snake[]" or "field snake")
// We look for patterns like ": snake" or " snake[" or " snake " or " snake?"
for (const [snake, pascal] of Object.entries(mapping)) {
  if (snake === pascal) continue;
  
  // Relations: FieldName snake @relation... or fieldName snake[] or fieldName snake?
  const typeRegex = new RegExp(`(\\s+)${snake}(\\s|[\\?\\[])`, 'g');
  newContent = newContent.replace(typeRegex, `$1${pascal}$2`);
}

// 4. Ensure @@map exists for all renamed models
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
    if (!hasMap) {
      // Find original snake name
      const originalSnake = Object.keys(mapping).find(key => mapping[key] === currentModel);
      if (originalSnake && originalSnake !== currentModel) {
        processedLines.push(`  @@map("${originalSnake}")`);
      }
    }
    currentModel = null;
  }
  processedLines.push(line);
}

fs.writeFileSync(schemaPath, processedLines.join('\n'));
console.log('Schema PascalCase restoration complete.');
