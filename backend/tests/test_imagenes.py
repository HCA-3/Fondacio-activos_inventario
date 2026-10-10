from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import EquipoImagen
from tests.ayudas import nueva_sede, nuevo_equipo


def imagen(
    formato: str = "PNG", tamano: tuple[int, int] = (2000, 1000), modo: str = "RGB"
) -> bytes:
    salida = BytesIO()
    Image.new(modo, tamano, "red").save(salida, formato)
    return salida.getvalue()


@pytest.fixture
def admin(cliente_admin: TestClient) -> TestClient:
    nueva_sede(cliente_admin)
    return cliente_admin


@pytest.fixture
def equipo(admin: TestClient) -> dict:
    return nuevo_equipo(admin, image="img/dell_latitude_7480.jpg")


def subir(cliente: TestClient, equipo: dict, contenido: bytes, tipo: str = "image/png"):
    return cliente.put(
        f"/api/equipos/{equipo['id']}/imagen", content=contenido, headers={"Content-Type": tipo}
    )


def abrir(contenido: bytes) -> Image.Image:
    return Image.open(BytesIO(contenido))


def test_subir_una_foto_la_reduce_y_la_deja_como_imagen_del_equipo(
    admin: TestClient, equipo: dict
) -> None:
    respuesta = subir(admin, equipo, imagen("PNG", (2000, 1000)))

    assert respuesta.status_code == 200
    ruta = respuesta.json()["image"]
    assert ruta.startswith(f"/api/equipos/{equipo['id']}/imagen?v=")
    assert admin.get("/api/equipos").json()["items"][0]["image"] == ruta

    foto = admin.get(ruta)
    assert foto.status_code == 200
    assert foto.headers["content-type"] == "image/webp"
    assert foto.headers["x-content-type-options"] == "nosniff"
    guardada = abrir(foto.content)
    assert (guardada.format, guardada.size) == ("WEBP", (1280, 640))


@pytest.mark.parametrize("formato", ["JPEG", "PNG", "WEBP"])
def test_formatos_admitidos(admin: TestClient, equipo: dict, formato: str) -> None:
    respuesta = subir(admin, equipo, imagen(formato, (300, 200)))

    assert respuesta.status_code == 200
    assert abrir(admin.get(respuesta.json()["image"]).content).size == (300, 200)


def test_una_imagen_con_transparencia_la_conserva(admin: TestClient, equipo: dict) -> None:
    transparente = BytesIO()
    Image.new("RGBA", (50, 50), (255, 0, 0, 0)).save(transparente, "PNG")

    ruta = subir(admin, equipo, transparente.getvalue()).json()["image"]

    assert abrir(admin.get(ruta).content).mode == "RGBA"


@pytest.mark.parametrize(
    "contenido",
    [b"esto no es una imagen", b"", imagen("GIF", (10, 10)), imagen("PNG", (10, 10))[:40]],
)
def test_un_archivo_que_no_es_imagen_valida_se_rechaza(
    admin: TestClient, equipo: dict, contenido: bytes
) -> None:
    respuesta = subir(admin, equipo, contenido)

    assert respuesta.status_code == 422
    assert respuesta.json()["detail"][0] == {
        "type": "value_error",
        "loc": ["body", "imagen"],
        "msg": "El archivo debe ser una imagen JPEG, PNG o WebP",
    }
    assert admin.get(f"/api/equipos/{equipo['id']}").json()["image"] == "img/dell_latitude_7480.jpg"


def test_una_imagen_de_mas_de_10_mb_se_rechaza(admin: TestClient, equipo: dict) -> None:
    respuesta = subir(admin, equipo, b"\0" * (10 * 1024 * 1024 + 1))

    assert respuesta.status_code == 413
    assert respuesta.json() == {"detail": "La imagen supera los 10 MB"}


def test_una_imagen_con_demasiados_pixeles_se_rechaza(admin: TestClient, equipo: dict) -> None:
    # Pesa pocos KB en disco, pero abrirla ocuparía más de 100 MB de memoria.
    respuesta = subir(admin, equipo, imagen("PNG", (8000, 6000), modo="1"))

    assert respuesta.status_code == 422
    assert respuesta.json()["detail"][0]["msg"] == "La imagen tiene demasiados píxeles"


