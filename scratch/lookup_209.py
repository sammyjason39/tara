import pandas as pd

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
df = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)
df.columns = ['SKU', 'Name', 'Category', 'Branch', 'Qty', 'Capital', 'Selling', 'U7', 'U8', 'U9']

# Search for SKUs containing '209C'
matches = df[df['SKU'].astype(str).str.contains('209C', case=False)]
print("SKU matching '209C' in Excel:")
print(matches[['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates().to_string())

# Search for SKUs containing '209'
matches_209 = df[df['SKU'].astype(str).str.contains('209', case=False)]
print("\nFirst 10 SKUs matching '209' in Excel:")
print(matches_209[['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates().head(10).to_string())
