const fs = require('fs');
const path = require('path');

const dbRepoPath = path.join(__dirname, 'src', 'core', 'hr', 'repositories', 'hr.db.repository.ts');
let dbContent = fs.readFileSync(dbRepoPath, 'utf8');

const dbReplacements = [
  [/\.user\./g, '.users.'],
  [/\.userCompany\./g, '.user_companies.'],
  [/\.candidate\./g, '.candidates.'],
];

for (const [regex, replacement] of dbReplacements) {
    dbContent = dbContent.replace(regex, replacement);
}
fs.writeFileSync(dbRepoPath, dbContent, 'utf8');


const mockRepoPath = path.join(__dirname, 'src', 'core', 'hr', 'repositories', 'hr.mock.repository.ts');
let mockContent = fs.readFileSync(mockRepoPath, 'utf8');

const mockReplacements = [
  [/positions: data\.newRole/g, 'position: data.newRole'],
];

for (const [regex, replacement] of mockReplacements) {
    mockContent = mockContent.replace(regex, replacement);
}
fs.writeFileSync(mockRepoPath, mockContent, 'utf8');

console.log('Fixed additional Prisma model accessors and property typos.');
