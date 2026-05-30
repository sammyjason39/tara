import pandas as pd

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
df = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)
df.columns = ['SKU', 'Name', 'Category', 'Branch', 'Qty', 'Capital', 'Selling', 'U7', 'U8', 'U9']

print("Total rows in Excel sheet 'SaldoStockALL':", len(df))
print("Unique SKUs in Excel sheet:", df['SKU'].nunique())

# Group by branch and get count and total quantity
branch_stats = df.groupby('Branch').agg(
    rows_count=('SKU', 'count'),
    unique_skus=('SKU', 'nunique'),
    total_qty=('Qty', 'sum')
).reset_index()

print("\nBranch stats in Excel:")
print(branch_stats.to_string())
