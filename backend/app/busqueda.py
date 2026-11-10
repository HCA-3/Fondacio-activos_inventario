"""Búsqueda de texto en las listas."""


def patron_de_busqueda(texto: str) -> str:
    """Patrón para `ilike(patron, escape="\\\\")` que busca el texto tal cual, sin comodines."""
    seguro = texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{seguro}%"
