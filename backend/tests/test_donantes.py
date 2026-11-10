from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Auditoria
from tests.ayudas import nuevo_donante


def test_crear_donante_con_valores_por_defecto(cliente_admin: TestClient) -> None:
    donante = nuevo_donante(cliente_admin, "  María Pérez  ")

    assert set(donante) == {
        "id", "name", "type", "contact", "notes", "active", "createdAt", "updatedAt",
    }  # fmt: skip
    assert (donante["name"], donante["type"], donante["active"]) == ("María Pérez", "persona", True)
    assert (donante["contact"], donante["notes"]) == ("", "")


def test_listar_donantes_por_nombre_con_paginacion(cliente_admin: TestClient) -> None:
    nuevo_donante(cliente_admin, "Zapatería Ltda", type="empresa")
    nuevo_donante(cliente_admin, "Ana Ruiz")
    nuevo_donante(cliente_admin, "Mario Gómez")

    pagina = cliente_admin.get("/api/donantes", params={"limit": 2}).json()

    assert [d["name"] for d in pagina["items"]] == ["Ana Ruiz", "Mario Gómez"]
    assert (pagina["total"], pagina["limit"], pagina["offset"]) == (3, 2, 0)


def test_filtrar_donantes_por_estado_y_texto(cliente_admin: TestClient) -> None:
    nuevo_donante(cliente_admin, "Ana Ruiz", contact="ana@correo.co")
    inactivo = nuevo_donante(cliente_admin, "Banco Local", type="empresa", active=False)

    activos = cliente_admin.get("/api/donantes", params={"activo": True}).json()
    inactivos = cliente_admin.get("/api/donantes", params={"activo": False}).json()
    por_contacto = cliente_admin.get("/api/donantes", params={"q": "ANA@"}).json()

    assert [d["name"] for d in activos["items"]] == ["Ana Ruiz"]
    assert [d["id"] for d in inactivos["items"]] == [inactivo["id"]]
    assert [d["name"] for d in por_contacto["items"]] == ["Ana Ruiz"]


def test_el_nombre_de_donante_no_se_repite_ni_cambiando_mayusculas(
    cliente_admin: TestClient,
) -> None:
    nuevo_donante(cliente_admin, "María Pérez")

    repetido = cliente_admin.post("/api/donantes", json={"name": "MARÍA PÉREZ"})

    assert repetido.status_code == 409


def test_editar_un_donante_no_puede_repetir_el_nombre_de_otro(cliente_admin: TestClient) -> None:
    nuevo_donante(cliente_admin, "María Pérez")
    otro = nuevo_donante(cliente_admin, "Ana Ruiz")

    choque = cliente_admin.patch(f"/api/donantes/{otro['id']}", json={"name": "maría pérez"})
    mismo = cliente_admin.patch(f"/api/donantes/{otro['id']}", json={"name": "ANA RUIZ"})

    assert choque.status_code == 409
    assert mismo.status_code == 200


def test_ver_y_editar_un_donante(cliente_admin: TestClient) -> None:
    donante = nuevo_donante(cliente_admin, "Ana Ruiz")

    editado = cliente_admin.patch(
        f"/api/donantes/{donante['id']}",
        json={"type": "empresa", "contact": "3001234567", "notes": "Dona cada diciembre"},
    )
    visto = cliente_admin.get(f"/api/donantes/{donante['id']}")

    assert editado.status_code == 200
    assert visto.json() == editado.json()
    assert (visto.json()["type"], visto.json()["contact"]) == ("empresa", "3001234567")
    assert visto.json()["name"] == "Ana Ruiz"


def test_desactivar_y_reactivar_un_donante_conserva_sus_datos(cliente_admin: TestClient) -> None:
    donante = nuevo_donante(cliente_admin, "Ana Ruiz", contact="ana@correo.co")

    apagado = cliente_admin.patch(f"/api/donantes/{donante['id']}", json={"active": False})
    visible = cliente_admin.get(f"/api/donantes/{donante['id']}")
    encendido = cliente_admin.patch(f"/api/donantes/{donante['id']}", json={"active": True})

    assert apagado.json()["active"] is False
    assert visible.status_code == 200
    assert visible.json()["contact"] == "ana@correo.co"
    assert encendido.json()["active"] is True


def test_datos_invalidos_se_rechazan(cliente_admin: TestClient) -> None:
    donante = nuevo_donante(cliente_admin, "Ana Ruiz")

    sin_nombre = cliente_admin.post("/api/donantes", json={"name": "   "})
    tipo_raro = cliente_admin.post("/api/donantes", json={"name": "X", "type": "fundacion"})
    campo_extra = cliente_admin.post("/api/donantes", json={"name": "Y", "foo": 1})
    nombre_nulo = cliente_admin.patch(f"/api/donantes/{donante['id']}", json={"name": None})
    activo_nulo = cliente_admin.patch(f"/api/donantes/{donante['id']}", json={"active": None})

    assert [
        r.status_code for r in (sin_nombre, tipo_raro, campo_extra, nombre_nulo, activo_nulo)
    ] == [422] * 5


def test_donante_inexistente_da_404(cliente_admin: TestClient) -> None:
    assert cliente_admin.get("/api/donantes/no-existe").status_code == 404
    assert cliente_admin.patch("/api/donantes/no-existe", json={"active": False}).status_code == 404


def test_consulta_puede_leer_pero_no_escribir(
    cliente_admin: TestClient, cliente_consulta: TestClient
) -> None:
    donante = nuevo_donante(cliente_admin, "Ana Ruiz")

    lista = cliente_consulta.get("/api/donantes")
    ver = cliente_consulta.get(f"/api/donantes/{donante['id']}")
    crear = cliente_consulta.post("/api/donantes", json={"name": "Otro"})
    editar = cliente_consulta.patch(f"/api/donantes/{donante['id']}", json={"active": False})

    assert (lista.status_code, ver.status_code) == (200, 200)
    assert (crear.status_code, editar.status_code) == (403, 403)


def test_sin_sesion_no_se_accede(cliente: TestClient) -> None:
    assert cliente.get("/api/donantes").status_code == 401
    assert cliente.post("/api/donantes", json={"name": "X"}).status_code == 401


def test_altas_y_cambios_quedan_en_auditoria(cliente_admin: TestClient, bd: Session) -> None:
    donante = nuevo_donante(cliente_admin, "Ana Ruiz")
    cliente_admin.patch(f"/api/donantes/{donante['id']}", json={"active": False})
    # Sin cambios reales no se audita.
    cliente_admin.patch(f"/api/donantes/{donante['id']}", json={"active": False})

    filas = bd.scalars(select(Auditoria).where(Auditoria.entidad == "donantes")).all()

    assert [(f.accion, f.cambios) for f in filas] == [
        ("crear", {"nombre": "Ana Ruiz"}),
        ("actualizar", {"activo": [True, False]}),
    ]
    assert all(f.entidad_id == donante["id"] for f in filas)


def test_el_texto_de_busqueda_no_usa_comodines(cliente_admin: TestClient) -> None:
    nuevo_donante(cliente_admin, "Ana Pérez")
    nuevo_donante(cliente_admin, "100% Solidario")

    nombres = [
        d["name"] for d in cliente_admin.get("/api/donantes", params={"q": "%"}).json()["items"]
    ]

    assert nombres == ["100% Solidario"]
