"""fotos de equipos

Revisión: 0004
Anterior: 0003
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "equipo_imagenes",
        sa.Column("equipo_id", sa.Text(), nullable=False),
        sa.Column("contenido", sa.LargeBinary(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column(
            "actualizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["equipo_id"],
            ["equipos.id"],
            name=op.f("fk_equipo_imagenes_equipo_id_equipos"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("equipo_id", name=op.f("pk_equipo_imagenes")),
    )


def downgrade() -> None:
    op.drop_table("equipo_imagenes")
