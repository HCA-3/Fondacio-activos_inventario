from datetime import timedelta

from fastapi.testclient import TestClient

from app.tiempo import hoy
from tests.ayudas import nueva_sede, nuevo_equipo, nuevo_mantenimiento, nuevo_prestamo

AYER = (hoy() - timedelta(days=1)).isoformat()


def test_el_panel_vacio_devuelve_ceros(cliente_admin: TestClient) -> None:
    assert cliente_admin.get("/api/dashboard").json() == {
        "total": 0,
        "operativos": 0,
        "prestados": 0,
        "mantenimiento": 0,
        "bodega": 0,
        "baja": 0,
        "totalValue": 0,
        "bySede": {},
        "byCategory": {},
        "activeLoansCount": 0,
        "overdueLoansCount": 0,
        "pendingMaintCount": 0,
    }


def test_el_panel_resume_el_inventario(cliente_admin: TestClient) -> None:
    admin = cliente_admin
    nueva_sede(admin, "Altos del Cabo")
    nueva_sede(admin, "YLDC Potosí")
    nueva_sede(admin, "Sede Administrativa")
    operativo = nuevo_equipo(admin, "PC-01", computerType="PORTÁTIL", estimatedValue=1600000)
    prestado = nuevo_equipo(admin, "PC-02", computerType="PORTÁTIL", estimatedValue=2100000)
    atrasado = nuevo_equipo(admin, "TAB-01", category="tablet", computerType="TABLET")
    en_taller = nuevo_equipo(admin, "TAB-02", sede="YLDC Potosí", estimatedValue=250000)
    nuevo_equipo(admin, "SRV-01", sede="YLDC Potosí", status="bodega")
    nuevo_equipo(admin, "IMP-01", sede="YLDC Potosí", status="baja", computerType="MINIPC")
    nuevo_prestamo(admin, prestado["id"])
    nuevo_prestamo(admin, atrasado["id"], loanDate=AYER, expectedReturnDate=AYER)
    nuevo_mantenimiento(admin, en_taller["id"])
    nuevo_mantenimiento(admin, operativo["id"], status="completado")

    assert admin.get("/api/dashboard").json() == {
        "total": 6,
        "operativos": 1,
        "prestados": 2,
        "mantenimiento": 1,
        "bodega": 1,
        "baja": 1,
        "totalValue": 3950000,
        # Las sedes sin equipos también salen, en cero.
        "bySede": {"Altos del Cabo": 3, "Sede Administrativa": 0, "YLDC Potosí": 3},
        # Las tablets se agrupan por categoría o por placa; lo que no tiene tipo va a "Otros".
        "byCategory": {"MINIPC": 1, "Otros": 1, "PORTÁTIL": 2, "TABLETS": 2},
        "activeLoansCount": 2,
        "overdueLoansCount": 1,
        "pendingMaintCount": 1,
    }


def test_el_rol_consulta_ve_el_panel(cliente_consulta: TestClient) -> None:
    assert cliente_consulta.get("/api/dashboard").status_code == 200


def test_sin_sesion_no_se_ve_el_panel(cliente: TestClient) -> None:
    assert cliente.get("/api/dashboard").status_code == 401
