import os
import pandas as pd

semi_dir = r"C:\Users\user\Downloads\Bambu Silver\Seminyak"
files = os.listdir(semi_dir)
csv_files = [f for f in files if f.endswith('.csv') and f != 'recovered_seminyak_opname.csv']

print(f"Found {len(csv_files)} other CSV files in Seminyak folder:")
csv_files_info = []
for f in csv_files:
    path = os.path.join(semi_dir, f)
    try:
        df = pd.read_csv(path)
        csv_files_info.append({
            'file': f,
            'rows': len(df),
            'actual_sum': df['Actual'].sum() if 'Actual' in df.columns else df['Actual Quantity'].sum() if 'Actual Quantity' in df.columns else 'N/A'
        })
    except Exception as e:
        csv_files_info.append({'file': f, 'rows': 'Error', 'actual_sum': str(e)})

print(pd.DataFrame(csv_files_info).to_string())
