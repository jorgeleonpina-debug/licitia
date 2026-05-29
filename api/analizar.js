export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { textoBase, licitacion } = req.body;

  const prompt = `Analiza estas bases de licitación chilena y devuelve SOLO JSON sin markdown:
{
  "score": número 1-10,
  "recomendacion": "ATACAR"|"MONITOREAR"|"IGNORAR",
  "razon": "explicación 2-3 oraciones",
  "requisitos_clave": ["req1", "req2", "req3"],
  "criterios_evaluacion": [{"criterio": "nombre", "porcentaje": número}],
  "precio_referencial": número o null,
  "plazo_ejecucion": "texto o null",
  "documentos_necesarios": ["doc1", "doc2"],
  "nivel_competencia_estimado": "bajo"|"medio"|"alto",
  "oportunidad_resumen": "1 oración para el proveedor"
}

Licitación: ${licitacion.Nombre}
Organismo: ${licitacion.Organismo}
Tipo: ${licitacion.Tipo || 'LE'}
Monto: ${licitacion.MontoEstimado}

TEXTO DE LAS BASES:
${textoBase}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const texto = data.content?.[0]?.text || '{}';
    const clean = texto.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
