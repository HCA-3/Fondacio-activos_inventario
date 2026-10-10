"""Fechas en hora de Colombia."""

from datetime import date, datetime, timedelta, timezone

# Colombia no usa horario de verano: siempre UTC-5.
ZONA_COLOMBIA = timezone(timedelta(hours=-5), "COT")


def hoy() -> date:
    # El servidor corre en UTC; sin esto, a partir de las 7 p. m. "hoy" ya sería mañana.
    return datetime.now(ZONA_COLOMBIA).date()
