from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Prestamo
from app.tiempo import hoy
from tests.ayudas import (
    estado_del_equipo,
    nueva_sede,
    nuevo_equipo,
    nuevo_mantenimiento,
    nuevo_prestamo,
)

HOY = hoy().isoformat()
AYER = (hoy() - timedelta(days=1)).isoformat()
MANANA = (hoy() + timedelta(days=1)).isoformat()


@pytest.fixture
def admin(cliente_admin: TestClient) -> TestClient:
    nueva_sede(cliente_admin)
    return cliente_admin


@pytest.fixture
def equipo(admin: TestClient) -> dict:
    return nuevo_equipo(admin, location="Sala 2")


def devolver(cliente: TestClient, prestamo: dict, **cuerpo):
    return cliente.post(f"/api/prestamos/{prestamo['id']}/devolucion", json=cuerpo or None)


def test_prestar_marca_el_equipo_como_prestado(admin: TestClient, equipo: dict) -> None:
    prestamo = nuevo_prestamo(
        admin, equipo["id"], borrowerRole="Docente", expectedReturnDate=MANANA, purpose="Clases"
    )

    assert prestamo == {
        "id": prestamo["id"],
        "assetId": equipo["id"],
        "assetCode": "PC-01",
        "assetName": "Dell Latitude 7480",
        "borrowerName": "Laura Gómez",
        "borrowerId": "1010",
        "borrowerRole": "Docente",
        "borrowerEmail": "",
        "borrowerPhone": "",
        "sede": "Altos del Cabo",
        "purpose": "Clases",
        "loanDate": HOY,
        "expectedReturnDate": MANANA,
        "actualReturnDate": None,
        "status": "activo",
        "overdue": False,
        "conditionOnLoan": "",
        "returnNotes": "",
        "createdAt": prestamo["createdAt"],
        "updatedAt": prestamo["updatedAt"],
    }
    guardado = admin.get(f"/api/equipos/{equipo['id']}").json()
    assert (guardado["status"], guardado["assignedTo"], guardado["assignedRole"]) == (
        "prestado",
        "Laura Gómez",
        "Docente",
    )


def test_el_prestamo_acepta_lo_que_ya_envia_el_frontend(admin: TestClient, equipo: dict) -> None:
    nueva_sede(admin, "Feria")

    prestamo = nuevo_prestamo(
        admin,
        equipo["id"],
        assetCode="OTRA-PLACA",
        assetName="Dell Latitude 7480 (AULA-01)",
        sede="Feria",
        loanDate=AYER,
        expectedReturnDate="",
    )

    assert (prestamo["assetCode"], prestamo["assetName"]) == (
        "PC-01",
        "Dell Latitude 7480 (AULA-01)",
    )
    assert (prestamo["sede"], prestamo["loanDate"], prestamo["expectedReturnDate"]) == (
        "Feria",
        AYER,
        None,
    )


def test_no_se_presta_un_equipo_ya_prestado(admin: TestClient, equipo: dict) -> None:
    nuevo_prestamo(admin, equipo["id"])

    otro = admin.post("/api/prestamos", json={"assetId": equipo["id"], "borrowerName": "Otro"})

    assert otro.status_code == 409
    assert otro.json() == {
        "detail": "El equipo PC-01 no está disponible para préstamo (estado: prestado)"
    }


def test_no_se_presta_un_equipo_dado_de_baja_ni_en_mantenimiento(admin: TestClient) -> None:
    de_baja = nuevo_equipo(admin, "PC-02", status="baja")
    en_taller = nuevo_equipo(admin, "PC-03")
    nuevo_mantenimiento(admin, en_taller["id"])

    for equipo in (de_baja, en_taller):
        respuesta = admin.post(
            "/api/prestamos", json={"assetId": equipo["id"], "borrowerName": "X"}
        )
        assert respuesta.status_code == 409


def test_se_presta_un_equipo_que_esta_en_bodega(admin: TestClient) -> None:
    equipo = nuevo_equipo(admin, "PC-02", status="bodega")

    nuevo_prestamo(admin, equipo["id"])

    assert estado_del_equipo(admin, equipo["id"]) == "prestado"


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"assetId": "no-existe", "borrowerName": "Laura"},
        {"borrowerName": "Laura"},
        {"assetId": "x", "borrowerName": ""},
        {"assetId": "x", "borrowerName": "Laura", "status": "devuelto"},
        {"assetId": "x", "borrowerName": "Laura", "loanDate": "pronto"},
    ],
)
def test_datos_invalidos_al_prestar(admin: TestClient, cuerpo: dict) -> None:
    assert admin.post("/api/prestamos", json=cuerpo).status_code == 422


