import pandas as pd

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
df = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)
df.columns = ['SKU', 'Name', 'Category', 'Branch', 'Qty', 'Capital', 'Selling', 'U7', 'U8', 'U9']

# Search for SKUs starting with '585 558' and '585 557'
matches = df[df['SKU'].astype(str).str.strip().str.startswith(('585 558', '585 557'))]
print("SKUs starting with 585 558 or 585 557:")
print(matches[['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates().to_string())
