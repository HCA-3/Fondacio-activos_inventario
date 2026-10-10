import pytest
from fastapi.testclient import TestClient

from app.tiempo import hoy
from tests.ayudas import (
    estado_del_equipo,
    nueva_sede,
    nuevo_equipo,
    nuevo_mantenimiento,
    nuevo_prestamo,
)

HOY = hoy().isoformat()


@pytest.fixture
def admin(cliente_admin: TestClient) -> TestClient:
    nueva_sede(cliente_admin)
    return cliente_admin


@pytest.fixture
def equipo(admin: TestClient) -> dict:
    return nuevo_equipo(admin)


def completar(cliente: TestClient, mantenimiento: dict, **cuerpo):
    return cliente.post(f"/api/mantenimientos/{mantenimiento['id']}/completar", json=cuerpo or None)


def test_un_mantenimiento_abierto_pone_el_equipo_en_mantenimiento(
    admin: TestClient, equipo: dict
) -> None:
    mantenimiento = nuevo_mantenimiento(
        admin,
        equipo["id"],
        type="correctivo",
        status="en_progreso",
        scheduledDate="2026-11-02",
        technician="Soporte TI",
        cost=45000,
        nextScheduledMaintenance="",
    )

    assert mantenimiento == {
        "id": mantenimiento["id"],
        "assetId": equipo["id"],
        "assetCode": "PC-01",
        "assetName": "Dell Latitude 7480",
        "type": "correctivo",
        "status": "en_progreso",
        "requestDate": HOY,
        "scheduledDate": "2026-11-02",
        "completionDate": None,
        "technician": "Soporte TI",
        "cost": 45000,
        "description": "Limpieza general",
        "replacedParts": "",
        "nextScheduledMaintenance": None,
        "notes": "",
        "createdAt": mantenimiento["createdAt"],
        "updatedAt": mantenimiento["updatedAt"],
    }
    assert estado_del_equipo(admin, equipo["id"]) == "mantenimiento"


def test_por_defecto_queda_programado(admin: TestClient, equipo: dict) -> None:
    assert nuevo_mantenimiento(admin, equipo["id"])["status"] == "programado"


def test_registrar_uno_ya_terminado_no_mueve_el_equipo(admin: TestClient, equipo: dict) -> None:
    con_fecha = nuevo_mantenimiento(
        admin, equipo["id"], status="completado", completionDate="2026-09-14"
    )
    sin_fecha = nuevo_mantenimiento(admin, equipo["id"], status="completado")

    assert (con_fecha["completionDate"], sin_fecha["completionDate"]) == ("2026-09-14", HOY)
    assert estado_del_equipo(admin, equipo["id"]) == "operativo"


def test_completar_cierra_el_mantenimiento_y_libera_el_equipo(
    admin: TestClient, equipo: dict
) -> None:
    mantenimiento = nuevo_mantenimiento(admin, equipo["id"], notes="Revisar ventilador")

    respuesta = completar(admin, mantenimiento, notes="Ventilador cambiado")

    assert respuesta.status_code == 200
    cerrado = respuesta.json()
    assert (cerrado["status"], cerrado["completionDate"], cerrado["notes"]) == (
        "completado",
        HOY,
        "Revisar ventilador\nVentilador cambiado",
    )
    assert estado_del_equipo(admin, equipo["id"]) == "operativo"


def test_completar_sin_cuerpo_y_eligiendo_estado(admin: TestClient, equipo: dict) -> None:
    primero = nuevo_mantenimiento(admin, equipo["id"])
    assert admin.post(f"/api/mantenimientos/{primero['id']}/completar").status_code == 200
    assert estado_del_equipo(admin, equipo["id"]) == "operativo"

    segundo = nuevo_mantenimiento(admin, equipo["id"])
    assert completar(admin, segundo, newAssetStatus="mantenimiento").status_code == 422
    assert completar(admin, segundo, newAssetStatus="baja").status_code == 200
    assert estado_del_equipo(admin, equipo["id"]) == "baja"


def test_no_se_completa_dos_veces(admin: TestClient, equipo: dict) -> None:
    mantenimiento = nuevo_mantenimiento(admin, equipo["id"])
    completar(admin, mantenimiento)

    repetido = completar(admin, mantenimiento, newAssetStatus="baja")

    assert repetido.status_code == 409
    assert repetido.json() == {"detail": "Este mantenimiento ya estaba completado"}
    assert estado_del_equipo(admin, equipo["id"]) == "operativo"


def test_con_dos_abiertos_el_equipo_sigue_en_mantenimiento_hasta_cerrar_ambos(
    admin: TestClient, equipo: dict
) -> None:
    primero = nuevo_mantenimiento(admin, equipo["id"])
    segundo = nuevo_mantenimiento(admin, equipo["id"], type="upgrade")

    completar(admin, primero)
    assert estado_del_equipo(admin, equipo["id"]) == "mantenimiento"

    completar(admin, segundo)
    assert estado_del_equipo(admin, equipo["id"]) == "operativo"


def test_un_equipo_prestado_sigue_prestado_durante_el_mantenimiento(
    admin: TestClient, equipo: dict
) -> None:
    nuevo_prestamo(admin, equipo["id"])

    mantenimiento = nuevo_mantenimiento(admin, equipo["id"])
    assert estado_del_equipo(admin, equipo["id"]) == "prestado"

    completar(admin, mantenimiento)
    assert estado_del_equipo(admin, equipo["id"]) == "prestado"


