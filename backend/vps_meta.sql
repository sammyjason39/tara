SELECT id, name, metadata FROM item_masters WHERE metadata->>'stockOnHand' IS NOT NULL OR metadata->>'stock_on_hand' IS NOT NULL LIMIT 5;
