import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Auditoria


def test_sin_configurar_devuelve_grupos_vacios(cliente_admin: TestClient) -> None:
    assert cliente_admin.get("/api/configuracion").json() == {"themeConfig": {}, "settings": {}}


def test_cambiar_mezcla_con_lo_guardado(cliente_admin: TestClient) -> None:
    cliente_admin.patch(
        "/api/configuracion",
        json={"themeConfig": {"primaryColor": "#2e7d32", "mode": "light"}},
    )

    respuesta = cliente_admin.patch(
        "/api/configuracion",
        json={"themeConfig": {"mode": "dark"}, "settings": {"orgName": "Fondacio"}},
    )

    esperado = {
        "themeConfig": {"primaryColor": "#2e7d32", "mode": "dark"},
        "settings": {"orgName": "Fondacio"},
    }
    assert respuesta.status_code == 200
    assert respuesta.json() == esperado
    assert cliente_admin.get("/api/configuracion").json() == esperado


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"themeConfig": {"primaryColor": 123}},
        {"themeConfig": {"primaryColor": "x" * 301}},
        {"settings": "texto"},
        {"otroGrupo": {}},
    ],
)
def test_configuracion_invalida(cliente_admin: TestClient, cuerpo: dict) -> None:
    assert cliente_admin.patch("/api/configuracion", json=cuerpo).status_code == 422


def test_el_rol_consulta_lee_la_configuracion_pero_no_la_cambia(
    cliente_consulta: TestClient,
) -> None:
    assert cliente_consulta.get("/api/configuracion").status_code == 200
    assert cliente_consulta.patch("/api/configuracion", json={"settings": {}}).status_code == 403


def test_sin_sesion_no_se_lee_la_configuracion(cliente: TestClient) -> None:
    assert cliente.get("/api/configuracion").status_code == 401


def test_solo_los_cambios_reales_quedan_en_la_auditoria(
    cliente_admin: TestClient, bd: Session
) -> None:
    cuerpo = {"settings": {"orgName": "Fondacio", "nit": "900"}}
    cliente_admin.patch("/api/configuracion", json=cuerpo)
    cliente_admin.patch("/api/configuracion", json=cuerpo)

    filas = bd.scalars(select(Auditoria).where(Auditoria.entidad == "configuracion")).all()

    assert [(f.entidad_id, f.cambios) for f in filas] == [
        ("settings", {"campos": ["nit", "orgName"]})
    ]
