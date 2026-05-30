import openpyxl

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
wb = openpyxl.load_workbook(excel_path, read_only=True)
print("Sheet names:")
for name in wb.sheetnames:
    print(name)
