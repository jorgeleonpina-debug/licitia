export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { codigo, nombre, organismo, descripcion,
          monto, tipo, region, fechaCierre } = req.query;

  const texto = `
LICITACIÓN: ${nombre}
CÓDIGO: ${codigo}
ORGANISMO COMPRADOR: ${organismo}
REGIÓN: ${region}
TIPO: ${tipo}
MONTO ESTIMADO: $${parseInt(monto || 0).toLocaleString('es-CL')}
FECHA CIERRE: ${fechaCierre}

DESCRIPCIÓN OFICIAL:
${descripcion || 'No disponible en API'}

ANÁLISIS CONTEXTUAL:
- Tipo ${tipo}: ${
    tipo === 'L1' ? 'Licitación menor a 100 UTM (~$3.5M), proceso simple' :
    tipo === 'LE' ? 'Licitación 100-1000 UTM (~$3.5M-$35M), complejidad media' :
    tipo === 'LP' ? 'Licitación 1000-2000 UTM (~$35M-$70M), requiere más documentación' :
    tipo === 'LQ' ? 'Licitación 2000-5000 UTM (~$70M-$175M), alta complejidad' :
    tipo === 'LR' ? 'Licitación mayor 5000 UTM (>$175M), máxima complejidad' : tipo
  }
- Ver bases completas en: https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${codigo}
  `;

  res.status(200).json({
    texto,
    url: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${codigo}`
  });
}
