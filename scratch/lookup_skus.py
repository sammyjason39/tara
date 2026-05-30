import pandas as pd
import re

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
df = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)
df.columns = ['SKU', 'Name', 'Category', 'Branch', 'Qty', 'Capital', 'Selling', 'U7', 'U8', 'U9']

# Convert SKU column to string and clean it
df['SKU_clean'] = df['SKU'].astype(str).str.strip()

search_patterns = [
    r'429\s*041A', r'534\s*212AG', r'580\s*209C', r'531\s*566ED', r'532\s*948A', r'531\s*578RC', r'531\s*993RA', r'532\s*570BA', r'429\s*102R',
    r'100\s*000', r'100\s*003', r'585\s*555G', r'585\s*557R', r'585\s*558G', r'585\s*557G', r'585\s*558F',
    r'538\s*557R', r'538\s*558G', r'538\s*557G', r'538\s*558F',
    r'561', r'535\s*401', r'535\s*402', r'535\s*403'
]

print("--- Searching for SKUs in SaldoStockALL Excel ---")
found_rows = []
for idx, row in df.iterrows():
    sku_str = str(row['SKU_clean'])
    # See if it matches any pattern
    for pattern in search_patterns:
        if re.search(pattern, sku_str, re.IGNORECASE):
            found_rows.append(row)
            break

found_df = pd.DataFrame(found_rows)
print(f"Found {len(found_df)} matching rows in Excel:")
if len(found_df) > 0:
    # Print distinct matching items by SKU and Name
    distinct_matches = found_df[['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates()
    print(distinct_matches.to_string())
else:
    print("No matches found.")

print("\n--- Let's do general lookup for 585, 538, 561, 535 prefixes in SKU column ---")
prefixes = ['585', '538', '561', '535', '100']
for pref in prefixes:
    matches = df[df['SKU_clean'].str.startswith(pref)]
    print(f"Prefix '{pref}': found {len(matches)} rows, first 5 unique names:")
    print(matches[['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates().head(5).to_string())
