"""donaciones y sus items

Revisión: 0007
Anterior: 0006
"""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "donaciones",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("donante_id", sa.Text(), nullable=False),
        sa.Column("sede_id", sa.Text(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("notas", sa.Text(), server_default="", nullable=False),
        sa.Column("estado", sa.Text(), nullable=False),
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
        sa.CheckConstraint(
            "estado IN ('recibida', 'anulada')", name=op.f("ck_donaciones_estado_valido")
        ),
        sa.ForeignKeyConstraint(
            ["actualizado_por"],
            ["usuarios.id"],
            name=op.f("fk_donaciones_actualizado_por_usuarios"),
        ),
        sa.ForeignKeyConstraint(
            ["creado_por"], ["usuarios.id"], name=op.f("fk_donaciones_creado_por_usuarios")
        ),
        sa.ForeignKeyConstraint(
            ["donante_id"], ["donantes.id"], name=op.f("fk_donaciones_donante_id_donantes")
        ),
        sa.ForeignKeyConstraint(
            ["sede_id"], ["sedes.id"], name=op.f("fk_donaciones_sede_id_sedes")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_donaciones")),
    )
    op.create_index(op.f("ix_donaciones_donante_id"), "donaciones", ["donante_id"])
    op.create_index(op.f("ix_donaciones_sede_id"), "donaciones", ["sede_id"])
    op.create_index("ix_donaciones_fecha", "donaciones", ["fecha"])

    op.create_table(
        "donacion_items",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("donacion_id", sa.Text(), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("categoria_id", sa.Text(), nullable=True),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("estado", sa.Text(), nullable=False),
        sa.Column("valor_unitario", sa.BigInteger(), nullable=True),
        sa.Column("descripcion", sa.Text(), server_default="", nullable=False),
        sa.CheckConstraint("cantidad >= 1", name=op.f("ck_donacion_items_cantidad_positiva")),
        sa.CheckConstraint(
            "estado IN ('nuevo', 'usado', 'danado')", name=op.f("ck_donacion_items_estado_valido")
        ),
        sa.CheckConstraint(
            "valor_unitario IS NULL OR valor_unitario >= 0",
            name=op.f("ck_donacion_items_valor_no_negativo"),
        ),
        sa.ForeignKeyConstraint(
            ["categoria_id"],
            ["categorias.id"],
            name=op.f("fk_donacion_items_categoria_id_categorias"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["donacion_id"],
            ["donaciones.id"],
            name=op.f("fk_donacion_items_donacion_id_donaciones"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_donacion_items")),
    )
    op.create_index(op.f("ix_donacion_items_donacion_id"), "donacion_items", ["donacion_id"])
    op.create_index(op.f("ix_donacion_items_categoria_id"), "donacion_items", ["categoria_id"])


def downgrade() -> None:
    op.drop_table("donacion_items")
    op.drop_table("donaciones")
