"""update appointments for booking flow"""
from alembic import op
import sqlalchemy as sa

revision = "0004_appointments_booking"
down_revision = "0003_conv_created_at"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("appointments", "patient_name", new_column_name="name")
    op.alter_column("appointments", "patient_phone", new_column_name="phone")
    op.alter_column("appointments", "patient_email", new_column_name="email")
    op.add_column(
        "appointments",
        sa.Column(
            "service",
            sa.String(length=255),
            nullable=False,
            server_default=sa.text("'General Dental Service'"),
        ),
    )
    op.add_column(
        "appointments",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.alter_column("appointments", "status", server_default=sa.text("'pending'"))


def downgrade():
    op.alter_column("appointments", "name", new_column_name="patient_name")
    op.alter_column("appointments", "phone", new_column_name="patient_phone")
    op.alter_column("appointments", "email", new_column_name="patient_email")
    op.drop_column("appointments", "created_at")
    op.drop_column("appointments", "service")
    op.alter_column("appointments", "status", server_default=sa.text("'requested'"))
