SELECT count(*) FROM stock_levels WHERE location_id NOT IN (SELECT id FROM locations);
