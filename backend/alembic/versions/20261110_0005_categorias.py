"""categorias de los items donados

Revisión: 0005
Anterior: 0004
"""

from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

CATALOGO_INICIAL = [
    "Computadores",
    "Portátiles",
    "Tablets",
    "Mesas",
    "Sillas",
    "Escritorios",
    "Estantes",
    "Electrodomésticos",
    "Utensilios de cocina",
    "Papelería",
    "Libros",
    "Material didáctico",
    "Herramientas",
    "Otros",
]


def upgrade() -> None:
    op.create_table(
        "categorias",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("activa", sa.Boolean(), server_default=sa.true(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["actualizado_por"],
            ["usuarios.id"],
            name=op.f("fk_categorias_actualizado_por_usuarios"),
        ),
        sa.ForeignKeyConstraint(
            ["creado_por"], ["usuarios.id"], name=op.f("fk_categorias_creado_por_usuarios")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categorias")),
    )
    op.create_index(
        "uq_categorias_nombre_lower", "categorias", [sa.text("lower(nombre)")], unique=True
    )
    categorias = sa.table("categorias", sa.column("id", sa.Text), sa.column("nombre", sa.Text))
    op.bulk_insert(
        categorias,
        [{"id": str(uuid4()), "nombre": nombre} for nombre in CATALOGO_INICIAL],
    )


def downgrade() -> None:
    op.drop_index("uq_categorias_nombre_lower", table_name="categorias")
    op.drop_table("categorias")
