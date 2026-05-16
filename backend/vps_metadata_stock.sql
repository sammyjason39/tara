SELECT metadata FROM item_masters WHERE metadata->>'current_stock' IS NOT NULL LIMIT 10;
