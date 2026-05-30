import pandas as pd

excel_path = r"C:\Users\user\Downloads\Bambu Silver\SaldoStockALL2.xlsx"
for sheet in ["SaldoStockALL", "Sheet2"]:
    try:
        df = pd.read_excel(excel_path, sheet_name=sheet, header=None)
        # Search for seminyak
        matches = []
        for r_idx, row in df.iterrows():
            for c_idx, val in enumerate(row):
                if pd.notna(val) and "seminyak" in str(val).lower():
                    matches.append((r_idx, c_idx, val))
        if matches:
            print(f"Sheet '{sheet}': found matches:")
            for m in matches:
                print(f"Row {m[0]}, Col {m[1]}: {m[2]}")
        else:
            print(f"Sheet '{sheet}': No matches for 'seminyak'")
    except Exception as e:
        print(f"Error reading sheet '{sheet}': {e}")
