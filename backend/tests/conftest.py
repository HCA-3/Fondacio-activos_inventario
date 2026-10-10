"""Fixtures compartidas: base de datos de pruebas real y clientes HTTP."""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

BACKEND = Path(__file__).resolve().parents[1]
URL_PRUEBAS = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://fondacio:fondacio@localhost:5432/fondacio_test"
)
# La app lee DATABASE_URL al importarse; por eso los fixtures la importan dentro de la función.
os.environ["DATABASE_URL"] = URL_PRUEBAS


def configuracion_alembic() -> Config:
    return Config(str(BACKEND / "alembic.ini"))


@pytest.fixture(scope="session")
def motor() -> Iterator[Engine]:
    """Crea la base de pruebas si falta y la lleva a la última migración."""
    url = make_url(URL_PRUEBAS)
    if not (url.database or "").endswith("_test"):
        pytest.exit(f"La base de pruebas debe terminar en _test, no ser {url.database!r}")

    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conexion:
        existe = conexion.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :nombre"), {"nombre": url.database}
        )
        if not existe:
            conexion.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin.dispose()

    command.upgrade(configuracion_alembic(), "head")

    motor = create_engine(URL_PRUEBAS)
    yield motor
    motor.dispose()


@pytest.fixture
def sesion(motor: Engine) -> Iterator[Session]:
    """Sesión dentro de una transacción que se revierte al terminar la prueba."""
    with motor.connect() as conexion:
        transaccion = conexion.begin()
        with Session(conexion, join_transaction_mode="create_savepoint") as sesion:
            yield sesion
        transaccion.rollback()


@pytest.fixture
def cliente(sesion: Session) -> Iterator[TestClient]:
    """Cliente HTTP cuyas peticiones usan la sesión de la prueba."""
    from app.db import obtener_sesion
    from app.main import app

    app.dependency_overrides[obtener_sesion] = lambda: sesion
    with TestClient(app) as cliente:
        yield cliente
    app.dependency_overrides.clear()


@pytest.fixture
def cliente_sin_bd() -> Iterator[TestClient]:
    """Cliente HTTP que falla si la petición intenta usar la base de datos."""
    from app.db import obtener_sesion
    from app.main import app

    def prohibido() -> None:
        raise AssertionError("Esta ruta no debe usar la base de datos")

    app.dependency_overrides[obtener_sesion] = prohibido
    with TestClient(app) as cliente:
        yield cliente
    app.dependency_overrides.clear()
