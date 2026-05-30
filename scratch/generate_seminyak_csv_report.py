import json
import os
import re
import csv
from datetime import datetime

excel_catalog_path = r"C:\Users\user\Downloads\Bambu Silver\excel_catalog.json"
csv_path = r"C:\Users\user\Downloads\Bambu Silver\recovered_seminyak_opname.csv"
image_transcription_path = r"scratch\image_transcription.json"
db_images_map_path = r"scratch\item_images_map.json"
output_csv_path = r"C:\Users\user\Downloads\Bambu Silver\seminyak_stock_opname_report.csv"

# 1. Load Excel Catalog
with open(excel_catalog_path, 'r', encoding='utf-8') as f:
    excel_catalog = json.load(f)

# 2. Parse CSV Scans
csv_counts = {}
if os.path.exists(csv_path):
    with open(csv_path, 'r', encoding='utf-8') as f:
        # Skip header
        lines = f.readlines()[1:]
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Handle CSV fields
            match = re.match(r'^"([^"]*)","([^"]*)",(\d+)', line)
            if match:
                sku = match.group(1).strip()
                actual = int(match.group(3))
                if sku:
                    csv_counts[sku] = csv_counts.get(sku, 0) + actual

# 3. Load Image Counts
image_counts = {}
if os.path.exists(image_transcription_path):
    with open(image_transcription_path, 'r', encoding='utf-8') as f:
        image_counts = json.load(f)

# Load DB Images Map
db_images_map = {}
if os.path.exists(db_images_map_path):
    with open(db_images_map_path, 'r', encoding='utf-8') as f:
        db_images_map = json.load(f)

# Helper to normalize SKU for fallback matching
def normalize_sku(sku):
    if not sku:
        return ""
    return sku.strip().upper().replace('.', '').replace('-', '').replace(' ', '')

db_normalized = {}
for db_sku, info in db_images_map.items():
    norm = normalize_sku(db_sku)
    if norm:
        db_normalized[norm] = info

# 4. Merge Opname Counts
opname_counts = {**csv_counts}
for sku, count in image_counts.items():
    opname_counts[sku] = opname_counts.get(sku, 0) + count

# 5. Index Excel Catalog
excel_by_sku = {}
excel_seminyak_by_sku = {}

for record in excel_catalog:
    sku = record['sku']
    branch = record['branch']
    
    if sku not in excel_by_sku or (excel_by_sku[sku]['capital'] == 0 and record['capital'] > 0):
        excel_by_sku[sku] = record
        
    if branch == 'UBUD 1':
        excel_seminyak_by_sku[sku] = record

# Manual / New items
manual_items = {
    '585 557R': {
        'name': 'E.ZIRCONE MIX STAR 6MM (RED)',
        'category': 'ZIRCONIA',
        'capital': 21550,
        'selling': 200000
    },
    '580 209C': {
        'name': 'P.OPAL STONE W/RESIN C',
        'category': 'STONES',
        'capital': 244750,
        'selling': 890000
    }
}

# 6. Build Rows
all_skus = set(excel_seminyak_by_sku.keys()).union(opname_counts.keys())
rows = []

for sku in all_skus:
    cat_info = excel_by_sku.get(sku)
    if not cat_info and sku in manual_items:
        cat_info = manual_items[sku]
        
    name = cat_info['name'] if cat_info else f"[Unregistered] Barcode: {sku}"
    capital_price = cat_info['capital'] if cat_info else 0
    selling_price = cat_info['selling'] if cat_info else 0
    
    # Old Qty
    old_qty = excel_seminyak_by_sku[sku]['qty'] if sku in excel_seminyak_by_sku else 0
    
    # New Qty
    if sku in opname_counts:
        current_qty = opname_counts[sku]
    else:
        current_qty = old_qty
        
    total_capital = current_qty * capital_price
    total_selling = current_qty * selling_price
    
    # Have Picture or not
    has_db_pic = False
    if sku in db_images_map:
        has_db_pic = db_images_map[sku]['has_picture']
    else:
        sku_norm = normalize_sku(sku)
        if sku_norm in db_normalized:
            has_db_pic = db_normalized[sku_norm]['has_picture']

    have_picture = "Yes" if (has_db_pic or sku in image_counts) else "No"
    
    rows.append({
        'SKU': sku,
        'Name': name,
        'Old Qty': int(old_qty),
        'Current Qty': int(current_qty),
        'Capital Price': int(capital_price),
        'Total Capital': int(total_capital),
        'Selling Price': int(selling_price),
        'Total Selling': int(total_selling),
        'Have Picture': have_picture
    })

# Sort by SKU
rows = sorted(rows, key=lambda x: x['SKU'])

# Compute Totals
total_skus = len(rows)
total_old_qty = sum(r['Old Qty'] for r in rows)
total_current_qty = sum(r['Current Qty'] for r in rows)
total_capital_val = sum(r['Total Capital'] for r in rows)
total_selling_val = sum(r['Total Selling'] for r in rows)

# Write to CSV
with open(output_csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    
    # Metadata Header
    writer.writerow(["BAMBU SILVER - STOCK OPNAME REPORT"])
    writer.writerow(["Tenant ID", "tnt-3rlhko"])
    writer.writerow(["Company Name", "Bambu Silver"])
    writer.writerow(["Branch", "Seminyak (Ubud 1 in Catalog)"])
    writer.writerow(["Stock Opname Period", "18 - 20 May 2026"])
    writer.writerow(["Stock Opname Done By", "Clement Hansel and Ayi"])
    writer.writerow(["Date Generated", "21 May 2026"])
    writer.writerow(["Time Generated", "13:30"])
    writer.writerow([]) # Spacer
    
    # Contents Headers
    writer.writerow([
        "No",
        "SKU",
        "Name",
        "Old Quantity",
        "After Stock Opname Quantity",
        "Capital Value",
        "Total Capital Value",
        "Price Selling",
        "Total Selling Value",
        "Have Picture"
    ])
    
    # Data Rows
    for idx, r in enumerate(rows, 1):
        writer.writerow([
            idx,
            r['SKU'],
            r['Name'],
            r['Old Qty'],
            r['Current Qty'],
            r['Capital Price'],
            r['Total Capital'],
            r['Selling Price'],
            r['Total Selling'],
            r['Have Picture']
        ])
        
    writer.writerow([]) # Spacer before totals
    
    # Totals Row
    writer.writerow([
        "TOTALS",
        f"{total_skus} SKUs",
        "",
        int(total_old_qty),
        int(total_current_qty),
        "",
        int(total_capital_val),
        "",
        int(total_selling_val),
        ""
    ])
    
    writer.writerow([]) # Spacer before signatures
    writer.writerow([]) # Spacer
    
    # Signatures
    writer.writerow(["Signatures / Confirmations:"])
    writer.writerow([])
    writer.writerow(["_________________________", "", "_________________________", "", "_________________________", "", "_________________________"])
    writer.writerow(["Clement Hansel", "", "Ayi", "", "Shop keeper", "", "Estela"])
    writer.writerow(["Reporter / Opname", "", "Reporter / Opname", "", "Shop Keeper", "", "Manager / Owner"])

print(f"CSV Report successfully written to: {output_csv_path}")
