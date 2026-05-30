import pandas as pd
import os

csv_path_root = r"C:\Users\user\Downloads\Bambu Silver\recovered_seminyak_opname.csv"
csv_path_semi = r"C:\Users\user\Downloads\Bambu Silver\Seminyak\recovered_seminyak_opname.csv"

df_root = pd.read_csv(csv_path_root)
df_semi = pd.read_csv(csv_path_semi)

target_skus = ['429 041A', '534 212AG', '580 209C', '580.209C', '531 566ED', '531.566ED', '532 948A', '531 578RC', '531 993RA', '531.993RA', '532 570BA', '429 102R']

print("--- Checking target SKUs in Root CSV ---")
for sku in target_skus:
    match = df_root[df_root['SKU'].astype(str).str.strip().str.contains(sku, case=False, na=False)]
    if len(match) > 0:
        print(f"Found in Root CSV: SKU='{sku}'")
        print(match.to_string())

print("\n--- Checking target SKUs in Seminyak folder CSV ---")
for sku in target_skus:
    match = df_semi[df_semi['SKU'].astype(str).str.strip().str.contains(sku, case=False, na=False)]
    if len(match) > 0:
        print(f"Found in Seminyak Folder CSV: SKU='{sku}'")
        print(match.to_string())
