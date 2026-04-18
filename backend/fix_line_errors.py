import os
import re

BASE = r'c:\Users\user\Documents\Software-Developer\zenvix-demo\business-flow-suite-v2\backend'

def fix_line(rel_path, line_num, transform):
    """Apply transform fn to a specific 0-indexed line."""
    filepath = os.path.join(BASE, rel_path.replace('/', os.sep))
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    idx = line_num - 1
    original = lines[idx]
    lines[idx] = transform(original)
    if lines[idx] != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"  FIXED line {line_num} in {rel_path}")
    else:
        print(f"  WARN no change at line {line_num} in {rel_path}: {original.strip()}")

def replace_in_file(rel_path, old, new):
    filepath = os.path.join(BASE, rel_path.replace('/', os.sep))
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  FIXED '{old[:40]}' in {rel_path}")
    else:
        print(f"  WARN not found: '{old[:40]}' in {rel_path}")

# ─── TS7006: implicit any in private method params ────────────────────────────

# ar-customer.db.repository.ts(71): `private mapToDomain(item): IArCustomer`
fix_line('src/core/finance/ar/repositories/ar-customer.db.repository.ts', 71,
    lambda l: l.replace('private mapToDomain(item):', 'private mapToDomain(item: any):'))

# ar-invoice.db.repository.ts(152): `private mapToDomain(item): IArInvoice`
fix_line('src/core/finance/ar/repositories/ar-invoice.db.repository.ts', 152,
    lambda l: l.replace('private mapToDomain(item):', 'private mapToDomain(item: any):'))
# ar-invoice.db.repository.ts(171): `private mapLineToDomain(line): IArInvoiceLine`
fix_line('src/core/finance/ar/repositories/ar-invoice.db.repository.ts', 171,
    lambda l: l.replace('private mapLineToDomain(line):', 'private mapLineToDomain(line: any):'))

# ar-payment.db.repository.ts: include name + private map params
replace_in_file('src/core/finance/ar/repositories/ar-payment.db.repository.ts',
    'include: { finance_ar_payment_allocation: true }',
    'include: { finance_ar_payment_allocations: true }')
fix_line('src/core/finance/ar/repositories/ar-payment.db.repository.ts', 84,
    lambda l: l.replace('private mapToDomain(item):', 'private mapToDomain(item: any):'))
fix_line('src/core/finance/ar/repositories/ar-payment.db.repository.ts', 100,
    lambda l: l.replace('private mapAllocationToDomain(item):', 'private mapAllocationToDomain(item: any):'))

# ar-payment.mock.repository.ts: `allocations` → `allocation`, and `(a) =>` → `(a: any) =>`
replace_in_file('src/core/finance/ar/repositories/ar-payment.mock.repository.ts',
    'this.allocations', 'this.allocation')
replace_in_file('src/core/finance/ar/repositories/ar-payment.mock.repository.ts',
    '.filter(a =>', '.filter((a: any) =>')
replace_in_file('src/core/finance/ar/repositories/ar-payment.mock.repository.ts',
    '.find(a =>', '.find((a: any) =>')

# ar-invoice.service.ts(122): inventorySubledgerEntry → inventory_subledger_entries
replace_in_file('src/core/finance/ar/services/ar-invoice.service.ts',
    '.inventorySubledgerEntry.', '.inventory_subledger_entries.')

# asset.db.repository.ts(38): `location: asset` → `location: asset.location`
fix_line('src/core/finance/repositories/asset.db.repository.ts', 38,
    lambda l: l.replace('location: asset || ', "location: (asset as any).location || "))
# asset.db.repository.ts(60): private mapToDomain(item)
fix_line('src/core/finance/repositories/asset.db.repository.ts', 60,
    lambda l: l.replace('private mapToDomain(item):', 'private mapToDomain(item: any):'))

# coa.db.repository.ts(83): private mapToDomain(item)
fix_line('src/core/finance/repositories/coa.db.repository.ts', 83,
    lambda l: l.replace('private mapToDomain(item):', 'private mapToDomain(item: any):'))

# finance.db.repository.ts
fix_line('src/core/finance/repositories/finance.db.repository.ts', 252,
    lambda l: l.replace('location: asset', "location: (asset as any).location"))
fix_line('src/core/finance/repositories/finance.db.repository.ts', 369,
    lambda l: l.replace('.shift()', '.shifts()') if '.shift()' in l else l.replace("'shift'", "'shifts'"))
fix_line('src/core/finance/repositories/finance.db.repository.ts', 561,
    lambda l: l.replace('department:', 'departments:'))
fix_line('src/core/finance/repositories/finance.db.repository.ts', 783,
    lambda l: l.replace('department:', 'departments:'))
fix_line('src/core/finance/repositories/finance.db.repository.ts', 1282,
    lambda l: l.replace('.sort((a,', '.sort((a: any,').replace('.sort((a ,', '.sort((a: any,'))
