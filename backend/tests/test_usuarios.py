from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Auditoria, Usuario
from tests.conftest import CONTRASENA

NUEVO = {
    "username": "Carla",
    "name": "Carla Ruiz",
    "password": "clave-de-carla",
    "role": "consulta",
}


def test_sin_sesion_no_se_puede_ver_usuarios(cliente: TestClient) -> None:
    assert cliente.get("/api/usuarios").status_code == 401


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("get", "/api/usuarios"),
        ("post", "/api/usuarios"),
        ("patch", "/api/usuarios/cualquiera"),
        ("post", "/api/usuarios/cualquiera/contrasena"),
    ],
)
def test_el_rol_consulta_no_gestiona_usuarios(
    cliente_consulta: TestClient, metodo: str, ruta: str
) -> None:
    respuesta = cliente_consulta.request(metodo, ruta, json=NUEVO if metodo != "get" else None)

    assert respuesta.status_code == 403
    assert respuesta.json() == {"detail": "Solo un administrador puede hacer esto"}


def test_el_admin_lista_los_usuarios_paginados(
    cliente_admin: TestClient, crear_usuario: Callable
) -> None:
    crear_usuario("zoe")
    crear_usuario("beto")

    pagina = cliente_admin.get("/api/usuarios", params={"limit": 2, "offset": 1}).json()

    assert [u["username"] for u in pagina["items"]] == ["beto", "zoe"]
    assert (pagina["total"], pagina["limit"], pagina["offset"]) == (3, 2, 1)


def test_el_limite_de_pagina_no_pasa_de_500(cliente_admin: TestClient) -> None:
    assert cliente_admin.get("/api/usuarios", params={"limit": 501}).status_code == 422


def test_crear_usuario(cliente_admin: TestClient, nuevo_cliente: Callable) -> None:
    respuesta = cliente_admin.post("/api/usuarios", json=NUEVO)

    assert respuesta.status_code == 201
    creado = respuesta.json()
    assert (creado["username"], creado["name"], creado["role"], creado["active"]) == (
        "carla",
        "Carla Ruiz",
        "consulta",
        True,
    )
    assert set(creado) == {"id", "username", "name", "role", "active", "createdAt"}
    entrada = nuevo_cliente().post(
        "/api/auth/login", json={"username": "carla", "password": NUEVO["password"]}
    )
    assert entrada.status_code == 200


def test_no_se_repite_el_nombre_de_usuario(cliente_admin: TestClient) -> None:
    cliente_admin.post("/api/usuarios", json=NUEVO)

    repetido = cliente_admin.post("/api/usuarios", json=NUEVO | {"username": "CARLA"})

    assert repetido.status_code == 409
    assert repetido.json() == {"detail": "Ya existe un usuario con ese nombre"}


@pytest.mark.parametrize(
    "cambio",
    [
        {"password": "corta"},
        {"username": "con espacios"},
        {"username": "ab"},
        {"role": "superusuario"},
        {"name": ""},
        {"campoDesconocido": 1},
    ],
)
def test_datos_invalidos_al_crear(cliente_admin: TestClient, cambio: dict) -> None:
    assert cliente_admin.post("/api/usuarios", json=NUEVO | cambio).status_code == 422


def test_la_contrasena_no_sale_ni_en_la_respuesta_ni_en_la_auditoria(
    cliente_admin: TestClient, bd: Session
) -> None:
    respuesta = cliente_admin.post("/api/usuarios", json=NUEVO)

    carla = bd.scalar(select(Usuario).where(Usuario.usuario == "carla"))
    fila = bd.scalar(select(Auditoria).where(Auditoria.accion == "crear"))
    assert carla.hash_contrasena.startswith("$argon2id$")
    assert NUEVO["password"] not in respuesta.text
    assert fila.entidad_id == carla.id
    assert fila.cambios == {"usuario": "carla", "nombre": "Carla Ruiz", "rol": "consulta"}


def test_cambiar_nombre_y_rol(
    cliente_admin: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    beto = crear_usuario("beto")

    respuesta = cliente_admin.patch(
        f"/api/usuarios/{beto.id}", json={"name": "Alberto", "role": "admin"}
    )

    assert respuesta.status_code == 200
    assert (respuesta.json()["name"], respuesta.json()["role"]) == ("Alberto", "admin")
    fila = bd.scalar(select(Auditoria).where(Auditoria.accion == "actualizar"))
    assert fila.cambios == {"nombre": ["Beto", "Alberto"], "rol": ["consulta", "admin"]}


def test_un_cambio_sin_diferencias_no_deja_rastro(
    cliente_admin: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    beto = crear_usuario("beto")

    cliente_admin.patch(f"/api/usuarios/{beto.id}", json={"name": "Beto"})

    assert bd.scalar(select(Auditoria).where(Auditoria.accion == "actualizar")) is None


def test_desactivar_cierra_las_sesiones_del_usuario(
    cliente_admin: TestClient, crear_usuario: Callable, entrar: Callable
) -> None:
    beto = crear_usuario("beto")
    cliente_beto = entrar("beto")

    respuesta = cliente_admin.patch(f"/api/usuarios/{beto.id}", json={"active": False})

    assert respuesta.json()["active"] is False
    assert cliente_beto.get("/api/auth/me").status_code == 401


@pytest.mark.parametrize("cambio", [{"active": False}, {"role": "consulta"}])
def test_un_admin_no_puede_dejarse_sin_acceso(cliente_admin: TestClient, cambio: dict) -> None:
    yo = cliente_admin.get("/api/auth/me").json()

    respuesta = cliente_admin.patch(f"/api/usuarios/{yo['id']}", json=cambio)

    assert respuesta.status_code == 409
    assert cliente_admin.get("/api/auth/me").json()["role"] == "admin"


def test_un_admin_si_puede_cambiar_su_propio_nombre(cliente_admin: TestClient) -> None:
    yo = cliente_admin.get("/api/auth/me").json()

    respuesta = cliente_admin.patch(f"/api/usuarios/{yo['id']}", json={"name": "Otro Nombre"})

    assert respuesta.status_code == 200


def test_restablecer_contrasena(
    cliente_admin: TestClient, crear_usuario: Callable, entrar: Callable, nuevo_cliente: Callable
) -> None:
    beto = crear_usuario("beto")
    cliente_beto = entrar("beto")

    respuesta = cliente_admin.post(
        f"/api/usuarios/{beto.id}/contrasena", json={"password": "clave-nueva-de-beto"}
    )

    assert respuesta.status_code == 204
    assert cliente_beto.get("/api/auth/me").status_code == 401
    otro = nuevo_cliente()
    vieja = otro.post("/api/auth/login", json={"username": "beto", "password": CONTRASENA})
    nueva = otro.post(
        "/api/auth/login", json={"username": "beto", "password": "clave-nueva-de-beto"}
    )
    assert (vieja.status_code, nueva.status_code) == (401, 200)


def test_usuario_inexistente_devuelve_404(cliente_admin: TestClient) -> None:
    cambio = cliente_admin.patch("/api/usuarios/no-existe", json={"name": "X"})
    clave = cliente_admin.post("/api/usuarios/no-existe/contrasena", json={"password": "12345678"})

    assert cambio.status_code == clave.status_code == 404
    assert cambio.json() == {"detail": "Usuario no encontrado"}
