ALTER TABLE knowledge_documents ALTER COLUMN embedding TYPE jsonb USING embedding::text::jsonb;
DROP TABLE IF EXISTS alembic_version;
