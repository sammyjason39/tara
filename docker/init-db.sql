-- ==============================================================================
-- TARA Database Initialization Script
-- Runs ONCE when the PostgreSQL container is first created.
-- Ensures all required extensions are available before Prisma migrations run.
-- ==============================================================================

-- PostGIS for geospatial attendance tracking (GPS, geofencing)
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID generation (used by Prisma as default for @id @default(uuid()))
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm for full-text search on employee names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- pgvector for SOP RAG embeddings (optional — JSONB fallback if unavailable)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector extension not available — using JSONB embedding fallback';
END $$;

-- Verify extensions
DO $$
BEGIN
  RAISE NOTICE 'TARA DB initialized with extensions: postgis, uuid-ossp, pg_trgm';
END $$;
