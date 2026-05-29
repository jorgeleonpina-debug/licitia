export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { historico, licitacion } = req.body;

  const prompt = `Eres un experto en licitaciones públicas chilenas.
Analiza estos contratos adjudicados similares y recomienda
el precio óptimo para ganar la licitación actual.
Devuelve SOLO JSON sin markdown:
{
  "precio_sugerido": número en pesos chilenos,
  "rango_minimo": número,
  "rango_maximo": número,
  "estrategia": "texto de 2 oraciones explicando la estrategia de precio",
  "advertencias": ["advertencia1", "advertencia2"],
  "confianza": "alta"|"media"|"baja",
  "promedio_historico": número,
  "descuento_recomendado": número porcentaje sobre monto estimado
}

LICITACIÓN ACTUAL:
Nombre: ${licitacion.nombre}
Monto estimado: $${licitacion.monto}
Tipo: ${licitacion.tipo}
Organismo: ${licitacion.organismo}

CONTRATOS SIMILARES ADJUDICADOS:
${historico.map((h, i) => `
${i + 1}. ${h.nombre}
   Organismo: ${h.organismo}
   Monto estimado: $${(h.montoEstimado || 0).toLocaleString('es-CL')}
   Monto adjudicado: $${(h.montoAdjudicado || 0).toLocaleString('es-CL')}
   Proveedor ganador: ${h.proveedor}
   Nº oferentes: ${h.numeroOferentes}
`).join('')}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data   = await response.json();
    const texto  = data.content?.[0]?.text || '{}';
    const parsed = JSON.parse(texto.replace(/```json|```/g, '').trim());
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