def test_la_base_impide_dos_prestamos_activos_del_mismo_equipo(
    admin: TestClient, equipo: dict, bd: Session
) -> None:
    nuevo_prestamo(admin, equipo["id"])
    bd.add(
        Prestamo(
            equipo_id=equipo["id"],
            equipo_placa="PC-01",
            prestatario_nombre="Colado",
            fecha_prestamo=hoy(),
            estado="activo",
        )
    )

    with pytest.raises(IntegrityError, match="uq_prestamos_activo_por_equipo"):
        bd.flush()
    bd.rollback()


def test_devolver_cierra_el_prestamo_y_libera_el_equipo(admin: TestClient, equipo: dict) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])

    respuesta = devolver(admin, prestamo, returnNotes="Sin novedades")

    assert respuesta.status_code == 200
    devuelto = respuesta.json()
    assert (devuelto["status"], devuelto["actualReturnDate"], devuelto["returnNotes"]) == (
        "devuelto",
        HOY,
        "Sin novedades",
    )
    guardado = admin.get(f"/api/equipos/{equipo['id']}").json()
    assert (guardado["status"], guardado["assignedTo"], guardado["assignedRole"]) == (
        "operativo",
        "Sala 2",
        "Disponible en Sede",
    )


def test_devolver_sin_cuerpo_deja_el_equipo_operativo(admin: TestClient, equipo: dict) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])

    assert admin.post(f"/api/prestamos/{prestamo['id']}/devolucion").status_code == 200
    assert estado_del_equipo(admin, equipo["id"]) == "operativo"


def test_al_devolver_se_elige_el_estado_del_equipo(admin: TestClient, equipo: dict) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])

    assert devolver(admin, prestamo, newAssetStatus="bodega").status_code == 200
    assert estado_del_equipo(admin, equipo["id"]) == "bodega"
    assert devolver(admin, prestamo, newAssetStatus="prestado").status_code == 422


def test_un_prestamo_no_se_devuelve_dos_veces(admin: TestClient, equipo: dict) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])
    devolver(admin, prestamo)

    repetida = devolver(admin, prestamo, newAssetStatus="baja")

    assert repetida.status_code == 409
    assert repetida.json() == {"detail": "Este préstamo ya fue devuelto"}
    assert estado_del_equipo(admin, equipo["id"]) == "operativo"


def test_devuelto_con_mantenimiento_abierto_pasa_a_mantenimiento(
    admin: TestClient, equipo: dict
) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])
    nuevo_mantenimiento(admin, equipo["id"])

    devolver(admin, prestamo)

    assert estado_del_equipo(admin, equipo["id"]) == "mantenimiento"


def test_vencido_se_calcula_con_la_fecha_de_hoy(admin: TestClient, equipo: dict) -> None:
    otro = nuevo_equipo(admin, "PC-02")
    atrasado = nuevo_prestamo(admin, equipo["id"], loanDate=AYER, expectedReturnDate=AYER)
    al_dia = nuevo_prestamo(admin, otro["id"], expectedReturnDate=HOY)

    def ids(**filtros) -> set[str]:
        return {p["id"] for p in admin.get("/api/prestamos", params=filtros).json()["items"]}

    assert (atrasado["overdue"], al_dia["overdue"]) == (True, False)
    assert ids(estado="vencido") == {atrasado["id"]}
    assert ids(estado="activo") == {atrasado["id"], al_dia["id"]}

    devolver(admin, atrasado)

    assert admin.get(f"/api/prestamos/{atrasado['id']}").json()["overdue"] is False
    assert ids(estado="vencido") == set()
    assert ids(estado="devuelto") == {atrasado["id"]}


