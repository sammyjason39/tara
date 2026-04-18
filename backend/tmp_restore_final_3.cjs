const fs = require('fs');
const path = require('path');

const REPO_FILE = path.resolve(__dirname, '..', 'backend', 'src', 'core', 'hr', 'repositories', 'hr.db.repository.ts');
let content = fs.readFileSync(REPO_FILE, 'utf-8');

// Pattern 1: Performance Trends
// target: orderBy: {\n\s+select: { rating: true },\n\s+});
content = content.replace(/orderBy: \{\s+select: \{ rating: true \},\s+\}\);/g, 
    "orderBy: { updatedAt: 'desc' },\n      select: { rating: true, updatedAt: true },\n    });");

// Pattern 2: Retention Risk
// target: include: {\n\s+position: {\n\s+orderBy: {\n\s+take: 2,\n\s+},\n\s+},\n\s+});
content = content.replace(/include: \{\s+position: \{\s+orderBy: \{\s+take: 2,\s+\},\s+\},\s+\}\);/g,
    "include: {\n        position: {\n          orderBy: { id: 'desc' },\n          take: 2,\n        },\n      },\n    });");

// Pattern 3: Performance History
// target: orderBy: {\n\s+select: {\n\s+id: true,
content = content.replace(/orderBy: \{\s+select: \{\s+id: true,/g,
    "orderBy: { id: 'desc' },\n      select: {\n        id: true,");

fs.writeFileSync(REPO_FILE, content);
console.log('✅ Surgical syntax fixes applied to hr.db.repository.ts');
