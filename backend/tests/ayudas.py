"""Atajos para crear registros por la API en las pruebas."""

from fastapi.testclient import TestClient


def crear(cliente: TestClient, ruta: str, cuerpo: dict) -> dict:
    respuesta = cliente.post(ruta, json=cuerpo)
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()


def nueva_sede(cliente: TestClient, nombre: str = "Altos del Cabo", **campos) -> dict:
    return crear(cliente, "/api/sedes", {"name": nombre, "code": "CABO"} | campos)


def nuevo_equipo(cliente: TestClient, placa: str = "PC-01", **campos) -> dict:
    cuerpo = {"code": placa, "sede": "Altos del Cabo", "brand": "Dell", "model": "Latitude 7480"}
    return crear(cliente, "/api/equipos", cuerpo | campos)


def nuevo_prestamo(cliente: TestClient, equipo_id: str, **campos) -> dict:
    cuerpo = {"assetId": equipo_id, "borrowerName": "Laura Gómez", "borrowerId": "1010"}
    return crear(cliente, "/api/prestamos", cuerpo | campos)


def nuevo_mantenimiento(cliente: TestClient, equipo_id: str, **campos) -> dict:
    cuerpo = {"assetId": equipo_id, "type": "preventivo", "description": "Limpieza general"}
    return crear(cliente, "/api/mantenimientos", cuerpo | campos)


def estado_del_equipo(cliente: TestClient, equipo_id: str) -> str:
    return cliente.get(f"/api/equipos/{equipo_id}").json()["status"]
