from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Auditoria, DonacionComprobante
from tests.ayudas import nueva_donacion, nueva_sede, nuevo_donante


def imagen(
    formato: str = "PNG", tamano: tuple[int, int] = (2000, 1000), modo: str = "RGB"
) -> bytes:
    salida = BytesIO()
    Image.new(modo, tamano, "red").save(salida, formato)
    return salida.getvalue()


@pytest.fixture
def donacion(cliente_admin: TestClient) -> dict:
    nueva_sede(cliente_admin)
    return nueva_donacion(cliente_admin, nuevo_donante(cliente_admin))


def subir(cliente: TestClient, donacion: dict, contenido: bytes, tipo: str = "image/png"):
    return cliente.put(
        f"/api/donaciones/{donacion['id']}/comprobante",
        content=contenido,
        headers={"Content-Type": tipo},
    )


def abrir(contenido: bytes) -> Image.Image:
    return Image.open(BytesIO(contenido))


def test_una_donacion_nueva_no_tiene_comprobante(cliente_admin: TestClient, donacion: dict) -> None:
    assert donacion["receipt"] == ""
    assert cliente_admin.get(f"/api/donaciones/{donacion['id']}/comprobante").status_code == 404


def test_subir_el_comprobante_lo_reduce_y_lo_deja_en_la_donacion(
    cliente_admin: TestClient, donacion: dict
) -> None:
    respuesta = subir(cliente_admin, donacion, imagen("PNG", (2000, 1000)))

    assert respuesta.status_code == 200
    ruta = respuesta.json()["receipt"]
    assert ruta.startswith(f"/api/donaciones/{donacion['id']}/comprobante?v=")
    assert cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()["receipt"] == ruta
    assert cliente_admin.get("/api/donaciones").json()["items"][0]["receipt"] == ruta

    foto = cliente_admin.get(ruta)
    assert foto.status_code == 200
    assert foto.headers["content-type"] == "image/webp"
    assert foto.headers["x-content-type-options"] == "nosniff"
    guardada = abrir(foto.content)
    assert (guardada.format, guardada.size) == ("WEBP", (1280, 640))


@pytest.mark.parametrize("formato", ["JPEG", "PNG", "WEBP"])
def test_formatos_admitidos(cliente_admin: TestClient, donacion: dict, formato: str) -> None:
    respuesta = subir(cliente_admin, donacion, imagen(formato, (300, 200)))

    assert respuesta.status_code == 200


@pytest.mark.parametrize("contenido", [b"esto no es una imagen", b"", imagen("GIF", (10, 10))])
def test_un_archivo_que_no_es_imagen_valida_se_rechaza(
    cliente_admin: TestClient, donacion: dict, contenido: bytes
) -> None:
    respuesta = subir(cliente_admin, donacion, contenido)

    assert respuesta.status_code == 422
    assert respuesta.json()["detail"][0]["msg"] == "El archivo debe ser una imagen JPEG, PNG o WebP"
    assert cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()["receipt"] == ""


def test_un_comprobante_de_mas_de_10_mb_se_rechaza(
    cliente_admin: TestClient, donacion: dict
) -> None:
    respuesta = subir(cliente_admin, donacion, b"\0" * (10 * 1024 * 1024 + 1))

    assert respuesta.status_code == 413
    assert respuesta.json() == {"detail": "La imagen supera los 10 MB"}


def test_reemplazar_el_comprobante_cambia_su_direccion(
    cliente_admin: TestClient, donacion: dict, bd: Session
) -> None:
    primera = subir(cliente_admin, donacion, imagen("PNG", (100, 100))).json()["receipt"]

    segunda = subir(cliente_admin, donacion, imagen("PNG", (200, 100))).json()["receipt"]

    assert primera != segunda
    assert abrir(cliente_admin.get(segunda).content).size == (200, 100)
    assert bd.scalar(select(func.count()).select_from(DonacionComprobante)) == 1


