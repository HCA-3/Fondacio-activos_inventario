from collections.abc import Iterator

from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db import obtener_sesion
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

    def sesion_caida() -> Iterator[Session]:
        with Session(motor_caido) as sesion:
            yield sesion

    app.dependency_overrides[obtener_sesion] = sesion_caida
    try:
        respuesta = TestClient(app).get("/health/db")
    finally:
        app.dependency_overrides.clear()

    assert respuesta.status_code == 503
    assert respuesta.json() == {"detail": "Sin conexión con la base de datos"}


def test_la_base_queda_en_la_ultima_migracion(sesion: Session) -> None:
    ultima = ScriptDirectory.from_config(configuracion_alembic()).get_current_head()

    assert sesion.scalar(text("SELECT version_num FROM alembic_version")) == ultima
