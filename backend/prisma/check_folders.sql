SELECT id, name, parent_id FROM explorer_folders WHERE parent_id = (SELECT id FROM explorer_folders WHERE name = 'Anchor' LIMIT 1);
SELECT id, name, parent_id FROM explorer_folders WHERE parent_id IS NULL;