def test_el_comprobante_se_guarda_en_cache_y_se_revalida_con_etag(
    cliente_admin: TestClient, donacion: dict
) -> None:
    ruta = subir(cliente_admin, donacion, imagen("PNG", (100, 100))).json()["receipt"]
    sin_version = ruta.split("?")[0]

    con_version = cliente_admin.get(ruta)
    repetida = cliente_admin.get(
        sin_version, headers={"If-None-Match": con_version.headers["etag"]}
    )

    assert con_version.headers["cache-control"] == "private, max-age=31536000, immutable"
    assert cliente_admin.get(sin_version).headers["cache-control"] == "private, no-cache"
    assert (repetida.status_code, repetida.content) == (304, b"")


def test_borrar_el_comprobante(cliente_admin: TestClient, donacion: dict) -> None:
    ruta = subir(cliente_admin, donacion, imagen("PNG", (100, 100))).json()["receipt"]

    borrado = cliente_admin.delete(f"/api/donaciones/{donacion['id']}/comprobante")

    assert borrado.status_code == 204
    assert cliente_admin.get(ruta).status_code == 404
    assert cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()["receipt"] == ""
    otra_vez = cliente_admin.delete(f"/api/donaciones/{donacion['id']}/comprobante")
    assert (otra_vez.status_code, otra_vez.json()) == (
        404,
        {"detail": "La donación no tiene comprobante"},
    )


def test_una_donacion_anulada_no_admite_cambiar_el_comprobante(
    cliente_admin: TestClient, donacion: dict
) -> None:
    ruta = subir(cliente_admin, donacion, imagen("PNG", (100, 100))).json()["receipt"]
    cliente_admin.post(f"/api/donaciones/{donacion['id']}/anular")

    assert subir(cliente_admin, donacion, imagen("PNG", (10, 10))).status_code == 409
    assert cliente_admin.delete(f"/api/donaciones/{donacion['id']}/comprobante").status_code == 409
    assert cliente_admin.get(ruta).status_code == 200


def test_donacion_inexistente(cliente_admin: TestClient) -> None:
    assert subir(cliente_admin, {"id": "no-existe"}, imagen("PNG", (10, 10))).status_code == 404
    assert cliente_admin.get("/api/donaciones/no-existe/comprobante").status_code == 404
    assert cliente_admin.delete("/api/donaciones/no-existe/comprobante").status_code == 404


def test_el_rol_consulta_ve_el_comprobante_pero_no_lo_cambia(
    cliente_admin: TestClient, donacion: dict, cliente_consulta: TestClient
) -> None:
    ruta = subir(cliente_admin, donacion, imagen("PNG", (100, 100))).json()["receipt"]

    assert cliente_consulta.get(ruta).status_code == 200
    assert subir(cliente_consulta, donacion, imagen("PNG", (10, 10))).status_code == 403
    path = f"/api/donaciones/{donacion['id']}/comprobante"
    assert cliente_consulta.delete(path).status_code == 403


def test_sin_sesion_no_se_ve_el_comprobante(
    cliente_admin: TestClient, donacion: dict, cliente: TestClient
) -> None:
    ruta = subir(cliente_admin, donacion, imagen("PNG", (100, 100))).json()["receipt"]

    assert cliente.get(ruta).status_code == 401


def test_subir_y_borrar_el_comprobante_queda_en_la_auditoria(
    cliente_admin: TestClient, donacion: dict, bd: Session
) -> None:
    subir(cliente_admin, donacion, imagen("PNG", (100, 100)))
    cliente_admin.delete(f"/api/donaciones/{donacion['id']}/comprobante")

    acciones = bd.scalars(
        select(Auditoria.accion)
        .where(Auditoria.entidad == "donaciones", Auditoria.entidad_id == donacion["id"])
        .order_by(Auditoria.id)
    ).all()
    assert acciones == ["crear", "subir_comprobante", "borrar_comprobante"]
