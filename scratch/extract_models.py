schema_path = r"c:\Users\user\Documents\Software-Developer\zenvix-demo\business-flow-suite-v2\prisma\schema.prisma"

def extract_model(model_name):
    with open(schema_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    in_model = False
    model_lines = []
    for idx, line in enumerate(lines):
        if line.strip().startswith(f"model {model_name}"):
            in_model = True
            model_lines.append(f"{idx+1}: {line}")
            continue
        if in_model:
            model_lines.append(f"{idx+1}: {line}")
            if line.strip() == "}":
                in_model = False
                break
    return "".join(model_lines)

print("--- Model: item_masters ---")
print(extract_model("item_masters"))

print("\n--- Model: stock_levels ---")
print(extract_model("stock_levels"))
