import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Auditoria
from tests.ayudas import nueva_categoria


def _nombres(cliente: TestClient, **filtros) -> list[str]:
    pagina = cliente.get("/api/categorias", params={"limit": 200} | filtros).json()
    return [c["name"] for c in pagina["items"]]


def test_el_catalogo_inicial_viene_precargado(cliente_consulta: TestClient) -> None:
    nombres = _nombres(cliente_consulta)

    assert {"Computadores", "Tablets", "Mesas", "Sillas"} <= set(nombres)
    assert nombres == sorted(nombres)


def test_crear_y_ver_una_categoria(cliente_admin: TestClient) -> None:
    categoria = nueva_categoria(cliente_admin, "Instrumentos musicales")

    vista = cliente_admin.get(f"/api/categorias/{categoria['id']}").json()

    assert set(vista) == {"id", "name", "active", "createdAt", "updatedAt"}
    assert (vista["name"], vista["active"]) == ("Instrumentos musicales", True)
    assert "Instrumentos musicales" in _nombres(cliente_admin)


def test_el_nombre_no_se_repite_ni_con_otras_mayusculas_o_espacios(
    cliente_admin: TestClient,
) -> None:
    nueva_categoria(cliente_admin, "Sillas de oficina")

    for repetido in ("SILLAS DE OFICINA", "  sillas   de oficina "):
        respuesta = cliente_admin.post("/api/categorias", json={"name": repetido})
        assert respuesta.status_code == 409
    # También contra el catálogo precargado.
    assert cliente_admin.post("/api/categorias", json={"name": "tablets"}).status_code == 409


def test_el_nombre_se_guarda_con_un_solo_espacio(cliente_admin: TestClient) -> None:
    categoria = nueva_categoria(cliente_admin, "  Juegos   de   mesa ")

    assert categoria["name"] == "Juegos de mesa"


def test_editar_nombre_y_conservar_el_propio(cliente_admin: TestClient) -> None:
    categoria = nueva_categoria(cliente_admin)
    url = f"/api/categorias/{categoria['id']}"

    assert cliente_admin.patch(url, json={"name": "mesas DE comedor"}).status_code == 200
    otra = nueva_categoria(cliente_admin, "Sofás")
    choque = cliente_admin.patch(f"/api/categorias/{otra['id']}", json={"name": "Mesas de comedor"})
    assert choque.status_code == 409


@pytest.mark.parametrize(
    "cuerpo", [{"name": None}, {"name": "  "}, {"active": None}, {"nombre": "x"}]
)
def test_cambios_invalidos(cliente_admin: TestClient, cuerpo: dict) -> None:
    categoria = nueva_categoria(cliente_admin)

    assert cliente_admin.patch(f"/api/categorias/{categoria['id']}", json=cuerpo).status_code == 422


def test_desactivar_la_oculta_del_filtro_de_activas(cliente_admin: TestClient) -> None:
    categoria = nueva_categoria(cliente_admin, "Antigüedades")

    cambiada = cliente_admin.patch(f"/api/categorias/{categoria['id']}", json={"active": False})

    assert cambiada.json()["active"] is False
    assert "Antigüedades" not in _nombres(cliente_admin, activa=True)
    assert "Antigüedades" in _nombres(cliente_admin, activa=False)
    assert "Antigüedades" in _nombres(cliente_admin)


def test_borrar_una_categoria(cliente_admin: TestClient) -> None:
    categoria = nueva_categoria(cliente_admin)

    assert cliente_admin.delete(f"/api/categorias/{categoria['id']}").status_code == 204
    assert cliente_admin.get(f"/api/categorias/{categoria['id']}").status_code == 404


def test_categoria_inexistente(cliente_admin: TestClient) -> None:
    assert cliente_admin.get("/api/categorias/no-existe").status_code == 404
    assert cliente_admin.patch("/api/categorias/no-existe", json={}).status_code == 404
    assert cliente_admin.delete("/api/categorias/no-existe").status_code == 404


def test_consulta_lee_pero_no_escribe(
    cliente_admin: TestClient, cliente_consulta: TestClient
) -> None:
    categoria = nueva_categoria(cliente_admin)
    url = f"/api/categorias/{categoria['id']}"

    assert cliente_consulta.get("/api/categorias").status_code == 200
    assert cliente_consulta.get(url).status_code == 200
    assert cliente_consulta.post("/api/categorias", json={"name": "X"}).status_code == 403
    assert cliente_consulta.patch(url, json={"active": False}).status_code == 403
    assert cliente_consulta.delete(url).status_code == 403


def test_sin_sesion_no_hay_acceso(nuevo_cliente) -> None:
    assert nuevo_cliente().get("/api/categorias").status_code == 401


def test_los_cambios_quedan_en_auditoria(cliente_admin: TestClient, bd: Session) -> None:
    categoria = nueva_categoria(cliente_admin, "Bicicletas")
    url = f"/api/categorias/{categoria['id']}"
    cliente_admin.patch(url, json={"active": False})
    cliente_admin.delete(url)

    filas = bd.scalars(
        select(Auditoria).where(Auditoria.entidad == "categorias").order_by(Auditoria.id)
    ).all()

    assert [f.accion for f in filas] == ["crear", "actualizar", "borrar"]
    assert all(f.usuario_id is not None for f in filas)
