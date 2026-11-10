from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Auditoria
from app.tiempo import hoy
from tests.ayudas import (
    nueva_categoria,
    nueva_donacion,
    nueva_sede,
    nuevo_donante,
    nuevo_equipo,
)


def _preparar(cliente: TestClient) -> dict:
    nueva_sede(cliente)
    return nuevo_donante(cliente, "Colegio San José", type="empresa")


def test_crear_y_ver_una_donacion_con_su_total_estimado(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    mesas = nueva_categoria(cliente_admin, "Mesas escolares")

    creada = nueva_donacion(
        cliente_admin,
        donante,
        notes="Entrega en portería",
        items=[
            {
                "name": "Silla plástica",
                "quantity": 10,
                "estimatedUnitValue": 20000,
                "condition": "usado",
            },
            {"name": "Mesa", "quantity": 2, "categoryId": mesas["id"], "description": "Madera"},
        ],
    )

    vista = cliente_admin.get(f"/api/donaciones/{creada['id']}").json()
    assert vista == creada
    assert (vista["donorName"], vista["sede"], vista["status"]) == (
        "Colegio San José",
        "Altos del Cabo",
        "recibida",
    )
    assert vista["donationDate"] == hoy().isoformat()
    assert vista["notes"] == "Entrega en portería"
    silla, mesa = vista["items"]
    assert (silla["name"], silla["quantity"], silla["condition"]) == ("Silla plástica", 10, "usado")
    assert (silla["estimatedUnitValue"], silla["categoryId"], silla["categoryName"]) == (
        20000,
        None,
        "",
    )
    assert (mesa["condition"], mesa["estimatedUnitValue"]) == ("nuevo", None)
    assert (mesa["categoryId"], mesa["categoryName"]) == (mesas["id"], "Mesas escolares")
    assert vista["totalEstimated"] == 200000


def test_la_fecha_no_puede_ser_futura_y_por_defecto_es_hoy(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    cuerpo = {"donorId": donante["id"], "sede": "Altos del Cabo"}
    item = {"name": "Libro", "quantity": 1}

    futura = hoy() + timedelta(days=1)
    rechazada = cliente_admin.post(
        "/api/donaciones", json=cuerpo | {"items": [item], "donationDate": futura.isoformat()}
    )
    pasada = cliente_admin.post(
        "/api/donaciones", json=cuerpo | {"items": [item], "donationDate": "2026-01-15"}
    )

    assert rechazada.status_code == 422
    assert pasada.json()["donationDate"] == "2026-01-15"


def test_exige_donante_sede_y_al_menos_un_item(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    item = {"name": "Libro"}

    sin_items = cliente_admin.post(
        "/api/donaciones", json={"donorId": donante["id"], "sede": "Altos del Cabo", "items": []}
    )
    sin_donante = cliente_admin.post(
        "/api/donaciones", json={"sede": "Altos del Cabo", "items": [item]}
    )
    donante_falso = cliente_admin.post(
        "/api/donaciones", json={"donorId": "no-existe", "sede": "Altos del Cabo", "items": [item]}
    )
    sede_falsa = cliente_admin.post(
        "/api/donaciones", json={"donorId": donante["id"], "sede": "Marte", "items": [item]}
    )

    assert [r.status_code for r in (sin_items, sin_donante, donante_falso, sede_falsa)] == [422] * 4


def test_valida_cantidad_estado_y_valor_de_cada_item(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)

    def intentar(**item) -> int:
        cuerpo = {
            "donorId": donante["id"],
            "sede": "Altos del Cabo",
            "items": [{"name": "Libro"} | item],
        }
        return cliente_admin.post("/api/donaciones", json=cuerpo).status_code

    assert intentar(quantity=0) == 422
    assert intentar(quantity=1.5) == 422
    assert intentar(condition="roto") == 422
    assert intentar(estimatedUnitValue=-1) == 422
    assert intentar(name="") == 422
    assert intentar(quantity=3, condition="danado", estimatedUnitValue=0) == 201


def test_crea_una_categoria_nueva_desde_el_item_y_la_reutiliza(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)

    primera = nueva_donacion(
        cliente_admin, donante, items=[{"name": "Telescopio", "newCategory": "Astronomía"}]
    )
    segunda = nueva_donacion(
        cliente_admin, donante, items=[{"name": "Mapa", "newCategory": "ASTRONOMÍA"}]
    )

    categoria = primera["items"][0]
    assert categoria["categoryName"] == "Astronomía"
    assert segunda["items"][0]["categoryId"] == categoria["categoryId"]
    nombres = [c["name"] for c in cliente_admin.get("/api/categorias").json()["items"]]
    assert nombres.count("Astronomía") == 1


def test_no_se_envian_categoria_existente_y_nueva_a_la_vez(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    mesas = nueva_categoria(cliente_admin, "Mesas escolares")

    respuesta = cliente_admin.post(
        "/api/donaciones",
        json={
            "donorId": donante["id"],
            "sede": "Altos del Cabo",
            "items": [{"name": "Mesa", "categoryId": mesas["id"], "newCategory": "Otra"}],
        },
    )
    inexistente = cliente_admin.post(
        "/api/donaciones",
        json={
            "donorId": donante["id"],
            "sede": "Altos del Cabo",
            "items": [{"name": "Mesa", "categoryId": "no-existe"}],
        },
    )

    assert (respuesta.status_code, inexistente.status_code) == (422, 422)


def test_borrar_una_categoria_deja_sus_items_sin_categoria(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    mesas = nueva_categoria(cliente_admin, "Mesas escolares")
    donacion = nueva_donacion(
        cliente_admin, donante, items=[{"name": "Mesa", "categoryId": mesas["id"]}]
    )

    borrada = cliente_admin.delete(f"/api/categorias/{mesas['id']}")

    assert borrada.status_code == 204
    item = cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()["items"][0]
    assert (item["name"], item["categoryId"], item["categoryName"]) == ("Mesa", None, "")


def test_consulta_solo_lee_y_sin_sesion_no_hay_acceso(
    cliente_admin: TestClient, cliente_consulta: TestClient, cliente: TestClient
) -> None:
    donante = _preparar(cliente_admin)
    donacion = nueva_donacion(cliente_admin, donante)
    cuerpo = {"donorId": donante["id"], "sede": "Altos del Cabo", "items": [{"name": "Libro"}]}

    assert cliente_consulta.get("/api/donaciones").status_code == 200
    assert cliente_consulta.get(f"/api/donaciones/{donacion['id']}").status_code == 200
    assert cliente_consulta.post("/api/donaciones", json=cuerpo).status_code == 403
    assert cliente_consulta.patch(f"/api/donaciones/{donacion['id']}", json={}).status_code == 403
    assert cliente_consulta.post(f"/api/donaciones/{donacion['id']}/anular").status_code == 403
    assert cliente.get("/api/donaciones").status_code == 401


def test_el_listado_va_paginado_y_con_las_mas_recientes_primero(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    for fecha in ("2026-03-01", "2026-05-01", "2026-04-01"):
        nueva_donacion(cliente_admin, donante, donationDate=fecha)

    pagina = cliente_admin.get("/api/donaciones", params={"limit": 2}).json()

    assert [d["donationDate"] for d in pagina["items"]] == ["2026-05-01", "2026-04-01"]
    assert (pagina["total"], pagina["limit"], pagina["offset"]) == (3, 2, 0)
    assert cliente_admin.get("/api/donaciones/no-existe").status_code == 404


def test_editar_una_donacion_recibida(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    otra_sede = nueva_sede(cliente_admin, "YLDC Potosí", code="POT")
    otro = nuevo_donante(cliente_admin, "Ana Pérez")
    donacion = nueva_donacion(cliente_admin, donante)

    editada = cliente_admin.patch(
        f"/api/donaciones/{donacion['id']}",
        json={
            "donorId": otro["id"],
            "sede": otra_sede["name"],
            "donationDate": "2026-02-02",
            "notes": "Corregida",
            "items": [{"name": "Balón", "quantity": 4, "estimatedUnitValue": 50000}],
        },
    )

    assert editada.status_code == 200, editada.text
    cuerpo = editada.json()
    assert (cuerpo["donorName"], cuerpo["sede"], cuerpo["donationDate"]) == (
        "Ana Pérez",
        "YLDC Potosí",
        "2026-02-02",
    )
    assert cuerpo["notes"] == "Corregida"
    assert [i["name"] for i in cuerpo["items"]] == ["Balón"]
    assert cuerpo["totalEstimated"] == 200000


def test_un_cambio_parcial_no_toca_lo_demas(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    donacion = nueva_donacion(cliente_admin, donante, notes="Original")

    cuerpo = cliente_admin.patch(
        f"/api/donaciones/{donacion['id']}", json={"donationDate": "2026-02-02"}
    ).json()

    assert cuerpo["notes"] == "Original"
    assert cuerpo["items"] == donacion["items"]
    rechazos = [
        cliente_admin.patch(f"/api/donaciones/{donacion['id']}", json=cambio).status_code
        for cambio in (
            {"items": []},
            {"donationDate": (hoy() + timedelta(days=1)).isoformat()},
            {"donorId": "no-existe"},
            {"sede": "Marte"},
        )
    ]
    assert rechazos == [422] * 4


def test_anular_deja_la_donacion_en_solo_lectura(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    donacion = nueva_donacion(cliente_admin, donante)

    anulada = cliente_admin.post(f"/api/donaciones/{donacion['id']}/anular")

    assert anulada.status_code == 200
    assert anulada.json()["status"] == "anulada"
    assert (
        cliente_admin.patch(
            f"/api/donaciones/{donacion['id']}", json={"notes": "Tarde"}
        ).status_code
        == 409
    )
    assert cliente_admin.post(f"/api/donaciones/{donacion['id']}/anular").status_code == 409
    vista = cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()
    assert (vista["status"], vista["notes"]) == ("anulada", "")
    assert len(vista["items"]) == 1
    assert cliente_admin.get("/api/donaciones").json()["total"] == 1


def test_altas_cambios_y_anulacion_quedan_en_auditoria(
    cliente_admin: TestClient, bd: Session
) -> None:
    donante = _preparar(cliente_admin)
    donacion = nueva_donacion(cliente_admin, donante)
    cliente_admin.patch(f"/api/donaciones/{donacion['id']}", json={"notes": "Nota"})
    cliente_admin.patch(f"/api/donaciones/{donacion['id']}", json={"notes": "Nota"})
    cliente_admin.post(f"/api/donaciones/{donacion['id']}/anular")

    filas = bd.scalars(
        select(Auditoria).where(
            Auditoria.entidad == "donaciones", Auditoria.entidad_id == donacion["id"]
        )
    ).all()

    assert sorted(f.accion for f in filas) == ["actualizar", "anular", "crear"]


def test_editar_solo_los_items_actualiza_la_fecha_de_cambio(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    donacion = nueva_donacion(cliente_admin, donante)
    cliente_admin.patch(f"/api/donaciones/{donacion['id']}", json={"notes": "Primera"})
    antes = cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()["updatedAt"]

    cliente_admin.patch(f"/api/donaciones/{donacion['id']}", json={"items": [{"name": "Balón"}]})

    despues = cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()["updatedAt"]
    assert despues > antes


def test_un_donante_inactivo_no_recibe_donaciones_nuevas(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    vigente = nuevo_donante(cliente_admin, "Ana Pérez")
    donacion = nueva_donacion(cliente_admin, donante)
    cliente_admin.patch(f"/api/donantes/{donante['id']}", json={"active": False})
    cuerpo = {"donorId": donante["id"], "sede": "Altos del Cabo", "items": [{"name": "Libro"}]}

    al_crear = cliente_admin.post("/api/donaciones", json=cuerpo)
    al_reasignar = cliente_admin.patch(
        f"/api/donaciones/{nueva_donacion(cliente_admin, vigente)['id']}",
        json={"donorId": donante["id"]},
    )
    # Lo ya registrado se conserva y se sigue pudiendo ver y editar.
    vista = cliente_admin.get(f"/api/donaciones/{donacion['id']}")
    editada = cliente_admin.patch(f"/api/donaciones/{donacion['id']}", json={"notes": "Ajuste"})

    assert (al_crear.status_code, al_reasignar.status_code) == (409, 409)
    assert (vista.status_code, editada.status_code) == (200, 200)


def _donacion_de_un_portatil(cliente: TestClient) -> tuple[dict, dict]:
    donante = _preparar(cliente)
    donacion = nueva_donacion(
        cliente, donante, items=[{"name": "Portátil", "quantity": 1}, {"name": "Silla"}]
    )
    return donacion, donacion["items"][0]


def _ruta_equipo(donacion: dict, item: dict) -> str:
    return f"/api/donaciones/{donacion['id']}/items/{item['id']}/equipo"


def test_convertir_un_item_en_equipo_usa_la_sede_de_la_donacion(
    cliente_admin: TestClient,
) -> None:
    donacion, item = _donacion_de_un_portatil(cliente_admin)

    respuesta = cliente_admin.post(
        _ruta_equipo(donacion, item), json={"code": "pc-77", "brand": "Dell", "model": "7480"}
    )

    assert respuesta.status_code == 201, respuesta.text
    equipo = respuesta.json()
    assert (equipo["code"], equipo["sede"], equipo["brand"]) == ("PC-77", "Altos del Cabo", "Dell")
    assert cliente_admin.get(f"/api/equipos/{equipo['id']}").status_code == 200
    vista = cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()
    assert vista["items"][0]["assetId"] == equipo["id"]
    assert vista["items"][1]["assetId"] is None


def test_la_conversion_acepta_otra_sede_y_exige_placa_unica(cliente_admin: TestClient) -> None:
    donacion, item = _donacion_de_un_portatil(cliente_admin)
    nueva_sede(cliente_admin, "YLDC Potosí", code="POT")
    nuevo_equipo(cliente_admin, "PC-01")

    repetida = cliente_admin.post(_ruta_equipo(donacion, item), json={"code": "PC-01"})
    sin_placa = cliente_admin.post(_ruta_equipo(donacion, item), json={})
    otra = cliente_admin.post(
        _ruta_equipo(donacion, item), json={"code": "PC-02", "sede": "YLDC Potosí"}
    )

    assert (repetida.status_code, sin_placa.status_code) == (409, 422)
    assert otra.json()["sede"] == "YLDC Potosí"
    vista = cliente_admin.get(f"/api/donaciones/{donacion['id']}").json()
    assert vista["items"][0]["assetId"] == otra.json()["id"]


def test_un_item_convertido_no_se_convierte_otra_vez(cliente_admin: TestClient) -> None:
    donacion, item = _donacion_de_un_portatil(cliente_admin)
    cliente_admin.post(_ruta_equipo(donacion, item), json={"code": "PC-77"})

    otra_vez = cliente_admin.post(_ruta_equipo(donacion, item), json={"code": "PC-78"})

    assert otra_vez.status_code == 409
    assert cliente_admin.get("/api/equipos").json()["total"] == 1


def test_no_se_convierte_un_item_de_mas_de_una_unidad(cliente_admin: TestClient) -> None:
    donante = _preparar(cliente_admin)
    donacion = nueva_donacion(cliente_admin, donante)

    respuesta = cliente_admin.post(_ruta_equipo(donacion, donacion["items"][0]), json={"code": "S"})

    assert respuesta.status_code == 409
    assert cliente_admin.get("/api/equipos").json()["total"] == 0


def test_no_se_convierte_en_una_donacion_anulada(cliente_admin: TestClient) -> None:
    donacion, item = _donacion_de_un_portatil(cliente_admin)
    cliente_admin.post(f"/api/donaciones/{donacion['id']}/anular")

    respuesta = cliente_admin.post(_ruta_equipo(donacion, item), json={"code": "PC-77"})

    assert respuesta.status_code == 409
    assert cliente_admin.get("/api/equipos").json()["total"] == 0


def test_la_conversion_busca_donacion_e_item_y_es_solo_de_admin(
    cliente_admin: TestClient, cliente_consulta: TestClient
) -> None:
    donacion, item = _donacion_de_un_portatil(cliente_admin)

    sin_donacion = cliente_admin.post(
        f"/api/donaciones/nada/items/{item['id']}/equipo", json={"code": "A"}
    )
    sin_item = cliente_admin.post(
        f"/api/donaciones/{donacion['id']}/items/nada/equipo", json={"code": "A"}
    )
    consulta = cliente_consulta.post(_ruta_equipo(donacion, item), json={"code": "A"})

    assert (sin_donacion.status_code, sin_item.status_code, consulta.status_code) == (404, 404, 403)


def test_la_conversion_queda_en_auditoria(cliente_admin: TestClient, bd: Session) -> None:
    donacion, item = _donacion_de_un_portatil(cliente_admin)
    equipo = cliente_admin.post(_ruta_equipo(donacion, item), json={"code": "PC-77"}).json()

    filas = bd.scalars(
        select(Auditoria).where(
            Auditoria.entidad == "donaciones",
            Auditoria.entidad_id == donacion["id"],
            Auditoria.accion == "convertir",
        )
    ).all()

    assert len(filas) == 1
    assert filas[0].cambios["equipo"] == equipo["id"]


def test_un_item_convertido_se_conserva_y_no_se_modifica_al_editar(
    cliente_admin: TestClient,
) -> None:
    donacion, item = _donacion_de_un_portatil(cliente_admin)
    equipo = cliente_admin.post(_ruta_equipo(donacion, item), json={"code": "PC-77"}).json()
    ruta = f"/api/donaciones/{donacion['id']}"
    mismo = {"id": item["id"], "name": "Portátil", "quantity": 1}

    editada = cliente_admin.patch(
        ruta, json={"items": [mismo, {"name": "Silla nueva"}, {"name": "Mesa"}]}
    )
    cambiada = cliente_admin.patch(ruta, json={"items": [mismo | {"name": "Otro nombre"}]})
    quitada = cliente_admin.patch(ruta, json={"items": [{"name": "Solo silla"}]})
    ajena = cliente_admin.patch(ruta, json={"items": [mismo, {"id": "ajeno", "name": "X"}]})

    assert editada.status_code == 200, editada.text
    nombres = [(i["name"], i["assetId"]) for i in editada.json()["items"]]
    assert nombres == [("Portátil", equipo["id"]), ("Silla nueva", None), ("Mesa", None)]
    assert editada.json()["items"][0]["id"] == item["id"]
    assert (cambiada.status_code, quitada.status_code, ajena.status_code) == (409, 409, 422)


def test_editar_un_item_con_id_lo_actualiza_en_su_sitio(cliente_admin: TestClient) -> None:
    donacion, item = _donacion_de_un_portatil(cliente_admin)

    editada = cliente_admin.patch(
        f"/api/donaciones/{donacion['id']}",
        json={"items": [{"id": item["id"], "name": "Portátil HP", "quantity": 2}]},
    ).json()

    assert [(i["id"], i["name"], i["quantity"]) for i in editada["items"]] == [
        (item["id"], "Portátil HP", 2)
    ]
