"""resize knowledge embeddings to 384 dimensions"""
from alembic import op

revision = "0002_resize_knowledge_embeddings"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        "ALTER TABLE knowledge_documents "
        "ALTER COLUMN embedding TYPE vector(384) "
        "USING embedding::vector(384)"
    )


def downgrade():
    op.execute(
        "ALTER TABLE knowledge_documents "
        "ALTER COLUMN embedding TYPE vector(1536) "
        "USING embedding::vector(1536)"
    )
