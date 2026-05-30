const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\user\\Downloads\\Bambu Silver\\Seminyak';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.csv'));

files.forEach(f => {
  const tsMatch = f.match(/\d+/);
  if (tsMatch) {
    const ts = parseInt(tsMatch[0]);
    console.log(`${f} -> ${new Date(ts).toISOString()}`);
  }
});