fix_line('src/core/finance/repositories/finance.db.repository.ts', 1308,
    lambda l: l.replace('.filter(c =>', '.filter((c: any) =>').replace('filter(c,', 'filter((c: any),'))

# journal.db.repository.ts(178): private mapToDomain(item)
fix_line('src/core/finance/repositories/journal.db.repository.ts', 178,
    lambda l: l.replace('private mapToDomain(item):', 'private mapToDomain(item: any):'))

# vendor.db.repository.ts(72): private mapToDomain(item)
fix_line('src/core/finance/repositories/vendor.db.repository.ts', 72,
    lambda l: l.replace('private mapToDomain(item):', 'private mapToDomain(item: any):'))

# payment-lifecycle.service.ts: allocations → allocation
replace_in_file('src/core/finance/services/payment-lifecycle.service.ts',
    'allocations.map', 'allocation.map')
replace_in_file('src/core/finance/services/payment-lifecycle.service.ts',
    'allocations.filter', 'allocation.filter')
replace_in_file('src/core/finance/services/payment-lifecycle.service.ts',
    'const allocations', 'const allocation')

print("\nNow fixing TS7006 in service/worker files (arrow fn params)...")

# These files had arrow function params stripped of `: any`. 
# We read each file and apply regex to restore them at the exact lines.

# Map of file -> [(line_number_1based, regex_old, regex_new)]
line_fixes = {
    'src/core/finance/services/audit-certification.service.ts': [
        (36, r'\.forEach\(obj\b', '.forEach((obj: any)'),
    ],
    'src/core/finance/services/bank-ingestion.service.ts': [
        (28, r'\.filter\(v\b', '.filter((v: any)'),
    ],
    'src/core/finance/services/cashflow.service.ts': [
        (19, r'\.forEach\(obj\b', '.forEach((obj: any)'),
    ],
    'src/core/finance/services/consolidation-report.service.ts': [
        (259, r'\.map\(payload\b', '.map((payload: any)'),
    ],
    'src/core/finance/services/financial-dashboard.service.ts': [
        (205, r'\.map\(data\b', '.map((data: any)'),
        (220, r'\.forEach\(obj\b', '.forEach((obj: any)'),
    ],
    'src/core/finance/services/forecast.service.ts': [
        (85, r'\.forEach\(obj\b', '.forEach((obj: any)'),
    ],
    'src/core/finance/services/insight.service.ts': [
        (42, r'\.forEach\(obj\b', '.forEach((obj: any)'),
        (60, r'\.forEach\(obj\b', '.forEach((obj: any)'),
        (141, r'\.map\(metrics\b', '.map((metrics: any)'),
    ],
    'src/core/finance/services/journal-validation.service.ts': [
        (10, r'\(journal\b', '(journal: any'),
        (18, r'\(journal\b', '(journal: any'),
    ],
    'src/core/finance/services/ledger-event-ingestion-worker.service.ts': [
        (63, r'\.map\(event\b', '.map((event: any)'),
    ],
    'src/core/finance/services/recommendation.service.ts': [
        (118, r'\.forEach\(obj\b', '.forEach((obj: any)'),
    ],
    'src/core/finance/services/reporting-engine.service.ts': [
        (23, r'\(obj\b', '(obj: any'),
        (43, r'\(data\b', '(data: any'),
    ],
    'src/core/finance/subledger/repositories/inventory-subledger.db.repository.ts': [
        (13, r'\(dbEntry\b', '(dbEntry: any'),
        (49, r'\(dbLayer\b', '(dbLayer: any'),
    ],
    'src/core/finance/workers/ap-aging-projection.worker.ts': [
        (14, r'\.map\(event\b', '.map((event: any)'),
        (35, r'\.map\(bucket\b', '.map((bucket: any)'),
    ],
    'src/core/finance/workers/ar-aging-projection.worker.ts': [
        (15, r'\.map\(event\b', '.map((event: any)'),
        (37, r'\.map\(bucket\b', '.map((bucket: any)'),
    ],
}

for rel_path, fixes in line_fixes.items():
    filepath = os.path.join(BASE, rel_path.replace('/', os.sep))
    if not os.path.exists(filepath):
        print(f"  SKIP: {rel_path}")
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    changed = False
    for (line_num, pattern, replacement) in fixes:
        idx = line_num - 1
        if idx < len(lines):
            new_line = re.sub(pattern, replacement, lines[idx])
            if new_line != lines[idx]:
                print(f"  REGEX FIX line {line_num} in {rel_path}: {lines[idx].strip()} → {new_line.strip()}")
                lines[idx] = new_line
                changed = True
            else:
                print(f"  WARN no match at line {line_num} in {rel_path}: {lines[idx].strip()}")
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)

print("\nAll fixes applied.")
