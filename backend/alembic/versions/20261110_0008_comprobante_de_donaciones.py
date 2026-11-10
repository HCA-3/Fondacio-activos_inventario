"""comprobante de donaciones

Revisión: 0008
Anterior: 0007
"""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "donaciones", sa.Column("comprobante", sa.Text(), server_default="", nullable=False)
    )
    op.create_table(
        "donacion_comprobantes",
        sa.Column("donacion_id", sa.Text(), nullable=False),
        sa.Column("contenido", sa.LargeBinary(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column(
            "actualizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["donacion_id"],
            ["donaciones.id"],
            name=op.f("fk_donacion_comprobantes_donacion_id_donaciones"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("donacion_id", name=op.f("pk_donacion_comprobantes")),
    )


def downgrade() -> None:
    op.drop_table("donacion_comprobantes")
    op.drop_column("donaciones", "comprobante")
