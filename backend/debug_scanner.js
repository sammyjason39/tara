const fs = require('fs');
const path = require('path');

// Mock @Module decorator to capture metadata
function Module(metadata) {
  return (target) => {
    target.__NEST_METADATA__ = metadata;
    return target;
  };
}

// Mock other decorators
const Injectable = () => (t) => t;
const Global = () => (t) => t;
const Controller = () => (t) => t;
const Inject = () => (t, p, i) => {};
const forwardRef = (fn) => {
  const wrapper = { __isForwardRef: true, forwardRef: fn };
  wrapper.toString = () => 'forwardRef(' + fn.toString() + ')';
  return wrapper;
};

// Mock @nestjs/common
const nestCommon = { Module, Injectable, Global, Controller, Inject, forwardRef };
require.cache[require.resolve('@nestjs/common')] = { exports: nestCommon };

const rootPath = path.join(process.cwd(), 'src', 'app.module.ts');

function scan(moduleClass, name, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}Scanning: ${name}`);

  if (!moduleClass) {
    console.error(`${indent}!!! CRITICAL: Module "${name}" is UNDEFINED`);
    return;
  }

  const metadata = moduleClass.__NEST_METADATA__;
  if (!metadata) {
    // console.log(`${indent}(No Nest metadata found for ${name})`);
    return;
  }

  const imports = metadata.imports || [];
  for (let i = 0; i < imports.length; i++) {
    const imp = imports[i];
    let impClass = imp;
    let impName = 'Unknown';

    if (imp && imp.__isForwardRef) {
      console.log(`${indent}  -> [forwardRef] ...`);
      try {
        impClass = imp.forwardRef();
      } catch (e) {
        console.error(`${indent}  !!! Error resolving forwardRef in ${name} at index ${i}`);
        continue;
      }
    }

    if (impClass && impClass.name) {
      impName = impClass.name;
    } else if (impClass === undefined) {
      console.error(`${indent}  !!! CRITICAL: Import at index ${i} in "${name}" is UNDEFINED`);
      continue;
    }

    // Skip scanning known broad modules to avoid deep recursion if not needed yet
    if (['ScheduleModule', 'ThrottlerModule'].includes(impName)) continue;

    scan(impClass, impName, depth + 1);
  }
}

try {
  // Transpile-less check (requires the files to be somewhat node-compatible or use a specialized loader)
  // For now, I'll just check the AppModule file for any obvious 'undefined' in the array
  const content = fs.readFileSync(rootPath, 'utf8');
  console.log('--- AppModule Check ---');
  const lines = content.split('\n');
  const importsMatch = content.match(/imports:\s*\[([\s\S]*?)\]/);
  if (importsMatch) {
    console.log('Detected imports array items:');
    const items = importsMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('//'));
    items.forEach(item => {
        console.log(` - ${item}`);
    });
  }

  console.log('\n--- Deep Variable Verification (Requires Compilation) ---');
  console.log('Note: This check is best run after a successful "npm run build" to verify the dist folder.');

} catch (e) {
  console.error('Diagnostic failed:', e);
}
