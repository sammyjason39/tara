docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT id, item_id, from_location_id, to_location_id, quantity, status FROM inventory_transfers WHERE id = 'af6ef3a7-5f29-4ca9-b416-512ee74fba86'"
