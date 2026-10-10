import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Auditoria
from tests.ayudas import nueva_sede, nuevo_equipo, nuevo_mantenimiento, nuevo_prestamo

COLUMNAS = {
    "id", "code", "sede", "sedeId", "status", "category", "computerType", "brand", "model",
    "serial", "area", "assignedTo", "assignedRole", "location", "condition", "estimatedValue",
    "purchaseDate", "image", "createdAt", "updatedAt",
}  # fmt: skip


@pytest.fixture
def admin(cliente_admin: TestClient) -> TestClient:
    """Administrador con la sede Altos del Cabo ya creada."""
    nueva_sede(cliente_admin)
    return cliente_admin


def test_crear_guarda_columnas_y_ficha_tecnica(admin: TestClient) -> None:
    creado = nuevo_equipo(
        admin,
        "pc-01 ",
        category="laptop",
        computerType="PORTÁTIL",
        estimatedValue=1600000,
        purchaseDate="2023-01-15",
        processor="Intel Core i5-7300U",
        ram="16 GB",
        disk2Brand="",
    )

    detalle = admin.get(f"/api/equipos/{creado['id']}").json()

    assert detalle == creado
    assert (detalle["code"], detalle["sede"], detalle["status"]) == (
        "PC-01",
        "Altos del Cabo",
        "operativo",
    )
    assert (detalle["estimatedValue"], detalle["purchaseDate"]) == (1600000, "2023-01-15")
    # La ficha técnica sale al mismo nivel que las columnas, como la usa el frontend.
    assert (detalle["processor"], detalle["ram"], detalle["disk2Brand"]) == (
        "Intel Core i5-7300U",
        "16 GB",
        "",
    )
    assert set(detalle) == COLUMNAS | {"processor", "ram", "disk2Brand"}


def test_la_lista_trae_solo_el_resumen(admin: TestClient) -> None:
    nuevo_equipo(admin, processor="Intel Core i5")

    (item,) = admin.get("/api/equipos").json()["items"]

    assert set(item) == COLUMNAS


def test_campos_vacios_de_fecha_y_valor_se_guardan_nulos(admin: TestClient) -> None:
    equipo = nuevo_equipo(admin, purchaseDate="", estimatedValue="", brand=None)

    assert (equipo["purchaseDate"], equipo["estimatedValue"], equipo["brand"]) == (None, None, "")


def test_la_placa_no_se_repite(admin: TestClient) -> None:
    nuevo_equipo(admin, "PC-01")

    repetido = admin.post("/api/equipos", json={"code": "pc-01", "sede": "Altos del Cabo"})

    assert repetido.status_code == 409
    assert repetido.json() == {"detail": "Ya existe un equipo con la placa PC-01"}


def test_sede_inexistente_responde_como_error_de_validacion(admin: TestClient) -> None:
    respuesta = admin.post("/api/equipos", json={"code": "PC-01", "sede": "Marte"})

    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "detail": [
            {"type": "value_error", "loc": ["body", "sede"], "msg": "No existe la sede 'Marte'"}
        ]
    }


@pytest.mark.parametrize("estado", ["prestado", "mantenimiento"])
def test_no_se_crea_un_equipo_en_un_estado_del_sistema(admin: TestClient, estado: str) -> None:
    respuesta = admin.post(
        "/api/equipos", json={"code": "PC-01", "sede": "Altos del Cabo", "status": estado}
    )

    assert respuesta.status_code == 409


@pytest.mark.parametrize(
    "cambio",
    [
        {"code": ""},
        {"sede": ""},
        {"status": "perdido"},
        {"estimatedValue": -1},
        {"purchaseDate": "ayer"},
        {"image": "data:image/png;base64," + "A" * 600},
        {"discos": [{"marca": "x"}]},
        {"notas": "x" * 5001},
    ],
)
def test_datos_invalidos_al_crear_equipo(admin: TestClient, cambio: dict) -> None:
    cuerpo = {"code": "PC-01", "sede": "Altos del Cabo"} | cambio

    assert admin.post("/api/equipos", json=cuerpo).status_code == 422


