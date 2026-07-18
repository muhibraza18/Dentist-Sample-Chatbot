"""add created_at to conversations"""
from alembic import op
import sqlalchemy as sa

revision = "0003_conv_created_at"
down_revision = "0002_resize_knowledge_embeddings"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "conversations",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade():
    op.drop_column("conversations", "created_at")
