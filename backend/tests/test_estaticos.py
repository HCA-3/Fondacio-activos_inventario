from fastapi.testclient import TestClient


def test_la_raiz_entrega_el_frontend(cliente_sin_bd: TestClient) -> None:
    respuesta = cliente_sin_bd.get("/")

    assert respuesta.status_code == 200
    assert respuesta.headers["content-type"].startswith("text/html")
    assert "Fondacio" in respuesta.text


def test_entrega_los_archivos_del_frontend(cliente_sin_bd: TestClient) -> None:
    respuesta = cliente_sin_bd.get("/js/data.js")

    assert respuesta.status_code == 200
    assert "javascript" in respuesta.headers["content-type"]


def test_archivo_inexistente_devuelve_404(cliente_sin_bd: TestClient) -> None:
    assert cliente_sin_bd.get("/no-existe.js").status_code == 404
