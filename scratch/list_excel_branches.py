import json

with open(r"C:\Users\user\Downloads\Bambu Silver\excel_catalog.json", 'r', encoding='utf-8') as f:
    catalog = json.load(f)

branches = {}
for r in catalog:
    b = r['branch']
    branches[b] = branches.get(b, 0) + 1

print("Excel unique branches:")
for b, count in branches.items():
    print(f"Branch: {b} | Count: {count}")
