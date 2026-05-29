export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { rubro, organismo, ticket } = req.query;

  if (!ticket) return res.status(400).json({ error: 'Falta ticket' });

  try {
    const resultados = [];
    const hoy = new Date();
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let i = 1; i <= 5; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const dd   = String(fecha.getDate()).padStart(2, '0');
      const mm   = String(fecha.getMonth() + 1).padStart(2, '0');
      const yyyy = fecha.getFullYear();

      try {
        const url = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${dd}${mm}${yyyy}&estado=adjudicada&ticket=${ticket}`;
        const r    = await fetch(url);
        const data = await r.json();

        if (data?.Listado?.length > 0) {
          const palabras = (rubro || '').toLowerCase().split(' ').filter(p => p.length > 3);
          const filtrados = data.Listado.filter(l => {
            const nombre = (l.Nombre || '').toLowerCase();
            return palabras.length === 0 || palabras.some(p => nombre.includes(p));
          });
          resultados.push(...filtrados.slice(0, 3));
        }
      } catch {}

      await sleep(500);
    }

    const detallados = [];
    for (const l of resultados.slice(0, 5)) {
      try {
        const url  = `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${l.CodigoExterno}&ticket=${ticket}`;
        const r    = await fetch(url);
        const data = await r.json();
        const det  = data?.Listado?.[0];

        if (det) {
          const adjudicacion = det.Adjudicacion || {};
          const items        = det.Items?.Listado || [];

          let montoAdjudicado = 0;
          let proveedor       = 'Desconocido';

          items.forEach(item => {
            if (item.Adjudicacion?.MontoUnitario) {
              montoAdjudicado += item.Adjudicacion.MontoUnitario * (item.Cantidad || 1);
            }
            if (item.Adjudicacion?.NombreProveedor) {
              proveedor = item.Adjudicacion.NombreProveedor;
            }
          });

          detallados.push({
            codigo:             l.CodigoExterno,
            nombre:             det.Nombre,
            organismo:          det.Comprador?.NombreOrganismo || 'Sin info',
            region:             det.Comprador?.RegionUnidad    || '',
            montoEstimado:      det.MontoEstimado              || 0,
            montoAdjudicado:    montoAdjudicado || det.MontoEstimado || 0,
            proveedor,
            fechaAdjudicacion:  adjudicacion.Fecha             || '',
            numeroOferentes:    adjudicacion.NumeroOferentes   || 0,
          });
        }
      } catch {}

      await sleep(300);
    }

    res.status(200).json({ resultados: detallados, total: detallados.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
