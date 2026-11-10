"""donantes

Revisión: 0005_donantes
Anterior: 0004
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_donantes"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "donantes",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("contacto", sa.Text(), server_default="", nullable=False),
        sa.Column("notas", sa.Text(), server_default="", nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("creado_por", sa.Text(), nullable=True),
        sa.Column(
            "creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("actualizado_por", sa.Text(), nullable=True),
        sa.Column(
            "actualizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("tipo IN ('persona', 'empresa')", name=op.f("ck_donantes_tipo_valido")),
        sa.ForeignKeyConstraint(
            ["actualizado_por"], ["usuarios.id"], name=op.f("fk_donantes_actualizado_por_usuarios")
        ),
        sa.ForeignKeyConstraint(
            ["creado_por"], ["usuarios.id"], name=op.f("fk_donantes_creado_por_usuarios")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_donantes")),
        sa.UniqueConstraint("nombre", name=op.f("uq_donantes_nombre")),
    )


def downgrade() -> None:
    op.drop_table("donantes")
