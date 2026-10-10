import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Auditoria
from tests.ayudas import nueva_sede, nuevo_equipo, nuevo_prestamo


def test_crear_y_listar_sedes_por_nombre(cliente_admin: TestClient) -> None:
    nueva_sede(cliente_admin, "YLDC Potosí", code="POT", city="Bogotá")
    cabo = nueva_sede(cliente_admin, "Altos del Cabo", fullName="Centro de Ecología Integral")

    pagina = cliente_admin.get("/api/sedes").json()

    assert [s["name"] for s in pagina["items"]] == ["Altos del Cabo", "YLDC Potosí"]
    assert pagina["total"] == 2
    assert set(cabo) == {
        "id", "name", "fullName", "code", "address", "city", "phone", "email", "color", "focus",
        "createdAt", "updatedAt",
    }  # fmt: skip
    assert (cabo["fullName"], cabo["address"]) == ("Centro de Ecología Integral", "")


def test_el_nombre_de_sede_no_se_repite_ni_cambiando_mayusculas(cliente_admin: TestClient) -> None:
    nueva_sede(cliente_admin, "Altos del Cabo")

    repetida = cliente_admin.post("/api/sedes", json={"name": "ALTOS DEL CABO"})

    assert repetida.status_code == 409
    assert repetida.json() == {"detail": "Ya existe una sede llamada 'Altos del Cabo'"}


def test_actualizar_solo_toca_los_campos_enviados(cliente_admin: TestClient) -> None:
    sede = nueva_sede(cliente_admin, city="Bogotá", phone="300")

    cambiada = cliente_admin.patch(f"/api/sedes/{sede['id']}", json={"phone": ""}).json()

    assert (cambiada["name"], cambiada["city"], cambiada["phone"]) == (
        "Altos del Cabo",
        "Bogotá",
        "",
    )


def test_una_sede_puede_conservar_su_propio_nombre_al_editar(cliente_admin: TestClient) -> None:
    sede = nueva_sede(cliente_admin)

    respuesta = cliente_admin.patch(f"/api/sedes/{sede['id']}", json={"name": "altos del cabo"})

    assert respuesta.status_code == 200


@pytest.mark.parametrize("cuerpo", [{"name": None}, {"name": "  "}, {"nombre": "x"}])
def test_cambios_invalidos_de_sede(cliente_admin: TestClient, cuerpo: dict) -> None:
    sede = nueva_sede(cliente_admin)

    assert cliente_admin.patch(f"/api/sedes/{sede['id']}", json=cuerpo).status_code == 422


def test_borrar_una_sede_vacia(cliente_admin: TestClient) -> None:
    nueva_sede(cliente_admin, "Altos del Cabo")
    otra = nueva_sede(cliente_admin, "Bodega Norte")

    assert cliente_admin.delete(f"/api/sedes/{otra['id']}").status_code == 204
    assert cliente_admin.get(f"/api/sedes/{otra['id']}").status_code == 404


def test_no_se_borra_la_ultima_sede(cliente_admin: TestClient) -> None:
    sede = nueva_sede(cliente_admin)

    respuesta = cliente_admin.delete(f"/api/sedes/{sede['id']}")

    assert respuesta.status_code == 409
    assert respuesta.json() == {"detail": "Debe existir al menos una sede registrada"}


def test_no_se_borra_una_sede_con_equipos(cliente_admin: TestClient) -> None:
    sede = nueva_sede(cliente_admin, "Altos del Cabo")
    nueva_sede(cliente_admin, "Bodega Norte")
    nuevo_equipo(cliente_admin)

    respuesta = cliente_admin.delete(f"/api/sedes/{sede['id']}")

    assert respuesta.status_code == 409
    assert "1 equipo(s)" in respuesta.json()["detail"]


def test_no_se_borra_una_sede_que_aparece_en_prestamos(cliente_admin: TestClient) -> None:
    nueva_sede(cliente_admin, "Altos del Cabo")
    feria = nueva_sede(cliente_admin, "Feria")
    equipo = nuevo_equipo(cliente_admin)
    nuevo_prestamo(cliente_admin, equipo["id"], sede="Feria")

    assert cliente_admin.delete(f"/api/sedes/{feria['id']}").status_code == 409


def test_el_rol_consulta_ve_las_sedes_pero_no_las_cambia(
    cliente_admin: TestClient, cliente_consulta: TestClient
) -> None:
    sede = nueva_sede(cliente_admin)

    assert cliente_consulta.get("/api/sedes").status_code == 200
    assert cliente_consulta.get(f"/api/sedes/{sede['id']}").status_code == 200
    assert cliente_consulta.post("/api/sedes", json={"name": "Otra"}).status_code == 403
    assert cliente_consulta.patch(f"/api/sedes/{sede['id']}", json={}).status_code == 403
    assert cliente_consulta.delete(f"/api/sedes/{sede['id']}").status_code == 403


def test_sin_sesion_no_se_ven_las_sedes(cliente: TestClient) -> None:
    assert cliente.get("/api/sedes").status_code == 401


def test_los_cambios_de_sede_quedan_en_la_auditoria(cliente_admin: TestClient, bd: Session) -> None:
    sede = nueva_sede(cliente_admin, city="Bogotá")
    cliente_admin.patch(f"/api/sedes/{sede['id']}", json={"city": "Soacha"})

    filas = bd.scalars(select(Auditoria).where(Auditoria.entidad == "sedes")).all()

    assert [(f.accion, f.cambios) for f in filas] == [
        ("crear", {"nombre": "Altos del Cabo"}),
        ("actualizar", {"ciudad": ["Bogotá", "Soacha"]}),
    ]
