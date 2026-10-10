"""Configuración de la aplicación, leída de variables de entorno."""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_REPO = Path(__file__).resolve().parents[2]


class Ajustes(BaseSettings):
    # El .env de la raíz solo se usa al correr fuera de Docker; en producción no existe.
    model_config = SettingsConfigDict(env_file=RAIZ_REPO / ".env", extra="ignore")

    database_url: str
    frontend_dir: Path = RAIZ_REPO / "frontend"

    @field_validator("database_url")
    @classmethod
    def usar_driver_psycopg(cls, url: str) -> str:
        # Neon entrega "postgresql://"; SQLAlchemy necesita el driver explícito.
        for prefijo in ("postgres://", "postgresql://"):
            if url.startswith(prefijo):
                return "postgresql+psycopg://" + url.removeprefix(prefijo)
        return url


@lru_cache
def obtener_ajustes() -> Ajustes:
    return Ajustes()
