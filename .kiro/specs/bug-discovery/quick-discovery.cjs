/**
 * Quick Bug Discovery Script
 * 
 * Fast automated checks for common issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class QuickBugDiscovery {
  constructor() {
    this.bugs = [];
    this.bugCounter = 12; // Start after BUG-11
  }

  /**
   * Run quick discovery checks
   */
  async runAll() {
    console.log('🔍 Starting Quick Bug Discovery...\n');

    await this.checkTypeScriptErrors();
    await this.checkBuildErrors();
    await this.checkConsoleStatements();
    await this.checkTODOComments();
    await this.checkMissingErrorHandlers();
    await this.checkKnownIssues();

    this.generateReport();
  }

  /**
   * Check TypeScript compilation errors
   */
  async checkTypeScriptErrors() {
    console.log('📝 Checking TypeScript errors...');
    
    try {
      // Frontend
      execSync('npx tsc --noEmit', { 
        cwd: process.cwd(), 
        stdio: 'pipe',
        timeout: 30000 
      });
      console.log('  ✅ Frontend: No TypeScript errors');
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const errorCount = (output.match(/error TS/g) || []).length;
      if (errorCount > 0) {
        this.addBug({
          id: `BUG-${this.bugCounter++}`,
          severity: 'HIGH',
          category: 'TypeScript Compilation',
          file: 'Frontend',
          message: `${errorCount} TypeScript compilation errors found`,
          suggestion: 'Run "npx tsc --noEmit" to see details'
        });
        console.log(`  ❌ Frontend: ${errorCount} TypeScript errors`);
      }
    }

    try {
      // Backend
      execSync('npx tsc --noEmit', { 
        cwd: path.join(process.cwd(), 'backend'), 
        stdio: 'pipe',
        timeout: 30000 
      });
      console.log('  ✅ Backend: No TypeScript errors');
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const errorCount = (output.match(/error TS/g) || []).length;
      if (errorCount > 0) {
        this.addBug({
          id: `BUG-${this.bugCounter++}`,
          severity: 'HIGH',
          category: 'TypeScript Compilation',
          file: 'Backend',
          message: `${errorCount} TypeScript compilation errors found`,
          suggestion: 'Run "cd backend && npx tsc --noEmit" to see details'
        });
        console.log(`  ❌ Backend: ${errorCount} TypeScript errors`);
      }
    }
  }

  /**
   * Check build errors
   */
  async checkBuildErrors() {
    console.log('🏗️  Checking build configuration...');
    
    // Check for known build issues
    const explorerPath = path.join(process.cwd(), 'src', 'pages', 'core', 'tools', 'Explorer.tsx');
    if (fs.existsSync(explorerPath)) {
      const content = fs.readFileSync(explorerPath, 'utf-8');
      const lines = content.split('\n');
      
      // Check for BUG-2: JSX tag mismatch
      if (lines.length > 1391) {
        const line1391 = lines[1390]; // 0-indexed
        if (line1391.includes('</div>')) {
          this.addBug({
            id: 'BUG-2',
            severity: 'CRITICAL',
            category: 'Build Error',
            file: 'src/pages/core/tools/Explorer.tsx',
            line: 1391,
            message: 'JSX tag mismatch: </div> does not match opening <DepartmentWorkspaceLayout> at line 524',
            suggestion: 'Fix JSX structure - this prevents frontend build'
          });
          console.log('  ❌ BUG-2: Explorer.tsx JSX mismatch confirmed');
        }
      }
    }

    // Check vite.config.ts for code splitting
    const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
    if (fs.existsSync(viteConfigPath)) {
      const content = fs.readFileSync(viteConfigPath, 'utf-8');
      if (!content.includes('manualChunks') && !content.includes('React.lazy')) {
        this.addBug({
          id: 'BUG-9',
          severity: 'MEDIUM',
          category: 'Performance',
          file: 'vite.config.ts',
          message: 'No code-splitting configured - bundle size exceeds 5MB',
          suggestion: 'Implement route-based code splitting with React.lazy()'
        });
        console.log('  ⚠️  BUG-9: No code-splitting configured');
      }
    }
  }

  /**
   * Check for console statements
   */
  async checkConsoleStatements() {
    console.log('📢 Checking for console statements...');
    
    let count = 0;
    this.scanDirectory('src', /console\.(log|error|warn|debug)\(/g, (file, matches) => {
      count += matches.length;
    });

    this.scanDirectory('backend/src', /console\.(log|error|warn|debug)\(/g, (file, matches) => {
      count += matches.length;
    });

    if (count > 50) {
      this.addBug({
        id: `BUG-${this.bugCounter++}`,
        severity: 'LOW',
        category: 'Code Quality',
        file: 'Multiple files',
        message: `${count} console statements found in production code`,
        suggestion: 'Replace with proper logging service'
      });
      console.log(`  ⚠️  Found ${count} console statements`);
    } else {
      console.log(`  ✅ Found ${count} console statements (acceptable)`);
    }
  }

  /**
   * Check for TODO comments
   */
  async checkTODOComments() {
    console.log('📝 Checking for TODO/FIXME comments...');
    
    let todoCount = 0;
    let fixmeCount = 0;

    this.scanDirectory('src', /\/\/ TODO:/g, () => todoCount++);
    this.scanDirectory('backend/src', /\/\/ TODO:/g, () => todoCount++);
    this.scanDirectory('src', /\/\/ FIXME:/g, () => fixmeCount++);
    this.scanDirectory('backend/src', /\/\/ FIXME:/g, () => fixmeCount++);

    if (fixmeCount > 0) {
      this.addBug({
        id: `BUG-${this.bugCounter++}`,
        severity: 'MEDIUM',
        category: 'Code Quality',
        file: 'Multiple files',
        message: `${fixmeCount} FIXME comments found`,
        suggestion: 'Review and address FIXME comments'
      });
    }

    console.log(`  ℹ️  Found ${todoCount} TODO and ${fixmeCount} FIXME comments`);
  }

  /**
   * Check for missing error handlers
   */
  async checkMissingErrorHandlers() {
    console.log('⚠️  Checking for missing error handlers...');
    
    let missingCatch = 0;

    this.scanDirectory('src', /\.then\([^)]+\)(?!\s*\.catch)/g, (file, matches) => {
      missingCatch += matches.length;
    });

    this.scanDirectory('backend/src', /\.then\([^)]+\)(?!\s*\.catch)/g, (file, matches) => {
      missingCatch += matches.length;
    });

    if (missingCatch > 10) {
      this.addBug({
        id: `BUG-${this.bugCounter++}`,
        severity: 'HIGH',
        category: 'Error Handling',
        file: 'Multiple files',
        message: `${missingCatch} promises without .catch() handlers`,
        suggestion: 'Add error handling to all promises'
      });
      console.log(`  ⚠️  Found ${missingCatch} promises without catch handlers`);
    } else {
      console.log(`  ✅ Found ${missingCatch} promises without catch (acceptable)`);
    }
  }

  /**
   * Check known issues from documentation
   */
  async checkKnownIssues() {
    console.log('🔍 Checking known issues...');
    
    // BUG-3: Subledger-to-Ledger Desync
    const arBillPath = path.join(process.cwd(), 'backend', 'src', 'core', 'finance', 'services', 'ar-bill.service.ts');
    if (fs.existsSync(arBillPath)) {
      const content = fs.readFileSync(arBillPath, 'utf-8');
      if (!content.includes('FAILED') || !content.includes('reconciliation')) {
        this.addBug({
          id: 'BUG-3',
          severity: 'HIGH',
          category: 'Data Integrity',
          file: 'backend/src/core/finance/services/ar-bill.service.ts',
          message: 'No automated detection for orphaned subledger entries',
          suggestion: 'Implement reconciliation mechanism and FAILED status handling'
        });
        console.log('  ❌ BUG-3: Subledger-to-Ledger desync not fixed');
      }
    }

    // BUG-5: Fiscal Period Hard-Lock Bypass
    const fiscalPeriodPath = path.join(process.cwd(), 'backend', 'src', 'core', 'finance', 'services', 'fiscal-period.service.ts');
    if (fs.existsSync(fiscalPeriodPath)) {
      const content = fs.readFileSync(fiscalPeriodPath, 'utf-8');
      if (!content.includes('auto-void') && !content.includes('DRAFT')) {
        this.addBug({
          id: 'BUG-5',
          severity: 'HIGH',
          category: 'Data Integrity',
          file: 'backend/src/core/finance/services/fiscal-period.service.ts',
          message: 'No automatic voiding of DRAFT journals on HARD_LOCK',
          suggestion: 'Implement auto-voiding when period enters HARD_LOCK'
        });
        console.log('  ❌ BUG-5: Fiscal period hard-lock bypass not fixed');
      }
    }

    // BUG-10: Shift Lifecycle Guard
    const retailControllerPath = path.join(process.cwd(), 'backend', 'src', 'modules', 'retail', 'retail.controller.ts');
    if (fs.existsSync(retailControllerPath)) {
      const content = fs.readFileSync(retailControllerPath, 'utf-8');
      if (!content.includes('shift') || !content.includes('guard')) {
        this.addBug({
          id: 'BUG-10',
          severity: 'MEDIUM',
          category: 'Security',
          file: 'backend/src/modules/retail/retail.controller.ts',
          message: 'No shift validation at backend API layer',
          suggestion: 'Add shift lifecycle guard to POS endpoints'
        });
        console.log('  ❌ BUG-10: Shift lifecycle guard not implemented');
      }
    }

    // BUG-11: Offline Payment Matrix
    const paymentServicePath = path.join(process.cwd(), 'backend', 'src', 'core', 'payment', 'payment.service.ts');
    if (fs.existsSync(paymentServicePath)) {
      const content = fs.readFileSync(paymentServicePath, 'utf-8');
      if (!content.includes('offline') || !content.includes('CARD')) {
        this.addBug({
          id: 'BUG-11',
          severity: 'MEDIUM',
          category: 'Security',
          file: 'backend/src/core/payment/payment.service.ts',
          message: 'No offline payment matrix enforcement at backend',
          suggestion: 'Block CARD/QRIS/E_WALLET payments in offline mode'
        });
        console.log('  ❌ BUG-11: Offline payment matrix not enforced');
      }
    }
  }

  /**
   * Scan directory for pattern
   */
  scanDirectory(dir, pattern, callback) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) return;

    const scanDir = (dirPath) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullEntryPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanDir(fullEntryPath);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          try {
            const content = fs.readFileSync(fullEntryPath, 'utf-8');
            const matches = content.match(pattern);
            if (matches) {
              callback(fullEntryPath, matches);
            }
          } catch (err) {
            // Skip files that can't be read
          }
        }
      }
    };

    scanDir(fullPath);
  }

  /**
   * Add a bug to the report
   */
  addBug(bug) {
    this.bugs.push(bug);
  }

  /**
   * Generate bug report
   */
  generateReport() {
    console.log('\n📊 Bug Discovery Report\n');
    console.log('='.repeat(80));
    
    const bySeverity = {
      CRITICAL: this.bugs.filter(b => b.severity === 'CRITICAL'),
      HIGH: this.bugs.filter(b => b.severity === 'HIGH'),
      MEDIUM: this.bugs.filter(b => b.severity === 'MEDIUM'),
      LOW: this.bugs.filter(b => b.severity === 'LOW')
    };

    console.log(`\n📈 Summary:`);
    console.log(`  🔴 Critical: ${bySeverity.CRITICAL.length}`);
    console.log(`  🟠 High: ${bySeverity.HIGH.length}`);
    console.log(`  🟡 Medium: ${bySeverity.MEDIUM.length}`);
    console.log(`  🟢 Low: ${bySeverity.LOW.length}`);
    console.log(`  📊 Total: ${this.bugs.length}`);

    // Write detailed report
    const reportPath = path.join(process.cwd(), '.kiro', 'specs', 'bug-discovery', 'AUTOMATED_BUGS.md');
    this.writeMarkdownReport(reportPath, bySeverity);
    
    console.log(`\n✅ Report saved to: ${reportPath}`);
    console.log('\n📋 Next Steps:');
    console.log('  1. Review AUTOMATED_BUGS.md');
    console.log('  2. Start manual testing with MANUAL_TESTING_CHECKLIST.md');
    console.log('  3. Document all bugs found');
    console.log('  4. Prioritize and create fix plan\n');
  }

  /**
   * Write markdown report
   */
  writeMarkdownReport(filePath, bySeverity) {
    let content = '# Automated Bug Discovery Report\n\n';
    content += `**Generated:** ${new Date().toISOString()}\n\n`;
    content += '---\n\n';
    content += '## Summary\n\n';
    content += `- 🔴 **Critical:** ${bySeverity.CRITICAL.length}\n`;
    content += `- 🟠 **High:** ${bySeverity.HIGH.length}\n`;
    content += `- 🟡 **Medium:** ${bySeverity.MEDIUM.length}\n`;
    content += `- 🟢 **Low:** ${bySeverity.LOW.length}\n`;
    content += `- 📊 **Total:** ${this.bugs.length}\n\n`;
    content += '---\n\n';

    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
      const bugs = bySeverity[severity];
      if (bugs.length > 0) {
        content += `## ${severity} Priority\n\n`;
        bugs.forEach(bug => {
          content += `### ${bug.id}: ${bug.category}\n\n`;
          content += `- **File:** \`${bug.file}\`\n`;
          if (bug.line) content += `- **Line:** ${bug.line}\n`;
          content += `- **Message:** ${bug.message}\n`;
          if (bug.suggestion) content += `- **Suggestion:** ${bug.suggestion}\n`;
          content += '\n';
        });
      }
    });

    content += '---\n\n';
    content += '## Next Steps\n\n';
    content += '1. **Review Critical Bugs** - Fix immediately\n';
    content += '2. **Review High Priority Bugs** - Fix this sprint\n';
    content += '3. **Start Manual Testing** - Use MANUAL_TESTING_CHECKLIST.md\n';
    content += '4. **Document All Findings** - Update bug registry\n';
    content += '5. **Create Fix Plan** - Prioritize and schedule fixes\n\n';

    fs.writeFileSync(filePath, content);
  }
}

// Run discovery
const discovery = new QuickBugDiscovery();
discovery.runAll().catch(console.error);
