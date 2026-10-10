from collections.abc import Iterator

from alembic import command
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db import obtener_bd
from app.main import app
from tests.conftest import configuracion_alembic


def test_health_responde_sin_usar_la_base(cliente_sin_bd: TestClient) -> None:
    respuesta = cliente_sin_bd.get("/health")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok"}


def test_health_db_responde_con_la_base_disponible(cliente: TestClient) -> None:
    respuesta = cliente.get("/health/db")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok"}


def test_health_db_devuelve_503_si_la_base_no_responde() -> None:
    motor_caido = create_engine("postgresql+psycopg://nadie:nada@127.0.0.1:1/nada")

    def bd_caida() -> Iterator[Session]:
        with Session(motor_caido) as bd:
            yield bd

    app.dependency_overrides[obtener_bd] = bd_caida
    try:
        respuesta = TestClient(app).get("/health/db")
    finally:
        app.dependency_overrides.clear()

    assert respuesta.status_code == 503
    assert respuesta.json() == {"detail": "Sin conexión con la base de datos"}


def test_la_base_queda_en_la_ultima_migracion(bd: Session) -> None:
    ultima = ScriptDirectory.from_config(configuracion_alembic()).get_current_head()

    assert bd.scalar(text("SELECT version_num FROM alembic_version")) == ultima


def test_los_modelos_coinciden_con_las_migraciones(bd: Session) -> None:
    # Falla si se cambió un modelo sin escribir su migración.
    command.check(configuracion_alembic())


def test_ruta_de_api_inexistente_devuelve_404_en_json(cliente_sin_bd: TestClient) -> None:
    respuesta = cliente_sin_bd.get("/api/no-existe")

    assert respuesta.status_code == 404
    assert respuesta.json() == {"detail": "Ruta no encontrada"}
