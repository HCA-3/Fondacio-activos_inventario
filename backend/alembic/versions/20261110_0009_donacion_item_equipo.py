"""vinculo del item de donacion con el equipo en que se convirtio

Revisión: 0009
Anterior: 0008
"""

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("donacion_items", sa.Column("equipo_id", sa.Text(), nullable=True))
    op.create_unique_constraint(
        op.f("uq_donacion_items_equipo_id"), "donacion_items", ["equipo_id"]
    )
    op.create_foreign_key(
        op.f("fk_donacion_items_equipo_id_equipos"),
        "donacion_items",
        "equipos",
        ["equipo_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_donacion_items_equipo_id_equipos"), "donacion_items", type_="foreignkey"
    )
    op.drop_constraint(op.f("uq_donacion_items_equipo_id"), "donacion_items", type_="unique")
    op.drop_column("donacion_items", "equipo_id")
