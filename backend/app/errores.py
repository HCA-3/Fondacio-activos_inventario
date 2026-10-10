"""Errores de las reglas de negocio. main.py los convierte en respuestas JSON."""


class ErrorDeNegocio(Exception):
    codigo = 409

    def __init__(self, detalle: str) -> None:
        super().__init__(detalle)
        self.detalle = detalle


class Conflicto(ErrorDeNegocio):
    """La acción choca con el estado actual de los datos."""


class NoEncontrado(ErrorDeNegocio):
    codigo = 404


class DatoInvalido(ErrorDeNegocio):
    """Un campo del cuerpo no sirve. Responde con la misma forma que la validación automática."""

    codigo = 422

    def __init__(self, campo: str, mensaje: str) -> None:
        super().__init__(mensaje)
        self.campo = campo
