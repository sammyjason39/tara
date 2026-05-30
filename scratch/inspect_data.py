import openpyxl
import pandas as pd
import json
import os

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"

print("Checking excel file path existence:", os.path.exists(excel_path))

try:
    xl = pd.ExcelFile(excel_path)
    print("Sheet names:", xl.sheet_names)
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        print(f"\n--- Sheet: {sheet} ---")
        print("Shape:", df.shape)
        print("Columns:", list(df.columns))
        print("First 5 rows:")
        print(df.head(5))
except Exception as e:
    print("Error reading excel:", e)
