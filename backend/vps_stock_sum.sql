SELECT product_id, location_id, on_hand FROM stock_levels WHERE on_hand > 0 LIMIT 10;
SELECT sum(on_hand) FROM stock_levels;
