SELECT count(*) FROM item_masters WHERE tenant_id = 'bambu-tenant';
SELECT sum(on_hand) FROM stock_levels WHERE tenant_id = 'bambu-tenant';
