const API_URL = "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json";
export const MERCADO_PUBLICO_SEARCH_URL = "https://www.mercadopublico.cl/BuscarLicitacion";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function requestMercadoPublico(params, options = {}) {
  const ticket = process.env.MERCADO_PUBLICO_TICKET;
  if (!ticket) throw new Error("MERCADO_PUBLICO_TICKET no está configurado");

  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxRetries = options.maxRetries ?? 3;
  const url = new URL(API_URL);
  Object.entries({ ...params, ticket }).forEach(([key, value]) => url.searchParams.set(key, value));

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.info(`[mercado-publico] request attempt ${attempt}/${maxRetries}`, { params });
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (response.ok) {
        const data = await response.json();
        if (data?.Codigo === 500 || data?.Codigo === 401) {
          throw new Error(data?.Mensaje || "Mercado Público rechazó la solicitud");
        }
        return data;
      }
      const retryable = response.status === 429 || response.status >= 500;
      const body = await response.text();
      const error = new Error(`Mercado Público HTTP ${response.status}: ${body.slice(0, 240)}`);
      if (!retryable) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (error?.name !== "AbortError" && /HTTP 4\d\d/.test(error?.message || "") && !/HTTP 429/.test(error.message)) throw error;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < maxRetries) await sleep(400 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 150));
  }
  throw new Error(`Mercado Público falló después de ${maxRetries} intentos: ${lastError?.message || "error desconocido"}`);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

function getTenderList(payload) {
  return asArray(payload?.Listado ?? payload?.listado ?? payload?.Licitaciones?.Listado);
}

function parseApiDate(value) {
  if (!value) return null;
  const dotNetMatch = String(value).match(/^\/Date\((-?\d+)/);
  const date = dotNetMatch ? new Date(Number(dotNetMatch[1])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function getActiveTenders() {
  const payload = await requestMercadoPublico({ estado: "activas" });
  return { tenders: getTenderList(payload), metadata: { count: Number(payload?.Cantidad) || getTenderList(payload).length, createdAt: payload?.FechaCreacion, version: payload?.Version } };
}

export async function getTenderByCode(code) {
  const payload = await requestMercadoPublico({ codigo: code });
  const tender = getTenderList(payload)[0];
  if (!tender) throw new Error(`Mercado Público no devolvió detalle para ${code}`);
  return tender;
}

export function parseTender(detail) {
  const buyer = detail?.Comprador || detail?.comprador || {};
  const dates = detail?.Fechas || detail?.fechas || {};
  const itemContainer = detail?.Items ?? detail?.items ?? {};
  const directUrl = [detail?.Url, detail?.URL, detail?.url].find((value) => {
    try { return new URL(value).hostname.endsWith("mercadopublico.cl"); } catch { return false; }
  });

  return {
    code: String(detail?.CodigoExterno ?? detail?.Codigo ?? "").trim(),
    name: detail?.Nombre ?? "Sin nombre",
    description: detail?.Descripcion ?? "",
    buyerName: buyer?.NombreOrganismo ?? buyer?.NombreUnidad ?? "Sin organismo",
    buyerRut: buyer?.RutUnidad ?? "",
    region: buyer?.RegionUnidad ?? "Sin región",
    commune: buyer?.ComunaUnidad ?? "",
    publicationDate: parseApiDate(dates?.FechaPublicacion ?? detail?.FechaPublicacion),
    closingDate: parseApiDate(dates?.FechaCierre ?? detail?.FechaCierre),
    estimatedAmount: Number(detail?.MontoEstimado) || null,
    currency: detail?.Moneda ?? "CLP",
    state: typeof detail?.Estado === "string" ? detail.Estado : (detail?.Estado?.Nombre ?? String(detail?.CodigoEstado ?? "")),
    url: directUrl || MERCADO_PUBLICO_SEARCH_URL,
    items: asArray(itemContainer?.Listado ?? itemContainer?.listado),
    raw: detail,
  };
}

export function parseTenderItem(item, index) {
  return {
    itemId: item?.Correlativo ?? item?.correlativo ?? null,
    productCode: String(item?.CodigoProducto ?? item?.CodigoCategoria ?? "").trim(),
    category: item?.Categoria ?? "",
    productName: item?.NombreProducto ?? item?.Producto ?? "",
    description: item?.Descripcion ?? "",
    quantity: Number(item?.Cantidad) || null,
    unit: item?.UnidadMedida ?? "",
    index,
    raw: item,
  };
}

export async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), values.length || 1) }, worker));
  return results;
}
