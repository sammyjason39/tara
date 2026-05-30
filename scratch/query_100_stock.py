import psycopg2
from psycopg2.extras import RealDictCursor

conn_str = "postgresql://zenvix:zenvix_secure_2026!@localhost:5432/zenvix_prod?schema=public"

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # We want to find stock levels and item details for SKU starting with '100'
    query = """
        SELECT s.id as stock_id, s.location_id, l.name as location_name, s.on_hand, s.available, s.product_id, i.sku, i.name as product_name
        FROM stock_levels s
        JOIN item_masters i ON s.product_id = i.id
        JOIN locations l ON s.location_id = l.id
        WHERE i.tenant_id = 'bambu-tenant' AND i.sku LIKE '100%'
        ORDER BY i.sku, l.name;
    """
    cur.execute(query)
    rows = cur.fetchall()
    
    print("--- Stock levels for SKU starting with '100' ---")
    for r in rows:
        print(f"SKU: {r['sku']} | Name: {r['product_name']} | Location: {r['location_name']} | On Hand: {r['on_hand']} | Available: {r['available']}")
        
    cur.close()
    conn.close()
except Exception as e:
    print("Error:", e)
