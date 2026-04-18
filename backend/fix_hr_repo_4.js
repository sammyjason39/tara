const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'core', 'hr', 'repositories', 'hr.db.repository.ts');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  [/\.hrAttendanceRecord\./g, '.hr_attendance_records.'],
  [/\.scheduleAssignment\./g, '.schedule_assignments.'],
  [/\.leaveRequest\./g, '.leave_requests.'],
];

for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed final camelCase Prisma models.');
