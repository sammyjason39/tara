import pandas as pd

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
df = pd.read_excel(excel_path, sheet_name="SaldoStockALL", header=None)
branches = df[3].dropna().unique()
print("Unique branches in excel:")
print(branches)

# Check what Categories exist
categories = df[2].dropna().unique()
print("\nUnique categories in excel:")
print(categories[:20]) # Print first 20 categories
