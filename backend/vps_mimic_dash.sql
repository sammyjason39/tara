SELECT count(*), sum(COALESCE(sl.on_hand, 0))
FROM item_masters im
LEFT JOIN stock_levels sl ON im.id = sl.product_id AND sl.location_id = '30bb1b66-931c-4108-bcf1-1c9f1081b882'
WHERE im.tenant_id = 'tnt-3rlhko' AND im.status = 'active';
