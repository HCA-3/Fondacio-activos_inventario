"""Fotos de los equipos: se reducen y se guardan en la base como WebP."""

import hashlib
from io import BytesIO

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


def guardar_imagen(bd: Session, equipo: Equipo, contenido: bytes, autor: Usuario) -> Equipo:
    webp = convertir_a_webp(contenido)
    fila = bd.get(EquipoImagen, equipo.id)
    if fila is None:
        fila = EquipoImagen(equipo_id=equipo.id)
        bd.add(fila)
    fila.contenido = webp
    fila.tipo = "image/webp"
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
