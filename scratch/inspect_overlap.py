import pandas as pd

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
csv_path_root = r"C:\Users\user\Downloads\Bambu Silver\recovered_seminyak_opname.csv"
csv_path_semi = r"C:\Users\user\Downloads\Bambu Silver\Seminyak\recovered_seminyak_opname.csv"

# Read excel
df_excel = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)
df_excel.columns = ['SKU', 'Name', 'Category', 'Branch', 'Qty', 'Capital', 'Selling', 'U7', 'U8', 'U9']

# Filter excel for SS branch
df_ss = df_excel[df_excel['Branch'] == 'SS']
print("Excel 'SS' branch rows count:", len(df_ss))
print("Excel 'SS' branch first 5 rows:")
print(df_ss.head(5).to_string())

# Read CSVs
df_root = pd.read_csv(csv_path_root)
df_semi = pd.read_csv(csv_path_semi)

print("\nRoot CSV rows:", len(df_root))
print("Seminyak folder CSV rows:", len(df_semi))

# Let's see if the SKUs in the root CSV match the SS branch or all branches
# Compare root CSV SKUs with SS branch in excel
root_skus = set(df_root['SKU'].dropna())
ss_skus = set(df_ss['SKU'].dropna())
semi_skus = set(df_semi['SKU'].dropna())

print("\nSKU intersections:")
print("Root CSV SKUs intersection with Excel 'SS' SKUs:", len(root_skus.intersection(ss_skus)))
print("Seminyak folder CSV SKUs intersection with Excel 'SS' SKUs:", len(semi_skus.intersection(ss_skus)))
print("Root CSV SKUs intersection with ALL Excel SKUs:", len(root_skus.intersection(set(df_excel['SKU'].dropna()))))
print("Seminyak folder CSV SKUs intersection with ALL Excel SKUs:", len(semi_skus.intersection(set(df_excel['SKU'].dropna()))))

# Let's inspect some matching rows to see the quantities
common_skus = list(semi_skus.intersection(ss_skus))[:5]
print("\nComparing quantities for 5 common SKUs:")
for sku in common_skus:
    excel_qty = df_ss[df_ss['SKU'] == sku]['Qty'].values[0]
    semi_qty = df_semi[df_semi['SKU'] == sku]['Actual'].values[0]
    expected_qty = df_semi[df_semi['SKU'] == sku]['Expected'].values[0]
    print(f"SKU: {sku} | Excel Qty: {excel_qty} | CSV Expected: {expected_qty} | CSV Actual: {semi_qty}")
