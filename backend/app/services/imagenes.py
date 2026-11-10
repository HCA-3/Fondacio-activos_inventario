"""Fotos de los equipos: se reducen y se guardan en la base como WebP."""

import hashlib
from io import BytesIO

from fastapi import HTTPException, Request, Response, status
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.errores import DatoInvalido, NoEncontrado
from app.models import Equipo, EquipoImagen, Usuario
from app.services.auditoria import registrar
from app.services.comun import marcar_autor
from app.services.equipos import ruta_de_imagen

MAX_BYTES = 10 * 1024 * 1024
MAX_LADO = 1280
# Una imagen pequeña en disco puede ocupar cientos de MB al abrirse; el servidor tiene 512 MB.
MAX_PIXELES = 40_000_000
FORMATOS = ["JPEG", "PNG", "WEBP"]


def huella(contenido: bytes) -> str:
    return hashlib.sha256(contenido).hexdigest()[:16]


def convertir_a_webp(contenido: bytes) -> bytes:
    try:
        with Image.open(BytesIO(contenido), formats=FORMATOS) as original:
            if original.width * original.height > MAX_PIXELES:
                raise DatoInvalido("imagen", "La imagen tiene demasiados píxeles")
            # En JPEG decodifica directamente a menor tamaño: más rápido y con menos memoria.
            original.draft("RGB", (MAX_LADO, MAX_LADO))
            # Las fotos de celular traen la orientación aparte; sin esto saldrían giradas.
            imagen = ImageOps.exif_transpose(original)
            imagen.thumbnail((MAX_LADO, MAX_LADO))
            if imagen.mode not in ("RGB", "RGBA"):
                imagen = imagen.convert("RGBA" if imagen.has_transparency_data else "RGB")
            salida = BytesIO()
            imagen.save(salida, "WEBP", quality=80)
            return salida.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise DatoInvalido("imagen", "El archivo debe ser una imagen JPEG, PNG o WebP") from error


def guardar_webp(bd: Session, modelo: type, columna_id: str, id_: str, contenido: bytes) -> bytes:
    """Convierte y guarda la imagen en la tabla de imágenes del modelo, reemplazando la anterior."""
    webp = convertir_a_webp(contenido)
    fila = bd.get(modelo, id_)
    if fila is None:
        fila = modelo(**{columna_id: id_})
        bd.add(fila)
    fila.contenido = webp
    fila.tipo = "image/webp"
    return webp


def guardar_imagen(bd: Session, equipo: Equipo, contenido: bytes, autor: Usuario) -> Equipo:
    webp = guardar_webp(bd, EquipoImagen, "equipo_id", equipo.id, contenido)
    # La huella en la dirección hace que el navegador pida la foto nueva al reemplazarla.
    equipo.imagen = f"{ruta_de_imagen(equipo)}?v={huella(webp)}"
    marcar_autor(equipo, autor)
    registrar(bd, autor, "subir_imagen", "equipos", equipo.id, {"bytes": len(webp)})
    return equipo


def borrar_imagen(bd: Session, equipo: Equipo, autor: Usuario) -> None:
    fila = bd.get(EquipoImagen, equipo.id)
    if fila is None:
        raise NoEncontrado("El equipo no tiene una foto subida")
    bd.delete(fila)
    equipo.imagen = ""
    marcar_autor(equipo, autor)
    registrar(bd, autor, "borrar_imagen", "equipos", equipo.id)


async def leer_cuerpo(request: Request, maximo: int = MAX_BYTES) -> bytes:
    """Lee el cuerpo sin pasarse del máximo, para no cargar en memoria un archivo enorme."""
    demasiado = HTTPException(
        status.HTTP_413_CONTENT_TOO_LARGE, f"La imagen supera los {maximo // (1024 * 1024)} MB"
    )
    declarado = request.headers.get("content-length", "")
    if declarado.isdigit() and int(declarado) > maximo:
        raise demasiado
    partes: list[bytes] = []
    total = 0
    async for parte in request.stream():
        total += len(parte)
        if total > maximo:
            raise demasiado
        partes.append(parte)
    return b"".join(partes)


def responder_imagen(imagen, request: Request) -> Response:
    """Respuesta de una imagen guardada (con `contenido` y `tipo`), con ETag y caché."""
    etag = f'"{huella(imagen.contenido)}"'
    cabeceras = {
        "ETag": etag,
        # Con ?v= la dirección cambia al cambiar la imagen, así que se puede guardar para siempre.
        "Cache-Control": "private, max-age=31536000, immutable"
        if "v" in request.query_params
        else "private, no-cache",
        "X-Content-Type-Options": "nosniff",
    }
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=cabeceras)
    return Response(imagen.contenido, media_type=imagen.tipo, headers=cabeceras)
