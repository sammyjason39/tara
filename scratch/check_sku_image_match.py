import json
import os

excel_catalog_path = r"C:\Users\user\Downloads\Bambu Silver\excel_catalog.json"
db_images_map_path = r"scratch\item_images_map.json"

with open(excel_catalog_path, 'r', encoding='utf-8') as f:
    excel_catalog = json.load(f)

with open(db_images_map_path, 'r', encoding='utf-8') as f:
    db_images_map = json.load(f)

# Helper to normalize SKU
def normalize_sku(sku):
    if not sku:
        return ""
    # Strip spaces, make uppercase, replace dots/dashes
    return sku.strip().upper().replace('.', '').replace('-', '').replace(' ', '')

# Create normalized database map
db_normalized = {}
for sku, info in db_images_map.items():
    norm = normalize_sku(sku)
    if norm:
        db_normalized[norm] = info

# Let's count matches
total_excel = len(excel_catalog)
exact_matches = 0
norm_matches = 0
exact_has_picture = 0
norm_has_picture = 0

for item in excel_catalog:
    sku = item['sku']
    sku_norm = normalize_sku(sku)
    
    # Exact check
    if sku in db_images_map:
        exact_matches += 1
        if db_images_map[sku]['has_picture']:
            exact_has_picture += 1
            
    # Normalized check
    if sku_norm in db_normalized:
        norm_matches += 1
        if db_normalized[sku_norm]['has_picture']:
            norm_has_picture += 1

print(f"Total excel catalog entries: {total_excel}")
print(f"Exact SKU matches in DB: {exact_matches} (with picture: {exact_has_picture})")
print(f"Normalized SKU matches in DB: {norm_matches} (with picture: {norm_has_picture})")

# Let's check some examples of non-exact but normalized matches
non_exact_matches = []
for item in excel_catalog:
    sku = item['sku']
    sku_norm = normalize_sku(sku)
    if sku not in db_images_map and sku_norm in db_normalized:
        non_exact_matches.append((sku, sku_norm))
        if len(non_exact_matches) >= 10:
            break

if non_exact_matches:
    print("\nSome non-exact but normalized matches (Excel SKU -> Normalized SKU):")
    for ex_sku, norm_sku in non_exact_matches:
        print(f"  '{ex_sku}' -> '{norm_sku}'")
else:
    print("\nAll normalized matches were exact matches.")
