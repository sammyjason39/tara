import pandas as pd

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
df = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)
df.columns = ['SKU', 'Name', 'Category', 'Branch', 'Qty', 'Capital', 'Selling', 'U7', 'U8', 'U9']

prefixes = ['580', '534', '531', '532', '429']
for pref in prefixes:
    matches = df[df['SKU'].astype(str).str.strip().str.startswith(pref)]
    print(f"Prefix '{pref}': found {len(matches)} rows. First 10 unique SKUs and Names:")
    print(matches[['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates().head(10).to_string())
    print("-" * 50)
