import { afterEach, describe, expect, it } from "vitest";
import syncHandler from "../api/mercado-publico/sync.js";
import { parseTender, parseTenderItem } from "../api/mercado-publico/mercadoPublicoClient.js";

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

describe("seguridad del endpoint de sincronización", () => {
  const originalSecret = process.env.CRON_SECRET;
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("rechaza llamadas sin Bearer token antes de acceder a servicios externos", async () => {
    process.env.CRON_SECRET = "un-secreto-de-prueba-largo";
    const response = createResponse();
    await syncHandler({ method: "GET", headers: {}, query: {} }, response);
    expect(response.statusCode).toBe(401);
    expect(response.payload).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("rechaza un secreto incorrecto", async () => {
    process.env.CRON_SECRET = "un-secreto-de-prueba-largo";
    const response = createResponse();
    await syncHandler({ method: "GET", headers: { authorization: "Bearer incorrecto" }, query: {} }, response);
    expect(response.statusCode).toBe(401);
  });
});

describe("parser defensivo de Mercado Público", () => {
  it("mapea la estructura documentada de licitación e ítem", () => {
    const raw = {
      CodigoExterno: "1234-56-LE26",
      Nombre: "Adquisición de alimentos",
      Descripcion: "Economato",
      Estado: "Publicada",
      Moneda: "CLP",
      MontoEstimado: 12_000_000,
      Comprador: { NombreOrganismo: "Hospital X", RutUnidad: "61.000.000-0", RegionUnidad: "Biobío", ComunaUnidad: "Concepción" },
      Fechas: { FechaPublicacion: "2026-08-20T10:00:00Z", FechaCierre: "2026-08-27T15:00:00Z" },
      Items: { Listado: [{ Correlativo: 4, CodigoProducto: 50151513, Categoria: "Aceites", NombreProducto: "Aceite de oliva extra virgen", Descripcion: "Botella 1 litro", UnidadMedida: "Unidad", Cantidad: 480 }] },
    };
    const tender = parseTender(raw);
    const item = parseTenderItem(tender.items[0], 0);
    expect(tender).toMatchObject({ code: "1234-56-LE26", buyerName: "Hospital X", region: "Biobío", estimatedAmount: 12_000_000 });
    expect(item).toMatchObject({ itemId: 4, productCode: "50151513", productName: "Aceite de oliva extra virgen", quantity: 480, unit: "Unidad" });
  });

  it("tolera un único ítem como objeto", () => {
    const tender = parseTender({ CodigoExterno: "X-1", Items: { Listado: { Correlativo: 1, NombreProducto: "AOVE" } } });
    expect(tender.items).toHaveLength(1);
  });

  it("normaliza fechas serializadas con el formato .NET histórico", () => {
    const tender = parseTender({ CodigoExterno: "X-2", Fechas: { FechaCierre: "/Date(1787857200000)/" } });
    expect(tender.closingDate).toBe("2026-08-27T19:00:00.000Z");
  });
});
