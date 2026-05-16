SELECT tenant_id, sum(on_hand) FROM stock_levels GROUP BY tenant_id;
