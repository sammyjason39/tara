import csv

csv_path = r"C:\Users\user\Downloads\Bambu Silver\seminyak_stock_opname_report.csv"

total_items = 0
yes_count = 0
no_count = 0
missing_sku_count = 0

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    
    # Read past the metadata headers (find where data table starts)
    started = False
    for row in reader:
        if not row:
            continue
        if row[0] == "No":
            started = True
            continue
        if row[0] == "TOTALS":
            break
        if started:
            total_items += 1
            have_pic = row[9] # 10th column is Have Picture (No=0, SKU=1, Name=2, Old Qty=3, Current Qty=4, Cap=5, TotCap=6, Sell=7, TotSell=8, Pic=9)
            if have_pic == "Yes":
                yes_count += 1
            elif have_pic == "No":
                no_count += 1
            else:
                missing_sku_count += 1

print("--- Seminyak CSV Report Picture Statistics ---")
print(f"Total Rows: {total_items}")
print(f"Have Picture = 'Yes': {yes_count} ({yes_count/total_items*100:.2f}%)")
print(f"Have Picture = 'No': {no_count} ({no_count/total_items*100:.2f}%)")
if missing_sku_count > 0:
    print(f"Other values in Have Picture column: {missing_sku_count}")
