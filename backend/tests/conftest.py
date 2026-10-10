"""Fixtures compartidas: base de datos de pruebas real y clientes HTTP."""

import os
from collections.abc import Callable, Iterator
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

CONTRASENA = "contrasena-de-prueba"
# https: la cookie de sesión es Secure y el cliente no la enviaría por http.
URL_BASE = "https://testserver"


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
def bd(motor: Engine) -> Iterator[Session]:
    """Sesión de base de datos dentro de una transacción que se revierte al terminar la prueba."""
    with motor.connect() as conexion:
        transaccion = conexion.begin()
        with Session(conexion, join_transaction_mode="create_savepoint") as bd:
            yield bd
        transaccion.rollback()


@pytest.fixture(autouse=True)
def limite_login_limpio() -> None:
    from app.security import limite_login

    limite_login.reiniciar()


@pytest.fixture
def nuevo_cliente(bd: Session) -> Iterator[Callable[[], TestClient]]:
    """Fábrica de clientes HTTP (cada uno con sus cookies) que comparten la base de la prueba."""
    from app.db import obtener_bd
    from app.main import app

    app.dependency_overrides[obtener_bd] = lambda: bd
    yield lambda: TestClient(app, base_url=URL_BASE)
    app.dependency_overrides.clear()


@pytest.fixture
def cliente(nuevo_cliente: Callable[[], TestClient]) -> TestClient:
    """Cliente HTTP sin sesión iniciada."""
    return nuevo_cliente()


@pytest.fixture
def cliente_sin_bd() -> Iterator[TestClient]:
    """Cliente HTTP que falla si la petición intenta usar la base de datos."""
    from app.db import obtener_bd
    from app.main import app

    def prohibido() -> None:
        raise AssertionError("Esta ruta no debe usar la base de datos")

    app.dependency_overrides[obtener_bd] = prohibido
    with TestClient(app, base_url=URL_BASE) as cliente:
        yield cliente
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def hash_de_prueba() -> str:
    # Argon2 es lento a propósito; se calcula una vez para todas las pruebas.
    from app.security import hashear_contrasena

    return hashear_contrasena(CONTRASENA)


@pytest.fixture
def crear_usuario(bd: Session, hash_de_prueba: str) -> Callable:
    """Fábrica de usuarios guardados en la base, todos con la contraseña CONTRASENA."""
    from app.models import Usuario

    def crear(usuario: str, rol: str = "consulta", activo: bool = True) -> Usuario:
        nuevo = Usuario(
            usuario=usuario,
            nombre=usuario.title(),
            hash_contrasena=hash_de_prueba,
            rol=rol,
            activo=activo,
        )
        bd.add(nuevo)
        bd.commit()
        return nuevo

    return crear


@pytest.fixture
def entrar(nuevo_cliente: Callable[[], TestClient]) -> Callable[[str], TestClient]:
    """Devuelve un cliente con la sesión de ese usuario ya iniciada."""

    def entrar(usuario: str) -> TestClient:
        cliente = nuevo_cliente()
        respuesta = cliente.post(
            "/api/auth/login", json={"username": usuario, "password": CONTRASENA}
        )
        assert respuesta.status_code == 200, respuesta.text
        return cliente

    return entrar


@pytest.fixture
def cliente_admin(crear_usuario: Callable, entrar: Callable[[str], TestClient]) -> TestClient:
    crear_usuario("admin", rol="admin")
    return entrar("admin")


@pytest.fixture
def cliente_consulta(crear_usuario: Callable, entrar: Callable[[str], TestClient]) -> TestClient:
    crear_usuario("lectora", rol="consulta")
    return entrar("lectora")
