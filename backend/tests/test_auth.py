from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models import Auditoria, Sesion
from app.security import LimiteIntentos, limite_login
from tests.conftest import CONTRASENA


def entrar_con(cliente: TestClient, usuario: str, contrasena: str = CONTRASENA):
    return cliente.post("/api/auth/login", json={"username": usuario, "password": contrasena})


def test_login_correcto_devuelve_el_usuario_y_abre_sesion(
    cliente: TestClient, crear_usuario: Callable
) -> None:
    ana = crear_usuario("ana", rol="admin")

    respuesta = entrar_con(cliente, "ana")

    assert respuesta.status_code == 200
    assert respuesta.json() == {
        "id": ana.id,
        "username": "ana",
        "name": "Ana",
        "role": "admin",
        "active": True,
        "createdAt": respuesta.json()["createdAt"],
    }
    assert cliente.get("/api/auth/me").json()["username"] == "ana"


def test_la_cookie_de_sesion_no_es_legible_desde_javascript(
    cliente: TestClient, crear_usuario: Callable
) -> None:
    crear_usuario("ana")

    cabecera = entrar_con(cliente, "ana").headers["set-cookie"].lower()

    assert cabecera.startswith("sesion=")
    assert "httponly" in cabecera
    assert "secure" in cabecera
    assert "samesite=lax" in cabecera
    assert "max-age=28800" in cabecera


def test_la_base_guarda_el_hash_del_token_no_el_token(
    cliente: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    crear_usuario("ana")
    entrar_con(cliente, "ana")

    guardado = bd.scalar(select(Sesion.token_hash))

    assert guardado != cliente.cookies["sesion"]
    assert len(guardado) == 64


def test_el_usuario_no_distingue_mayusculas_ni_espacios(
    cliente: TestClient, crear_usuario: Callable
) -> None:
    crear_usuario("ana")

    assert entrar_con(cliente, "  ANA ").status_code == 200


def test_contrasena_incorrecta_y_usuario_inexistente_responden_igual(
    cliente: TestClient, crear_usuario: Callable
) -> None:
    crear_usuario("ana")

    mala = entrar_con(cliente, "ana", "otra-contrasena")
    inexistente = entrar_con(cliente, "nadie")

    assert mala.status_code == inexistente.status_code == 401
    assert mala.json() == inexistente.json() == {"detail": "Usuario o contraseña incorrectos"}
    assert "set-cookie" not in mala.headers


def test_un_usuario_inactivo_no_puede_entrar(cliente: TestClient, crear_usuario: Callable) -> None:
    crear_usuario("ana", activo=False)

    assert entrar_con(cliente, "ana").status_code == 401


def test_me_sin_sesion_devuelve_401(cliente: TestClient) -> None:
    respuesta = cliente.get("/api/auth/me")

    assert respuesta.status_code == 401
    assert respuesta.json() == {"detail": "No has iniciado sesión"}


def test_una_cookie_inventada_no_sirve(cliente: TestClient) -> None:
    cliente.cookies.set("sesion", "token-inventado")

    assert cliente.get("/api/auth/me").status_code == 401


def test_logout_cierra_la_sesion_en_el_servidor(
    cliente: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    crear_usuario("ana")
    entrar_con(cliente, "ana")
    token = cliente.cookies["sesion"]

    respuesta = cliente.post("/api/auth/logout")

    assert respuesta.status_code == 204
    assert bd.scalar(select(func.count()).select_from(Sesion)) == 0
    # Ni siquiera reenviando el token viejo se recupera la sesión.
    cliente.cookies.set("sesion", token)
    assert cliente.get("/api/auth/me").status_code == 401


def test_logout_sin_sesion_no_falla(cliente: TestClient) -> None:
    assert cliente.post("/api/auth/logout").status_code == 204


def test_una_sesion_vencida_no_sirve(
    cliente: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    crear_usuario("ana")
    entrar_con(cliente, "ana")
    bd.execute(update(Sesion).values(expira_en=datetime.now(UTC) - timedelta(seconds=1)))
    bd.commit()

    assert cliente.get("/api/auth/me").status_code == 401


def test_la_sesion_vence_a_las_ocho_horas(
    cliente: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    crear_usuario("ana")
    antes = datetime.now(UTC)
    entrar_con(cliente, "ana")

    vence = bd.scalar(select(Sesion.expira_en))

    assert timedelta(hours=7, minutes=59) < vence - antes < timedelta(hours=8, minutes=1)


def test_desactivar_al_usuario_invalida_su_sesion_abierta(
    cliente: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    ana = crear_usuario("ana")
    entrar_con(cliente, "ana")
    ana.activo = False
    bd.commit()

    assert cliente.get("/api/auth/me").status_code == 401


def test_tras_cinco_fallos_se_bloquea_incluso_la_contrasena_correcta(
    cliente: TestClient, crear_usuario: Callable
) -> None:
    crear_usuario("ana")
    crear_usuario("luis")
    for _ in range(5):
        assert entrar_con(cliente, "ana", "mala").status_code == 401

    bloqueado = entrar_con(cliente, "ana")

    assert bloqueado.status_code == 429
    assert 0 < int(bloqueado.headers["retry-after"]) <= 15 * 60 + 1
    assert entrar_con(cliente, "luis").status_code == 200


def test_un_login_correcto_borra_los_fallos_anteriores(
    cliente: TestClient, crear_usuario: Callable
) -> None:
    crear_usuario("ana")
    for _ in range(4):
        entrar_con(cliente, "ana", "mala")
    assert entrar_con(cliente, "ana").status_code == 200

    assert limite_login.segundos_de_espera("ana") == 0
    assert entrar_con(cliente, "ana", "mala").status_code == 401


def test_el_bloqueo_se_levanta_al_pasar_la_ventana() -> None:
    ahora = [1000.0]
    limite = LimiteIntentos(maximo=2, ventana_segundos=60, reloj=lambda: ahora[0])
    limite.registrar_fallo("ana")
    ahora[0] += 10
    limite.registrar_fallo("ana")

    assert limite.segundos_de_espera("ana") == 51
    ahora[0] += 50
    assert limite.segundos_de_espera("ana") == 0


def test_el_login_queda_en_la_auditoria(
    cliente: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    ana = crear_usuario("ana")
    entrar_con(cliente, "ana")

    fila = bd.scalars(select(Auditoria)).one()

    assert (fila.usuario_id, fila.accion, fila.entidad, fila.entidad_id) == (
        ana.id,
        "iniciar_sesion",
        "usuarios",
        ana.id,
    )


def test_una_accion_sin_cambios_guarda_nulo_en_la_auditoria(
    cliente: TestClient, crear_usuario: Callable, bd: Session
) -> None:
    crear_usuario("ana")
    entrar_con(cliente, "ana")

    assert bd.scalar(select(func.count()).select_from(Auditoria).where(Auditoria.cambios.is_(None)))
