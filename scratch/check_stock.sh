docker exec bfs-db psql -U zenvix -d zenvix_prod -c "SELECT * FROM stock_levels WHERE product_id = '037820fb-6294-4da2-864d-34a0e78736e3' AND location_id = 'ccd6c269-7a9e-4540-8b20-198ac296f701'"
