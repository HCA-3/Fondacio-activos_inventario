"""Violaciones de integridad que llegan a la base: solo la unicidad es un 409."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from tests.ayudas import nueva_categoria, nueva_sede, nuevo_donante, nuevo_equipo

MENSAJE = {"detail": "Ya existe un registro con ese valor; vuelve a intentarlo con otro"}


@pytest.mark.parametrize(
    ("servicio", "ruta", "crear"),
    [
        ("sedes", "/api/sedes", nueva_sede),
        ("donantes", "/api/donantes", nuevo_donante),
        ("categorias", "/api/categorias", nueva_categoria),
    ],
)
def test_choque_con_el_indice_unico_responde_409(
    cliente_admin: TestClient, monkeypatch: pytest.MonkeyPatch, servicio, ruta, crear
) -> None:
    primero = crear(cliente_admin)
    # Simula la carrera: la comprobación previa no ve al otro registro, pero el índice sí.
    monkeypatch.setattr(f"app.services.{servicio}._exigir_nombre_libre", lambda *a, **k: None)

    repetido = cliente_admin.post(ruta, json={"name": primero["name"]})

    assert repetido.status_code == 409
    assert repetido.json() == MENSAJE
    # La sesión quedó usable tras el rollback.
    assert cliente_admin.get(ruta).status_code == 200


@pytest.mark.parametrize(
    ("servicio", "ruta", "crear"),
    [
        ("sedes", "/api/sedes", nueva_sede),
        ("donantes", "/api/donantes", nuevo_donante),
        ("categorias", "/api/categorias", nueva_categoria),
    ],
)
def test_renombrar_hacia_un_nombre_repetido_tambien_responde_409(
    cliente_admin: TestClient, monkeypatch: pytest.MonkeyPatch, servicio, ruta, crear
) -> None:
    primero = crear(cliente_admin, "Nombre uno")
    segundo = crear(cliente_admin, "Nombre dos")
    monkeypatch.setattr(f"app.services.{servicio}._exigir_nombre_libre", lambda *a, **k: None)

    repetido = cliente_admin.patch(f"{ruta}/{segundo['id']}", json={"name": primero["name"]})

    assert repetido.status_code == 409
    assert repetido.json() == MENSAJE
    assert cliente_admin.get(f"{ruta}/{segundo['id']}").json()["name"] == "Nombre dos"


def test_llave_foranea_no_se_disfraza_de_409(
    cliente_admin: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def autor_inexistente(objeto, autor, *, nuevo=False) -> None:
        objeto.creado_por = "no-existe"

    monkeypatch.setattr("app.services.sedes.marcar_autor", autor_inexistente)

    with pytest.raises(IntegrityError) as error:
        cliente_admin.post("/api/sedes", json={"name": "Nueva", "code": "N"})

    assert error.value.orig.sqlstate == "23503"


def test_placa_repetida_sigue_siendo_409(cliente_admin: TestClient) -> None:
    nueva_sede(cliente_admin)
    nuevo_equipo(cliente_admin, "PC-01")

    repetido = cliente_admin.post(
        "/api/equipos",
        json={"code": "PC-01", "sede": "Altos del Cabo", "brand": "Dell", "model": "X"},
    )

    assert repetido.status_code == 409