def test_filtros_de_la_lista(admin: TestClient) -> None:
    nueva_sede(admin, "YLDC Potosí")
    nuevo_equipo(admin, "PC-01", category="laptop", computerType="PORTÁTIL")
    nuevo_equipo(admin, "TAB-01", category="tablet", computerType="TABLET", status="bodega")
    nuevo_equipo(admin, "PC-02", sede="YLDC Potosí", category="laptop", computerType="PORTÁTIL")

    def placas(**filtros) -> set[str]:
        respuesta = admin.get("/api/equipos", params=filtros)
        assert respuesta.status_code == 200, respuesta.text
        return {e["code"] for e in respuesta.json()["items"]}

    assert placas() == {"PC-01", "TAB-01", "PC-02"}
    assert placas(sede="yldc potosí") == {"PC-02"}
    assert placas(estado="bodega") == {"TAB-01"}
    assert placas(categoria="laptop") == {"PC-01", "PC-02"}
    assert placas(tipo="tablet") == {"TAB-01"}
    assert placas(sede="Altos del Cabo", categoria="laptop") == {"PC-01"}
    assert admin.get("/api/equipos", params={"estado": "perdido"}).status_code == 422


def test_la_busqueda_revisa_columnas_y_ficha_sin_distinguir_mayusculas(admin: TestClient) -> None:
    nuevo_equipo(admin, "PC-01", serial="ABC123", processor="Intel Core i5", ip="192.168.1.20")
    nuevo_equipo(admin, "PC-02", brand="Asus", model="Vivobook", networkHostname="AULA_02")

    def placas(q: str) -> set[str]:
        return {e["code"] for e in admin.get("/api/equipos", params={"q": q}).json()["items"]}

    assert placas("abc1") == {"PC-01"}
    assert placas("core i5") == {"PC-01"}
    assert placas("192.168") == {"PC-01"}
    assert placas("vivo") == {"PC-02"}
    assert placas("pc-") == {"PC-01", "PC-02"}
    # % y _ se buscan como texto, no como comodines.
    assert placas("%") == set()
    assert placas("aula_0") == {"PC-02"}
    assert placas("aula_x") == set()


def test_la_lista_se_pagina(admin: TestClient) -> None:
    for numero in range(3):
        nuevo_equipo(admin, f"PC-0{numero}")

    pagina = admin.get("/api/equipos", params={"limit": 2, "offset": 2}).json()

    assert (len(pagina["items"]), pagina["total"], pagina["limit"], pagina["offset"]) == (
        1,
        3,
        2,
        2,
    )


def test_actualizar_mezcla_la_ficha_tecnica(admin: TestClient) -> None:
    equipo = nuevo_equipo(admin, processor="Intel Core i5", ram="8 GB", os="Windows 10")

    cambiado = admin.patch(
        f"/api/equipos/{equipo['id']}", json={"ram": "16 GB", "os": None, "gpu": "Intel HD"}
    ).json()

    assert (cambiado["processor"], cambiado["ram"], cambiado["gpu"]) == (
        "Intel Core i5",
        "16 GB",
        "Intel HD",
    )
    assert "os" not in cambiado
    assert cambiado["brand"] == "Dell"


def test_reenviar_el_equipo_completo_no_cambia_nada(admin: TestClient, bd: Session) -> None:
    equipo = nuevo_equipo(admin, processor="Intel Core i5")

    respuesta = admin.patch(f"/api/equipos/{equipo['id']}", json=equipo | {"id": "otro-id"})

    assert respuesta.status_code == 200
    assert respuesta.json() == equipo
    assert bd.scalar(select(Auditoria).where(Auditoria.accion == "actualizar")) is None


def test_cambiar_columnas_sede_y_estado_a_mano(admin: TestClient, bd: Session) -> None:
    nueva_sede(admin, "YLDC Potosí")
    equipo = nuevo_equipo(admin)

    cambiado = admin.patch(
        f"/api/equipos/{equipo['id']}",
        json={"sede": "YLDC Potosí", "status": "baja", "location": "Bodega 2"},
    ).json()

    assert (cambiado["sede"], cambiado["status"], cambiado["location"]) == (
        "YLDC Potosí",
        "baja",
        "Bodega 2",
    )
    fila = bd.scalar(select(Auditoria).where(Auditoria.accion == "actualizar"))
    assert fila.cambios == {
        "ubicacion": ["", "Bodega 2"],
        "estado": ["operativo", "baja"],
        "sede": ["Altos del Cabo", "YLDC Potosí"],
    }


