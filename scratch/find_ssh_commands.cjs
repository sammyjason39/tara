const fs = require('fs');
const path = require('path');

const logDir = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\6f9d7d0a-dd3a-4bea-b832-3d1b778da3dd\\.system_generated\\logs';
const transcriptPath = path.join(logDir, 'transcript.jsonl');

if (!fs.existsSync(transcriptPath)) {
  console.log('Transcript file not found at:', transcriptPath);
  return;
}

const content = fs.readFileSync(transcriptPath, 'utf8');
const lines = content.split('\n');

console.log('Searching for ssh command runs...');
lines.forEach((line, idx) => {
  if (line.includes('run_command')) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
          if (tc.name === 'run_command' && (tc.args.CommandLine.includes('ssh') || tc.args.CommandLine.includes('vps') || tc.args.CommandLine.includes('scp') || tc.args.CommandLine.includes('logs'))) {
            console.log(`Step ${obj.step_index}: ${tc.args.CommandLine}`);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }
});
