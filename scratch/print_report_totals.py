import pandas as pd

report_path = r"C:\Users\user\Downloads\Bambu Silver\seminyak_stock_opname_report.xlsx"
# Load starting from row 4 (which is header row, 0-indexed as row 3)
df = pd.read_excel(report_path, skiprows=3)

# Exclude the grand total row if it's there
df_clean = df[df['SKU'] != 'GRAND TOTAL']

old_qty = df_clean['Old Qty'].sum()
curr_qty = df_clean['Current Qty'].sum()
total_capital = df_clean['Total Capital'].sum()
total_selling = df_clean['Total Selling'].sum()

print("--- SEMINYAK BRANCH STOCK OPNAME REPORT VALUATIONS ---")
print(f"Total Unique SKUs in Report: {len(df_clean)}")
print(f"Grand Total Old Quantity: {old_qty:,.0f} units")
print(f"Grand Total Current Quantity (Opname + Fallback): {curr_qty:,.0f} units")
print(f"Grand Total Valuation (Capital Cost): Rp {total_capital:,.2f}")
print(f"Grand Total Valuation (Selling Price): Rp {total_selling:,.2f}")
