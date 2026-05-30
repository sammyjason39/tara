import pandas as pd

csv_path_root = r"C:\Users\user\Downloads\Bambu Silver\recovered_seminyak_opname.csv"
csv_path_semi = r"C:\Users\user\Downloads\Bambu Silver\Seminyak\recovered_seminyak_opname.csv"

df_root = pd.read_csv(csv_path_root)
print("--- Root CSV Head ---")
print("Columns:", df_root.columns.tolist())
print(df_root.head(5).to_string())

df_semi = pd.read_csv(csv_path_semi)
print("\n--- Seminyak Folder CSV Head ---")
print("Columns:", df_semi.columns.tolist())
print(df_semi.head(5).to_string())

print("\n--- Seminyak Folder CSV Summary Stats ---")
print("Actual Sum:", df_semi['Actual'].sum() if 'Actual' in df_semi.columns else 'N/A')
print("Expected Sum:", df_semi['Expected'].sum() if 'Expected' in df_semi.columns else 'N/A')

print("\n--- Root CSV Summary Stats ---")
# Check if Actual or Expected exist in root
for col in ['Actual', 'Expected', 'Qty', 'Actual Quantity']:
    if col in df_root.columns:
        print(f"{col} Sum:", df_root[col].sum())
