import fs from 'fs';
import path from 'path';

export interface AuditEntry {
  category: string;
  feature: string;
  status: 'Operational' | 'Degraded' | 'Broken';
  details: string;
  timestamp: string;
}

export class AuditLog {
  private static logPath = path.join(process.cwd(), 'playwright-report', 'audit-summary.json');

  static append(entry: Omit<AuditEntry, 'timestamp'>) {
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    let logs: AuditEntry[] = [];
    if (fs.existsSync(this.logPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(this.logPath, 'utf-8'));
      } catch (e) {
        logs = [];
      }
    } else {
      // Ensure directory exists
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    logs.push(fullEntry);
    fs.writeFileSync(this.logPath, JSON.stringify(logs, null, 2));
    console.log(`[AUDIT] ${fullEntry.status}: ${fullEntry.feature} (${fullEntry.details})`);
  }

  static clear() {
    if (fs.existsSync(this.logPath)) {
      fs.unlinkSync(this.logPath);
    }
  }
}
