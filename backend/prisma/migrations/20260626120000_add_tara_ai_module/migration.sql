-- TARA AI Agent Module
-- pgvector optional (JSONB fallback when extension unavailable)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector skipped: %', SQLERRM;
END $$;

-- AI conversation / usage logs (90-day retention via cron)
CREATE TABLE IF NOT EXISTS ai_agent_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  session_id TEXT,
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  user_message TEXT,
  assistant_message TEXT,
  tools_called JSONB DEFAULT '[]',
  model VARCHAR(100),
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  latency_ms INT,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_employee ON ai_agent_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_created ON ai_agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_status ON ai_agent_logs(status);

-- Pending write actions awaiting user confirmation (YA / SETUJU / button)
CREATE TABLE IF NOT EXISTS ai_pending_actions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_id TEXT,
  action_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_pending_employee ON ai_pending_actions(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_pending_expires ON ai_pending_actions(expires_at);

-- SOP RAG chunks
CREATE TABLE IF NOT EXISTS sop_chunks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sop_document_id TEXT NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding JSONB,
  token_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sop_document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_sop_chunks_document ON sop_chunks(sop_document_id);

-- pgvector column (when extension available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER TABLE sop_chunks ADD COLUMN IF NOT EXISTS embedding_vec vector(384);
    CREATE INDEX IF NOT EXISTS idx_sop_chunks_embedding ON sop_chunks
      USING ivfflat (embedding_vec vector_cosine_ops) WITH (lists = 100);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector column skipped: %', SQLERRM;
END $$;