@pytest.mark.parametrize("estado", ["prestado", "mantenimiento"])
def test_los_estados_del_sistema_no_se_eligen_a_mano(admin: TestClient, estado: str) -> None:
    equipo = nuevo_equipo(admin)

    respuesta = admin.patch(f"/api/equipos/{equipo['id']}", json={"status": estado})

    assert respuesta.status_code == 409
    assert "lo pone el sistema" in respuesta.json()["detail"]


def test_un_equipo_prestado_no_cambia_de_estado_y_el_fallo_no_guarda_nada(
    admin: TestClient,
) -> None:
    equipo = nuevo_equipo(admin)
    nuevo_prestamo(admin, equipo["id"])

    respuesta = admin.patch(
        f"/api/equipos/{equipo['id']}", json={"status": "baja", "location": "Bodega 2"}
    )

    assert respuesta.status_code == 409
    assert "préstamo activo" in respuesta.json()["detail"]
    guardado = admin.get(f"/api/equipos/{equipo['id']}").json()
    assert (guardado["status"], guardado["location"]) == ("prestado", "")


def test_un_equipo_en_mantenimiento_abierto_no_cambia_de_estado(admin: TestClient) -> None:
    equipo = nuevo_equipo(admin)
    nuevo_mantenimiento(admin, equipo["id"])

    respuesta = admin.patch(f"/api/equipos/{equipo['id']}", json={"status": "operativo"})

    assert respuesta.status_code == 409
    assert "mantenimiento abierto" in respuesta.json()["detail"]


def test_un_equipo_prestado_si_admite_otros_cambios(admin: TestClient) -> None:
    equipo = nuevo_equipo(admin)
    nuevo_prestamo(admin, equipo["id"])
    prestado = admin.get(f"/api/equipos/{equipo['id']}").json()

    respuesta = admin.patch(f"/api/equipos/{equipo['id']}", json=prestado | {"condition": "Bueno"})

    assert respuesta.status_code == 200
    assert (respuesta.json()["status"], respuesta.json()["condition"]) == ("prestado", "Bueno")


def test_borrar_un_equipo_sin_historial(admin: TestClient) -> None:
    equipo = nuevo_equipo(admin)

    assert admin.delete(f"/api/equipos/{equipo['id']}").status_code == 204
    assert admin.get(f"/api/equipos/{equipo['id']}").status_code == 404


def test_un_equipo_con_historial_no_se_borra(admin: TestClient) -> None:
    equipo = nuevo_equipo(admin)
    nuevo_mantenimiento(admin, equipo["id"], status="completado")

    respuesta = admin.delete(f"/api/equipos/{equipo['id']}")

    assert respuesta.status_code == 409
    assert "dado de baja" in respuesta.json()["detail"]


def test_equipo_inexistente(admin: TestClient) -> None:
    assert admin.get("/api/equipos/no-existe").json() == {"detail": "Equipo no encontrado"}
    assert admin.patch("/api/equipos/no-existe", json={}).status_code == 404
    assert admin.delete("/api/equipos/no-existe").status_code == 404
    assert admin.get("/api/equipos/no-existe/prestamos").status_code == 404


def test_el_rol_consulta_ve_los_equipos_pero_no_los_cambia(
    admin: TestClient, cliente_consulta: TestClient
) -> None:
    equipo = nuevo_equipo(admin)
    ruta = f"/api/equipos/{equipo['id']}"

    assert cliente_consulta.get("/api/equipos").status_code == 200
    assert cliente_consulta.get(ruta).status_code == 200
    assert cliente_consulta.post("/api/equipos", json={}).status_code == 403
    assert cliente_consulta.patch(ruta, json={}).status_code == 403
    assert cliente_consulta.delete(ruta).status_code == 403


def test_sin_sesion_no_se_ven_los_equipos(cliente: TestClient) -> None:
    assert cliente.get("/api/equipos").status_code == 401
    assert cliente.get("/api/equipos/x").status_code == 401


def test_la_imagen_admite_una_ruta_larga_pero_no_un_archivo_incrustado(admin: TestClient) -> None:
    ruta = "https://ejemplo.org/fotos/" + "a" * 400 + ".jpg"

    assert nuevo_equipo(admin, image=ruta)["image"] == ruta
