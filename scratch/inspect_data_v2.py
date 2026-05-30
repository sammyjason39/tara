import openpyxl
import pandas as pd
import os

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"

try:
    xl = pd.ExcelFile(excel_path)
    print("Sheets:", xl.sheet_names)
    for name in xl.sheet_names:
        df = pd.read_excel(excel_path, sheet_name=name, header=None)
        print(f"\n--- Sheet: {name} (First 20 rows) ---")
        print(df.head(20).to_string())
except Exception as e:
    print("Error:", e)

print("\n--- Testing OCR / Image packages ---")
libs = ['easyocr', 'pytesseract', 'PIL', 'cv2', 'pdf2image']
for lib in libs:
    try:
        __import__(lib)
        print(f"Library {lib}: Available")
    except ImportError:
        print(f"Library {lib}: NOT Available")
