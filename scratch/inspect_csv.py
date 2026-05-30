import pandas as pd

csv_path1 = r"C:\Users\user\Downloads\Bambu Silver\recovered_seminyak_opname.csv"
csv_path2 = r"C:\Users\user\Downloads\Bambu Silver\Seminyak\recovered_seminyak_opname.csv"

try:
    df1 = pd.read_csv(csv_path1)
    print("--- recovered_seminyak_opname.csv (root) ---")
    print("Shape:", df1.shape)
    print("Columns:", list(df1.columns))
    print("First 10 rows:")
    print(df1.head(10).to_string())
except Exception as e:
    print("Error reading root csv:", e)

try:
    df2 = pd.read_csv(csv_path2)
    print("\n--- recovered_seminyak_opname.csv (in Seminyak folder) ---")
    print("Shape:", df2.shape)
    print("Columns:", list(df2.columns))
    print("First 10 rows:")
    print(df2.head(10).to_string())
except Exception as e:
    print("Error reading Seminyak csv:", e)