def test_un_equipo_de_baja_no_admite_mantenimientos_abiertos(admin: TestClient) -> None:
    de_baja = nuevo_equipo(admin, "PC-02", status="baja")

    abierto = admin.post(
        "/api/mantenimientos", json={"assetId": de_baja["id"], "type": "preventivo"}
    )

    assert abierto.status_code == 409
    assert abierto.json() == {"detail": "El equipo PC-02 está dado de baja"}
    nuevo_mantenimiento(admin, de_baja["id"], status="completado")
    assert estado_del_equipo(admin, de_baja["id"]) == "baja"


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"assetId": "no-existe", "type": "preventivo"},
        {"assetId": "x"},
        {"assetId": "x", "type": "limpieza"},
        {"assetId": "x", "type": "preventivo", "status": "cancelado"},
        {"assetId": "x", "type": "preventivo", "cost": -5},
    ],
)
def test_datos_invalidos_al_crear_mantenimiento(admin: TestClient, cuerpo: dict) -> None:
    assert admin.post("/api/mantenimientos", json=cuerpo).status_code == 422


def test_actualizar_campos_y_pasar_a_en_progreso(admin: TestClient, equipo: dict) -> None:
    mantenimiento = nuevo_mantenimiento(admin, equipo["id"])

    cambiado = admin.patch(
        f"/api/mantenimientos/{mantenimiento['id']}",
        json={"status": "en_progreso", "cost": 80000, "technician": "Soporte TI"},
    ).json()

    assert (cambiado["status"], cambiado["cost"], cambiado["technician"]) == (
        "en_progreso",
        80000,
        "Soporte TI",
    )
    assert cambiado["description"] == "Limpieza general"


def test_el_estado_completado_solo_se_alcanza_con_la_accion_de_completar(
    admin: TestClient, equipo: dict
) -> None:
    mantenimiento = nuevo_mantenimiento(admin, equipo["id"])
    ruta = f"/api/mantenimientos/{mantenimiento['id']}"

    atajo = admin.patch(ruta, json={"status": "completado", "cost": 99})
    assert atajo.status_code == 409
    assert admin.get(ruta).json()["cost"] == 0

    completar(admin, mantenimiento)
    reabrir = admin.patch(ruta, json={"status": "programado"})
    assert reabrir.status_code == 409
    assert reabrir.json() == {"detail": "Un mantenimiento completado no se puede reabrir"}
    # Uno ya completado sí admite correcciones de sus datos.
    assert admin.patch(ruta, json={"cost": 120000}).json()["cost"] == 120000


@pytest.mark.parametrize("cuerpo", [{"cost": -1}, {"type": None}, {"assetId": "otro"}])
def test_cambios_invalidos_de_mantenimiento(admin: TestClient, equipo: dict, cuerpo: dict) -> None:
    mantenimiento = nuevo_mantenimiento(admin, equipo["id"])

    assert admin.patch(f"/api/mantenimientos/{mantenimiento['id']}", json=cuerpo).status_code == 422


def test_filtros_e_historial_de_mantenimientos(admin: TestClient, equipo: dict) -> None:
    otro = nuevo_equipo(admin, "PC-02")
    viejo = nuevo_mantenimiento(admin, equipo["id"], status="completado", requestDate="2026-01-10")
    abierto = nuevo_mantenimiento(admin, equipo["id"], type="correctivo", requestDate="2026-03-01")
    ajeno = nuevo_mantenimiento(admin, otro["id"], type="upgrade", requestDate="2026-02-01")

    def ids(ruta: str = "/api/mantenimientos", **filtros) -> list[str]:
        respuesta = admin.get(ruta, params=filtros)
        assert respuesta.status_code == 200, respuesta.text
        return [m["id"] for m in respuesta.json()["items"]]

    assert ids() == [abierto["id"], ajeno["id"], viejo["id"]]
    assert ids(estado="completado") == [viejo["id"]]
    assert ids(tipo="upgrade") == [ajeno["id"]]
    assert ids(equipo=otro["id"]) == [ajeno["id"]]
    assert ids(f"/api/equipos/{equipo['id']}/mantenimientos") == [abierto["id"], viejo["id"]]
    assert admin.get("/api/mantenimientos", params={"estado": "cancelado"}).status_code == 422


def test_mantenimiento_inexistente(admin: TestClient) -> None:
    assert admin.get("/api/mantenimientos/x").json() == {"detail": "Mantenimiento no encontrado"}
    assert admin.post("/api/mantenimientos/x/completar").status_code == 404


def test_el_rol_consulta_ve_los_mantenimientos_pero_no_los_cambia(
    admin: TestClient, equipo: dict, cliente_consulta: TestClient
) -> None:
    mantenimiento = nuevo_mantenimiento(admin, equipo["id"])
    ruta = f"/api/mantenimientos/{mantenimiento['id']}"

    assert cliente_consulta.get("/api/mantenimientos").status_code == 200
    assert cliente_consulta.get(ruta).status_code == 200
    assert cliente_consulta.post("/api/mantenimientos", json={}).status_code == 403
    assert cliente_consulta.patch(ruta, json={}).status_code == 403
    assert cliente_consulta.post(f"{ruta}/completar").status_code == 403


def test_sin_sesion_no_se_ven_los_mantenimientos(cliente: TestClient) -> None:
    assert cliente.get("/api/mantenimientos").status_code == 401
