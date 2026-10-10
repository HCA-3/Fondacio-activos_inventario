"""usuarios sesiones y auditoria

Revisión: 0002
Anterior: 0001
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("usuario", sa.Text(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("hash_contrasena", sa.Text(), nullable=False),
        sa.Column("rol", sa.Text(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "actualizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("rol IN ('admin', 'consulta')", name=op.f("ck_usuarios_rol_valido")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usuarios")),
        sa.UniqueConstraint("usuario", name=op.f("uq_usuarios_usuario")),
    )
    op.create_table(
        "auditoria",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("usuario_id", sa.Text(), nullable=True),
        sa.Column("accion", sa.Text(), nullable=False),
        sa.Column("entidad", sa.Text(), nullable=False),
        sa.Column("entidad_id", sa.Text(), nullable=False),
        sa.Column(
            "fecha", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("cambios", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuarios.id"], name=op.f("fk_auditoria_usuario_id_usuarios")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auditoria")),
    )
    op.create_index("ix_auditoria_entidad", "auditoria", ["entidad", "entidad_id"], unique=False)
    op.create_index(op.f("ix_auditoria_fecha"), "auditoria", ["fecha"], unique=False)
    op.create_index(op.f("ix_auditoria_usuario_id"), "auditoria", ["usuario_id"], unique=False)
    op.create_table(
        "sesiones",
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("usuario_id", sa.Text(), nullable=False),
        sa.Column(
            "creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name=op.f("fk_sesiones_usuario_id_usuarios"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("token_hash", name=op.f("pk_sesiones")),
    )
    op.create_index(op.f("ix_sesiones_expira_en"), "sesiones", ["expira_en"], unique=False)
    op.create_index(op.f("ix_sesiones_usuario_id"), "sesiones", ["usuario_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sesiones_usuario_id"), table_name="sesiones")
    op.drop_index(op.f("ix_sesiones_expira_en"), table_name="sesiones")
    op.drop_table("sesiones")
    op.drop_index(op.f("ix_auditoria_usuario_id"), table_name="auditoria")
    op.drop_index(op.f("ix_auditoria_fecha"), table_name="auditoria")
    op.drop_index("ix_auditoria_entidad", table_name="auditoria")
    op.drop_table("auditoria")
    op.drop_table("usuarios")
