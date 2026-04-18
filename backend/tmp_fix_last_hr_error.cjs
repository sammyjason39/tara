const fs = require('fs');
const path = require('path');

const REPO_FILE = path.resolve(__dirname, '..', 'backend', 'src', 'core', 'hr', 'repositories', 'hr.db.repository.ts');
let content = fs.readFileSync(REPO_FILE, 'utf-8');

// The error was specifically in the getPositions include block
// target: include: { department: true,\n        location: true,\n        position: { include: { skill: true } },\n      },

// I'll replace the entire include block within getPositions
content = content.replace(/include: \{ department: true,\s+location: true,\s+position: \{ include: \{ skill: true \} \},\s+\},/g,
    "include: {\n        department: true,\n        location: true\n      },");

fs.writeFileSync(REPO_FILE, content);
console.log('✅ Final HR Repository fix applied!');
