import pandas as pd
import json
import os

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
output_path = r"C:\Users\user\Downloads\Bambu Silver\excel_catalog.json"

print(f"Reading Excel from {excel_path}...")
df = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)

# Set columns
df.columns = ['SKU', 'Name', 'Category', 'Branch', 'Qty', 'Capital', 'Selling', 'U7', 'U8', 'U9']

# Convert to records
records = []
for idx, row in df.iterrows():
    sku = str(row['SKU']).strip()
    name = str(row['Name']).strip()
    category = str(row['Category']).strip()
    branch = str(row['Branch']).strip()
    qty = 0
    try:
        qty = float(row['Qty'])
        if pd.isna(row['Qty']):
            qty = 0
    except:
        pass

    capital = 0
    try:
        capital = float(row['Capital'])
        if pd.isna(row['Capital']):
            capital = 0
    except:
        pass

    selling = 0
    try:
        selling = float(row['Selling'])
        if pd.isna(row['Selling']):
            selling = 0
    except:
        pass

    # Skip rows that are clearly headers or empty
    if not sku or sku == 'nan' or sku == 'SKU':
        continue

    records.append({
        'sku': sku,
        'name': name,
        'category': category,
        'branch': branch,
        'qty': qty,
        'capital': capital,
        'selling': selling
    })

print(f"Total valid records parsed: {len(records)}")

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(records, f, indent=2, ensure_ascii=False)

print(f"Successfully wrote JSON to {output_path}")
