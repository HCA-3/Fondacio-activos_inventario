"""sedes equipos prestamos mantenimientos y configuracion

Revisión: 0003
Anterior: 0002
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "configuracion",
        sa.Column("clave", sa.Text(), nullable=False),
        sa.Column("valor", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
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
            name=op.f("fk_configuracion_actualizado_por_usuarios"),
        ),
        sa.PrimaryKeyConstraint("clave", name=op.f("pk_configuracion")),
    )
    op.create_table(
        "sedes",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("nombre_completo", sa.Text(), server_default="", nullable=False),
        sa.Column("codigo", sa.Text(), server_default="", nullable=False),
        sa.Column("direccion", sa.Text(), server_default="", nullable=False),
        sa.Column("ciudad", sa.Text(), server_default="", nullable=False),
        sa.Column("telefono", sa.Text(), server_default="", nullable=False),
        sa.Column("correo", sa.Text(), server_default="", nullable=False),
        sa.Column("color", sa.Text(), server_default="", nullable=False),
        sa.Column("enfoque", sa.Text(), server_default="", nullable=False),
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
            ["actualizado_por"], ["usuarios.id"], name=op.f("fk_sedes_actualizado_por_usuarios")
        ),
        sa.ForeignKeyConstraint(
            ["creado_por"], ["usuarios.id"], name=op.f("fk_sedes_creado_por_usuarios")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sedes")),
        sa.UniqueConstraint("nombre", name=op.f("uq_sedes_nombre")),
    )
    op.create_table(
        "equipos",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("placa", sa.Text(), nullable=False),
        sa.Column("sede_id", sa.Text(), nullable=False),
        sa.Column("estado", sa.Text(), nullable=False),
        sa.Column("categoria", sa.Text(), server_default="", nullable=False),
        sa.Column("tipo_equipo", sa.Text(), server_default="", nullable=False),
        sa.Column("marca", sa.Text(), server_default="", nullable=False),
        sa.Column("modelo", sa.Text(), server_default="", nullable=False),
        sa.Column("serial", sa.Text(), server_default="", nullable=False),
        sa.Column("area", sa.Text(), server_default="", nullable=False),
        sa.Column("responsable", sa.Text(), server_default="", nullable=False),
        sa.Column("cargo_responsable", sa.Text(), server_default="", nullable=False),
        sa.Column("ubicacion", sa.Text(), server_default="", nullable=False),
        sa.Column("condicion", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "valor_estimado", sa.Numeric(precision=14, scale=2, asdecimal=False), nullable=True
        ),
        sa.Column("fecha_compra", sa.Date(), nullable=True),
        sa.Column("imagen", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "ficha_tecnica",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
        ),
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
            "estado IN ('operativo', 'bodega', 'prestado', 'mantenimiento', 'baja')",
            name=op.f("ck_equipos_estado_valido"),
        ),
        sa.ForeignKeyConstraint(
            ["actualizado_por"], ["usuarios.id"], name=op.f("fk_equipos_actualizado_por_usuarios")
        ),
        sa.ForeignKeyConstraint(
            ["creado_por"], ["usuarios.id"], name=op.f("fk_equipos_creado_por_usuarios")
        ),
        sa.ForeignKeyConstraint(["sede_id"], ["sedes.id"], name=op.f("fk_equipos_sede_id_sedes")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_equipos")),
        sa.UniqueConstraint("placa", name=op.f("uq_equipos_placa")),
    )
    op.create_index(op.f("ix_equipos_categoria"), "equipos", ["categoria"], unique=False)
    op.create_index(op.f("ix_equipos_estado"), "equipos", ["estado"], unique=False)
    op.create_index(op.f("ix_equipos_sede_id"), "equipos", ["sede_id"], unique=False)
    op.create_table(
        "mantenimientos",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("equipo_id", sa.Text(), nullable=False),
        sa.Column("equipo_placa", sa.Text(), nullable=False),
        sa.Column("equipo_nombre", sa.Text(), server_default="", nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("estado", sa.Text(), nullable=False),
        sa.Column("fecha_solicitud", sa.Date(), nullable=False),
        sa.Column("fecha_programada", sa.Date(), nullable=True),
        sa.Column("fecha_realizado", sa.Date(), nullable=True),
        sa.Column("tecnico", sa.Text(), server_default="", nullable=False),
        sa.Column(
            "costo",
            sa.Numeric(precision=14, scale=2, asdecimal=False),
            server_default="0",
            nullable=False,
        ),
        sa.Column("descripcion", sa.Text(), server_default="", nullable=False),
        sa.Column("repuestos", sa.Text(), server_default="", nullable=False),
        sa.Column("proximo", sa.Date(), nullable=True),
        sa.Column("notas", sa.Text(), server_default="", nullable=False),
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
            "estado IN ('programado', 'en_progreso', 'completado')",
            name=op.f("ck_mantenimientos_estado_valido"),
        ),
        sa.CheckConstraint(
            "tipo IN ('preventivo', 'correctivo', 'upgrade')",
            name=op.f("ck_mantenimientos_tipo_valido"),
        ),
        sa.ForeignKeyConstraint(
            ["actualizado_por"],
            ["usuarios.id"],
            name=op.f("fk_mantenimientos_actualizado_por_usuarios"),
        ),
        sa.ForeignKeyConstraint(
            ["creado_por"], ["usuarios.id"], name=op.f("fk_mantenimientos_creado_por_usuarios")
        ),
        sa.ForeignKeyConstraint(
            ["equipo_id"], ["equipos.id"], name=op.f("fk_mantenimientos_equipo_id_equipos")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_mantenimientos")),
    )
    op.create_index(
        op.f("ix_mantenimientos_equipo_id"), "mantenimientos", ["equipo_id"], unique=False
    )
    op.create_index(op.f("ix_mantenimientos_estado"), "mantenimientos", ["estado"], unique=False)
    op.create_table(
        "prestamos",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("equipo_id", sa.Text(), nullable=False),
        sa.Column("equipo_placa", sa.Text(), nullable=False),
        sa.Column("equipo_nombre", sa.Text(), server_default="", nullable=False),
        sa.Column("prestatario_nombre", sa.Text(), nullable=False),
        sa.Column("prestatario_documento", sa.Text(), server_default="", nullable=False),
        sa.Column("prestatario_cargo", sa.Text(), server_default="", nullable=False),
        sa.Column("prestatario_correo", sa.Text(), server_default="", nullable=False),
        sa.Column("prestatario_telefono", sa.Text(), server_default="", nullable=False),
        sa.Column("sede_id", sa.Text(), nullable=True),
        sa.Column("proposito", sa.Text(), server_default="", nullable=False),
        sa.Column("fecha_prestamo", sa.Date(), nullable=False),
        sa.Column("fecha_devolucion_prevista", sa.Date(), nullable=True),
        sa.Column("fecha_devolucion", sa.Date(), nullable=True),
        sa.Column("estado", sa.Text(), nullable=False),
        sa.Column("condicion_entrega", sa.Text(), server_default="", nullable=False),
        sa.Column("notas_devolucion", sa.Text(), server_default="", nullable=False),
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
            "estado IN ('activo', 'devuelto')", name=op.f("ck_prestamos_estado_valido")
        ),
        sa.ForeignKeyConstraint(
            ["actualizado_por"], ["usuarios.id"], name=op.f("fk_prestamos_actualizado_por_usuarios")
        ),
        sa.ForeignKeyConstraint(
            ["creado_por"], ["usuarios.id"], name=op.f("fk_prestamos_creado_por_usuarios")
        ),
        sa.ForeignKeyConstraint(
            ["equipo_id"], ["equipos.id"], name=op.f("fk_prestamos_equipo_id_equipos")
        ),
        sa.ForeignKeyConstraint(["sede_id"], ["sedes.id"], name=op.f("fk_prestamos_sede_id_sedes")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prestamos")),
    )
    op.create_index(op.f("ix_prestamos_equipo_id"), "prestamos", ["equipo_id"], unique=False)
    op.create_index("ix_prestamos_estado", "prestamos", ["estado"], unique=False)
    op.create_index(
        op.f("ix_prestamos_prestatario_documento"),
        "prestamos",
        ["prestatario_documento"],
        unique=False,
    )
    op.create_index(op.f("ix_prestamos_sede_id"), "prestamos", ["sede_id"], unique=False)
    op.create_index(
        "uq_prestamos_activo_por_equipo",
        "prestamos",
        ["equipo_id"],
        unique=True,
        postgresql_where=sa.text("estado = 'activo'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_prestamos_activo_por_equipo",
        table_name="prestamos",
        postgresql_where=sa.text("estado = 'activo'"),
    )
    op.drop_index(op.f("ix_prestamos_sede_id"), table_name="prestamos")
    op.drop_index(op.f("ix_prestamos_prestatario_documento"), table_name="prestamos")
    op.drop_index("ix_prestamos_estado", table_name="prestamos")
    op.drop_index(op.f("ix_prestamos_equipo_id"), table_name="prestamos")
    op.drop_table("prestamos")
    op.drop_index(op.f("ix_mantenimientos_estado"), table_name="mantenimientos")
    op.drop_index(op.f("ix_mantenimientos_equipo_id"), table_name="mantenimientos")
    op.drop_table("mantenimientos")
    op.drop_index(op.f("ix_equipos_sede_id"), table_name="equipos")
    op.drop_index(op.f("ix_equipos_estado"), table_name="equipos")
    op.drop_index(op.f("ix_equipos_categoria"), table_name="equipos")
    op.drop_table("equipos")
    op.drop_table("sedes")
    op.drop_table("configuracion")
