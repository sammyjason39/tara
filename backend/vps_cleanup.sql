DELETE FROM explorer_files WHERE folder_id IN (SELECT id FROM explorer_folders WHERE name ILIKE '%Stock opname%');
DELETE FROM explorer_folders WHERE name ILIKE '%Stock opname%';