def test_reemplazar_la_foto_cambia_su_direccion(
    admin: TestClient, equipo: dict, bd: Session
) -> None:
    primera = subir(admin, equipo, imagen("PNG", (100, 100))).json()["image"]

    segunda = subir(admin, equipo, imagen("PNG", (200, 100))).json()["image"]

    assert primera != segunda
    assert abrir(admin.get(segunda).content).size == (200, 100)
    assert bd.scalar(select(func.count()).select_from(EquipoImagen)) == 1


def test_la_foto_se_guarda_en_cache_y_se_revalida_con_etag(admin: TestClient, equipo: dict) -> None:
    ruta = subir(admin, equipo, imagen("PNG", (100, 100))).json()["image"]
    sin_version = ruta.split("?")[0]

    con_version = admin.get(ruta)
    repetida = admin.get(sin_version, headers={"If-None-Match": con_version.headers["etag"]})

    assert con_version.headers["cache-control"] == "private, max-age=31536000, immutable"
    assert admin.get(sin_version).headers["cache-control"] == "private, no-cache"
    assert (repetida.status_code, repetida.content) == (304, b"")


def test_borrar_la_foto(admin: TestClient, equipo: dict) -> None:
    ruta = subir(admin, equipo, imagen("PNG", (100, 100))).json()["image"]

    assert admin.delete(f"/api/equipos/{equipo['id']}/imagen").status_code == 204
    assert admin.get(ruta).status_code == 404
    assert admin.get(f"/api/equipos/{equipo['id']}").json()["image"] == ""
    assert admin.delete(f"/api/equipos/{equipo['id']}/imagen").json() == {
        "detail": "El equipo no tiene una foto subida"
    }


def test_cambiar_la_imagen_por_otra_ruta_descarta_la_foto_subida(
    admin: TestClient, equipo: dict, bd: Session
) -> None:
    ruta = subir(admin, equipo, imagen("PNG", (100, 100))).json()["image"]

    # Reenviar la misma dirección no la borra.
    admin.patch(f"/api/equipos/{equipo['id']}", json={"image": ruta})
    assert admin.get(ruta).status_code == 200

    admin.patch(f"/api/equipos/{equipo['id']}", json={"image": "img/otra.jpg"})
    assert bd.scalar(select(func.count()).select_from(EquipoImagen)) == 0


def test_borrar_el_equipo_borra_su_foto(admin: TestClient, equipo: dict, bd: Session) -> None:
    subir(admin, equipo, imagen("PNG", (100, 100)))

    assert admin.delete(f"/api/equipos/{equipo['id']}").status_code == 204
    assert bd.scalar(select(func.count()).select_from(EquipoImagen)) == 0


def test_equipo_sin_foto_o_inexistente(admin: TestClient, equipo: dict) -> None:
    assert admin.get(f"/api/equipos/{equipo['id']}/imagen").status_code == 404
    assert subir(admin, {"id": "no-existe"}, imagen("PNG", (10, 10))).status_code == 404


def test_el_rol_consulta_ve_la_foto_pero_no_la_cambia(
    admin: TestClient, equipo: dict, cliente_consulta: TestClient
) -> None:
    ruta = subir(admin, equipo, imagen("PNG", (100, 100))).json()["image"]

    assert cliente_consulta.get(ruta).status_code == 200
    assert subir(cliente_consulta, equipo, imagen("PNG", (10, 10))).status_code == 403
    assert cliente_consulta.delete(f"/api/equipos/{equipo['id']}/imagen").status_code == 403


def test_sin_sesion_no_se_ve_la_foto(admin: TestClient, equipo: dict, cliente: TestClient) -> None:
    ruta = subir(admin, equipo, imagen("PNG", (100, 100))).json()["image"]

    assert cliente.get(ruta).status_code == 401


def test_el_limite_de_tamano_no_depende_de_lo_que_declare_el_cliente(
    admin: TestClient, equipo: dict
) -> None:
    # Enviada por trozos, la petición no trae Content-Length: el límite se aplica al leer.
    trozos = (b"\0" * (1024 * 1024) for _ in range(11))

    respuesta = admin.put(f"/api/equipos/{equipo['id']}/imagen", content=trozos)

    assert "content-length" not in respuesta.request.headers
    assert respuesta.status_code == 413
