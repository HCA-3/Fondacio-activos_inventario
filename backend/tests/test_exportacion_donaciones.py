from datetime import datetime
from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import load_workbook

from app.tiempo import hoy
from tests.ayudas import nueva_categoria, nueva_donacion, nueva_sede, nuevo_donante

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def descargar(cliente: TestClient, **filtros) -> dict[str, list[dict]]:
    """Baja el Excel y lo devuelve como {hoja: [fila como diccionario]}."""
    respuesta = cliente.get("/api/donaciones/export.xlsx", params=filtros)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.headers["content-type"] == XLSX
    libro = load_workbook(BytesIO(respuesta.content))
    hojas = {}
    for hoja in libro.worksheets:
        encabezados, *filas = hoja.iter_rows(values_only=True)
        hojas[hoja.title] = [dict(zip(encabezados, fila, strict=True)) for fila in filas]
    return hojas


def _con_datos(cliente: TestClient) -> dict:
    nueva_sede(cliente)
    nueva_sede(cliente, "Sede Norte", code="NORTE")
    colegio = nuevo_donante(cliente, "Colegio San José", type="empresa")
    ana = nuevo_donante(cliente, "Ana Ruiz")
    sillas = nueva_categoria(cliente, "Sillas de oficina")
    primera = nueva_donacion(
        cliente,
        colegio,
        donationDate="2026-02-10",
        notes="Entrega en portería",
        items=[
            {
                "name": "Silla alta",
                "categoryId": sillas["id"],
                "quantity": 10,
                "estimatedUnitValue": 20000,
                "condition": "usado",
                "description": "Con ruedas",
            },
            {"name": "Mesa", "quantity": 2},
        ],
    )
    segunda = nueva_donacion(
        cliente,
        ana,
        sede="Sede Norte",
        donationDate="2026-03-05",
        items=[{"name": "Balón", "quantity": 4, "estimatedUnitValue": 50000}],
    )
    cliente.post(f"/api/donaciones/{segunda['id']}/anular")
    return {"primera": primera, "segunda": segunda, "colegio": colegio, "ana": ana}


def test_el_excel_trae_una_hoja_de_donaciones_y_otra_de_items(cliente_admin: TestClient) -> None:
    _con_datos(cliente_admin)

    hojas = descargar(cliente_admin)

    assert list(hojas) == ["Donaciones", "Ítems"]
    # Las más recientes primero, como en el listado.
    anulada, recibida = hojas["Donaciones"]
    assert recibida == {
        "Fecha": datetime(2026, 2, 10),
        "Donante": "Colegio San José",
        "Sede": "Altos del Cabo",
        "Estado": "Recibida",
        "Ítems": 2,
        "Unidades": 12,
        "Valor total estimado (COP)": 200000,
        "Notas": "Entrega en portería",
    }
    assert (anulada["Estado"], anulada["Sede"], anulada["Unidades"]) == ("Anulada", "Sede Norte", 4)
    assert anulada["Valor total estimado (COP)"] == 200000
    balon, silla, mesa = hojas["Ítems"]
    assert silla == {
        "Fecha": datetime(2026, 2, 10),
        "Donante": "Colegio San José",
        "Sede": "Altos del Cabo",
        "Estado de la donación": "Recibida",
        "Ítem": "Silla alta",
        "Categoría": "Sillas de oficina",
        "Cantidad": 10,
        "Estado del ítem": "Usado",
        "Valor unitario (COP)": 20000,
        "Valor total (COP)": 200000,
        "Descripción": "Con ruedas",
    }
    assert (mesa["Ítem"], mesa["Categoría"], mesa["Estado del ítem"]) == ("Mesa", None, "Nuevo")
    assert (mesa["Valor unitario (COP)"], mesa["Valor total (COP)"]) == (None, None)
    assert balon["Ítem"] == "Balón"


def test_el_excel_respeta_los_filtros_del_listado(cliente_admin: TestClient) -> None:
    datos = _con_datos(cliente_admin)

    solo_anuladas = descargar(cliente_admin, estado="anulada")
    de_ana = descargar(cliente_admin, donante=datos["ana"]["id"])
    por_texto = descargar(cliente_admin, q="silla")
    en_marzo = descargar(cliente_admin, desde="2026-03-01")
    vacio = descargar(cliente_admin, donante="no-existe")

    assert [f["Donante"] for f in solo_anuladas["Donaciones"]] == ["Ana Ruiz"]
    assert [f["Ítem"] for f in solo_anuladas["Ítems"]] == ["Balón"]
    assert [f["Donante"] for f in de_ana["Donaciones"]] == ["Ana Ruiz"]
    assert [f["Donante"] for f in por_texto["Donaciones"]] == ["Colegio San José"]
    assert [f["Donante"] for f in en_marzo["Donaciones"]] == ["Ana Ruiz"]
    assert vacio == {"Donaciones": [], "Ítems": []}


def test_el_excel_no_se_confunde_con_el_id_de_una_donacion(cliente_admin: TestClient) -> None:
    assert cliente_admin.get("/api/donaciones/export.xlsx").status_code == 200


def test_un_filtro_invalido_no_genera_el_excel(cliente_admin: TestClient) -> None:
    respuesta = cliente_admin.get("/api/donaciones/export.xlsx", params={"estado": "rota"})

    assert respuesta.status_code == 422


def test_el_archivo_lleva_la_fecha_en_el_nombre(cliente_admin: TestClient) -> None:
    cabecera = cliente_admin.get("/api/donaciones/export.xlsx").headers["content-disposition"]

    assert cabecera == f'attachment; filename="Donaciones_Fondacio_{hoy().isoformat()}.xlsx"'


def test_un_texto_que_empieza_con_igual_no_se_ejecuta_como_formula(
    cliente_admin: TestClient,
) -> None:
    nueva_sede(cliente_admin)
    nueva_donacion(
        cliente_admin,
        nuevo_donante(cliente_admin, '=HYPERLINK("http://x")'),
        items=[{"name": "=1+1"}],
    )

    respuesta = cliente_admin.get("/api/donaciones/export.xlsx")

    libro = load_workbook(BytesIO(respuesta.content))
    assert libro["Ítems"]["E2"].data_type == "s"
    assert libro["Ítems"]["E2"].value == "=1+1"
    assert libro["Donaciones"]["B2"].data_type == "s"


def test_consulta_puede_exportar_y_sin_sesion_no(
    cliente_consulta: TestClient, cliente: TestClient
) -> None:
    assert cliente_consulta.get("/api/donaciones/export.xlsx").status_code == 200
    assert cliente.get("/api/donaciones/export.xlsx").status_code == 401


def test_los_caracteres_de_control_no_rompen_la_descarga(cliente_admin: TestClient) -> None:
    nueva_sede(cliente_admin)
    nueva_donacion(
        cliente_admin,
        nuevo_donante(cliente_admin),
        notes="Pegado desde Word\x0b con salto raro",
        items=[{"name": "Silla\x07", "description": "Con\x1bruedas"}],
    )

    respuesta = cliente_admin.get("/api/donaciones/export.xlsx")

    assert respuesta.status_code == 200
    libro = load_workbook(BytesIO(respuesta.content))
    assert libro["Donaciones"]["H2"].value == "Pegado desde Word con salto raro"
    assert libro["Ítems"]["E2"].value == "Silla"