def test_filtros_de_prestamos(admin: TestClient, equipo: dict) -> None:
    nueva_sede(admin, "Feria")
    otro = nuevo_equipo(admin, "PC-02")
    viejo = nuevo_prestamo(admin, equipo["id"], borrowerId="111", loanDate="2026-01-10")
    nuevo = nuevo_prestamo(admin, otro["id"], borrowerId="222", sede="Feria", loanDate="2026-03-05")

    def ids(**filtros) -> list[str]:
        respuesta = admin.get("/api/prestamos", params=filtros)
        assert respuesta.status_code == 200, respuesta.text
        return [p["id"] for p in respuesta.json()["items"]]

    assert ids() == [nuevo["id"], viejo["id"]]
    assert ids(documento="111") == [viejo["id"]]
    assert ids(sede="feria") == [nuevo["id"]]
    assert ids(equipo=otro["id"]) == [nuevo["id"]]
    assert ids(desde="2026-02-01") == [nuevo["id"]]
    assert ids(hasta="2026-02-01") == [viejo["id"]]
    assert ids(desde="2026-01-10", hasta="2026-03-05") == [nuevo["id"], viejo["id"]]
    assert admin.get("/api/prestamos", params={"estado": "perdido"}).status_code == 422


def test_el_historial_del_equipo_conserva_los_prestamos_devueltos(
    admin: TestClient, equipo: dict
) -> None:
    primero = nuevo_prestamo(admin, equipo["id"], borrowerName="Ana", loanDate=AYER)
    devolver(admin, primero)
    segundo = nuevo_prestamo(admin, equipo["id"], borrowerName="Luis")

    historial = admin.get(f"/api/equipos/{equipo['id']}/prestamos").json()

    assert [(p["id"], p["status"]) for p in historial["items"]] == [
        (segundo["id"], "activo"),
        (primero["id"], "devuelto"),
    ]
    assert historial["total"] == 2


def test_corregir_el_prestatario_actualiza_el_responsable_del_equipo(
    admin: TestClient, equipo: dict
) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])

    cambiado = admin.patch(
        f"/api/prestamos/{prestamo['id']}",
        json={"borrowerName": "Laura Gómez Ruiz", "expectedReturnDate": MANANA},
    ).json()

    assert (cambiado["borrowerName"], cambiado["expectedReturnDate"]) == (
        "Laura Gómez Ruiz",
        MANANA,
    )
    assert admin.get(f"/api/equipos/{equipo['id']}").json()["assignedTo"] == "Laura Gómez Ruiz"


@pytest.mark.parametrize(
    "cuerpo",
    [{"status": "devuelto"}, {"assetId": "otro"}, {"borrowerName": None}, {"loanDate": ""}],
)
def test_lo_que_no_se_puede_cambiar_en_un_prestamo(
    admin: TestClient, equipo: dict, cuerpo: dict
) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])

    assert admin.patch(f"/api/prestamos/{prestamo['id']}", json=cuerpo).status_code == 422


def test_los_prestamos_no_se_borran(admin: TestClient, equipo: dict) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])

    # No existe una ruta para borrarlos.
    assert admin.delete(f"/api/prestamos/{prestamo['id']}").status_code == 404
    assert admin.get(f"/api/prestamos/{prestamo['id']}").status_code == 200


def test_prestamo_inexistente(admin: TestClient) -> None:
    assert admin.get("/api/prestamos/no-existe").json() == {"detail": "Préstamo no encontrado"}
    assert admin.post("/api/prestamos/no-existe/devolucion").status_code == 404


def test_el_rol_consulta_ve_los_prestamos_pero_no_los_cambia(
    admin: TestClient, equipo: dict, cliente_consulta: TestClient
) -> None:
    prestamo = nuevo_prestamo(admin, equipo["id"])
    ruta = f"/api/prestamos/{prestamo['id']}"

    assert cliente_consulta.get("/api/prestamos").json()["items"][0]["borrowerId"] == "1010"
    assert cliente_consulta.get(ruta).status_code == 200
    assert cliente_consulta.get(f"/api/equipos/{equipo['id']}/prestamos").status_code == 200
    assert cliente_consulta.post("/api/prestamos", json={}).status_code == 403
    assert cliente_consulta.patch(ruta, json={}).status_code == 403
    assert cliente_consulta.post(f"{ruta}/devolucion").status_code == 403


def test_sin_sesion_no_se_ven_los_prestamos(cliente: TestClient) -> None:
    assert cliente.get("/api/prestamos").status_code == 401
