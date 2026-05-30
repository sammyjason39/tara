import pandas as pd

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
df = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)
df.columns = ['SKU', 'Name', 'Category', 'Branch', 'Qty', 'Capital', 'Selling', 'U7', 'U8', 'U9']

# Filter items starting with '100' in SKU
df_100 = df[df['SKU'].astype(str).str.strip().str.startswith('100')]
print("All items starting with '100' in SKU (unique combinations of SKU and Name):")
print(df_100[['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates().to_string())

# Search for names containing 'Anchor' or 'Ulir'
print("\nItems with 'Anchor' in name:")
print(df[df['Name'].astype(str).str.contains('Anchor', case=False)][['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates().head(10).to_string())

print("\nItems with 'Ulir' in name:")
print(df[df['Name'].astype(str).str.contains('Ulir', case=False)][['SKU', 'Name', 'Category', 'Capital', 'Selling']].drop_duplicates().head(10).to_string())
