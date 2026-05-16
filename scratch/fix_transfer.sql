-- Fix for broken transfer af6ef3a7-5f29-4ca9-b416-512ee74fba86
BEGIN;

-- 1. Re-reserve the stock
UPDATE stock_levels 
SET reserved = reserved + 1.0, available = available - 1.0, updated_at = NOW()
WHERE product_id = '037820fb-6294-4da2-864d-34a0e78736e3' AND location_id = 'ccd6c269-7a9e-4540-8b20-198ac296f701';

-- 2. Restore the reservation record
UPDATE stock_reservations
SET status = 'PENDING', updated_at = NOW()
WHERE reference_id = 'af6ef3a7-5f29-4ca9-b416-512ee74fba86';

COMMIT;
