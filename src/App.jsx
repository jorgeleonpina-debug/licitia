import { useState, useEffect } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────
const C = {
  bg:      "#05080E",
  surface: "#0A0F18",
  card:    "#0F1620",
  border:  "#182030",
  borderHi:"#243550",
  accent:  "#00D4FF",
  green:   "#00E676",
  yellow:  "#FFD740",
  red:     "#FF4D6A",
  purple:  "#A78BFA",
  text:    "#E2EAF4",
  muted:   "#5A7090",
  dim:     "#2A3D55",
};

// ─── MOCK DATA ─────────────────────────────────────────────────────
const MOCK = [
  { CodigoLicitacion:"1057-4-LE25", Nombre:"Servicio de Alimentación para Personal Municipal", Organismo:"Municipalidad de Santiago", Region:"Metropolitana", FechaCierre:"2026-06-10", MontoEstimado:45000000, Estado:"Publicada", Rubro:"Alimentación", NumOferentes:3, GanadorHistorico:"Rotativo", ComplejidadBases:"Baja", score:9, recomendacion:"ATACAR", razon:"Baja competencia histórica, bases simples y organismo con adjudicación rotativa." },
  { CodigoLicitacion:"2765-15-LP25", Nombre:"Adquisición de Equipos Computacionales", Organismo:"Ministerio de Educación", Region:"Metropolitana", FechaCierre:"2026-06-05", MontoEstimado:320000000, Estado:"Publicada", Rubro:"Tecnología", NumOferentes:18, GanadorHistorico:"Siempre mismo", ComplejidadBases:"Alta", score:2, recomendacion:"IGNORAR", razon:"Alta competencia y proveedor dominante consolidado con certificaciones exclusivas." },
  { CodigoLicitacion:"3301-8-LE25", Nombre:"Servicio de Aseo y Mantención Edificio Público", Organismo:"SEREMI Salud Valparaíso", Region:"Valparaíso", FechaCierre:"2026-06-15", MontoEstimado:28000000, Estado:"Publicada", Rubro:"Servicios", NumOferentes:4, GanadorHistorico:"Rotativo", ComplejidadBases:"Baja", score:8, recomendacion:"ATACAR", razon:"Competencia moderada, organismo abierto a nuevos proveedores, monto ejecutable." },
  { CodigoLicitacion:"4820-2-LQ25", Nombre:"Consultoría en Transformación Digital", Organismo:"Subsecretaría de Economía", Region:"Metropolitana", FechaCierre:"2026-06-20", MontoEstimado:180000000, Estado:"Publicada", Rubro:"Consultoría", NumOferentes:7, GanadorHistorico:"Rotativo", ComplejidadBases:"Media", score:6, recomendacion:"MONITOREAR", razon:"Monto atractivo pero requiere acreditar experiencia previa en proyectos similares." },
  { CodigoLicitacion:"5512-1-LE25", Nombre:"Suministro de Materiales de Oficina", Organismo:"Hospital Regional Rancagua", Region:"O'Higgins", FechaCierre:"2026-06-08", MontoEstimado:12000000, Estado:"Publicada", Rubro:"Insumos", NumOferentes:2, GanadorHistorico:"Rotativo", ComplejidadBases:"Baja", score:9, recomendacion:"ATACAR", razon:"Mínima competencia, bases muy simples, alta probabilidad de adjudicación directa." },
  { CodigoLicitacion:"6104-11-LP25", Nombre:"Construcción Sede Comunitaria", Organismo:"Municipalidad de Pudahuel", Region:"Metropolitana", FechaCierre:"2026-07-01", MontoEstimado:650000000, Estado:"Publicada", Rubro:"Construcción", NumOferentes:12, GanadorHistorico:"Siempre mismo", ComplejidadBases:"Alta", score:1, recomendacion:"IGNORAR", razon:"Proveedor histórico dominante, requiere garantías y experiencia acreditada en construcción." },
  { CodigoLicitacion:"7893-6-LE25", Nombre:"Capacitación en Prevención de Riesgos", Organismo:"SERNAC", Region:"Metropolitana", FechaCierre:"2026-06-18", MontoEstimado:9500000, Estado:"Publicada", Rubro:"Capacitación", NumOferentes:3, GanadorHistorico:"Rotativo", ComplejidadBases:"Baja", score:8, recomendacion:"ATACAR", razon:"Monto accesible, pocas exigencias técnicas y organismo con buenas prácticas de adjudicación." },
];

const RUBROS = ["Alimentación y Catering","Aseo y Mantención","Capacitación y Formación","Consultoría y Asesoría","Equipos y Tecnología","Insumos y Materiales","Servicios Profesionales","Transporte y Logística","Otro"];

const SECCIONES = [
  { id:"presentacion", label:"Presentación Empresa",   icon:"🏢" },
  { id:"tecnica",      label:"Propuesta Técnica",       icon:"⚙️" },
  { id:"metodologia",  label:"Metodología",             icon:"📋" },
  { id:"equipo",       label:"Equipo de Trabajo",       icon:"👥" },
  { id:"cronograma",   label:"Cronograma",              icon:"📅" },
  { id:"economica",    label:"Propuesta Económica",     icon:"💰" },
  { id:"experiencia",  label:"Experiencia Previa",      icon:"🏆" },
  { id:"declaraciones",label:"Declaraciones Juradas",   icon:"📜" },
];

// ─── HELPERS ───────────────────────────────────────────────────────
const fmt  = n => {
  if (!n || isNaN(n) || n === 0) return "Sin monto";
  return n >= 1000000
    ? "$" + (n/1000000).toFixed(1) + "M"
    : "$" + (n/1000).toFixed(0) + "K";
};
const dias = f => Math.max(0, Math.ceil((new Date(f) - new Date()) / 86400000));
const scoreColor = s => s >= 8 ? C.green : s >= 5 ? C.yellow : C.red;
const recStyle   = r => r==="ATACAR" ? {color:C.green,bg:`${C.green}18`} : r==="MONITOREAR" ? {color:C.yellow,bg:`${C.yellow}18`} : {color:C.red,bg:`${C.red}18`};

// ─── SMALL COMPONENTS ──────────────────────────────────────────────
function Ring({ score }) {
  const r=20, circ=2*Math.PI*r, fill=(score/10)*circ, col=scoreColor(score);
  return (
    <svg width="50" height="50" style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx="25" cy="25" r={r} fill="none" stroke={C.border} strokeWidth="4"/>
      <circle cx="25" cy="25" r={r} fill="none" stroke={col} strokeWidth="4"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{filter:`drop-shadow(0 0 5px ${col})`}}/>
      <text x="25" y="25" textAnchor="middle" dominantBaseline="middle" fill={col}
        fontSize="12" fontWeight="700" fontFamily="'DM Mono',monospace"
        style={{transform:"rotate(90deg)",transformOrigin:"25px 25px"}}>{score}</text>
    </svg>
  );
}

function Pill({ color, children }) {
  return <span style={{background:`${color}18`,color,border:`1px solid ${color}35`,borderRadius:6,padding:"2px 9px",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:.5}}>{children}</span>;
}

function Btn({ children, onClick, disabled, variant="primary", small }) {
  const base = {border:"none",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontFamily:"'DM Mono',monospace",fontWeight:700,letterSpacing:.8,transition:"all .2s",padding: small ? "6px 14px" : "11px 22px",fontSize: small ? 11 : 13};
  const styles = {
    primary: {background: disabled ? C.dim : C.accent, color: disabled ? C.muted : "#000"},
    purple:  {background: disabled ? C.dim : `linear-gradient(135deg,${C.purple},${C.accent})`, color: disabled ? C.muted : "#000"},
    ghost:   {background:"none",border:`1px solid ${C.border}`,color:C.muted},
    green:   {background:`${C.green}18`,color:C.green,border:`1px solid ${C.green}35`},
  };
  return <button onClick={onClick} disabled={disabled} style={{...base,...styles[variant]}}>{children}</button>;
}

function Field({ label, value, onChange, placeholder, type="text", rows, hint, options }) {
  const baseStyle = {width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 13px",color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,outline:"none",boxSizing:"border-box",transition:"border-color .2s"};
  const focus = e => e.target.style.borderColor = C.accent;
  const blur  = e => e.target.style.borderColor = C.border;
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",color:C.muted,fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:5}}>{label.toUpperCase()}</label>
      {options
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={baseStyle} onFocus={focus} onBlur={blur}>{options.map(o=><option key={o} value={o} style={{background:C.card}}>{o}</option>)}</select>
        : rows
          ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={focus} onBlur={blur} style={{...baseStyle,resize:"vertical"}}/>
          : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={focus} onBlur={blur} style={baseStyle}/>
      }
      {hint && <p style={{margin:"3px 0 0",color:C.muted,fontSize:11}}>{hint}</p>}
    </div>
  );
}

// ─── NAV ───────────────────────────────────────────────────────────
function Nav({ view, setView, modoReal, historialCount }) {
  return (
    <div className="no-print" style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 20px",display:"flex",alignItems:"stretch",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 0"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:C.accent,boxShadow:`0 0 8px ${C.accent}`}}/>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,color:C.text,letterSpacing:1}}>
          LICIT<span style={{color:C.accent}}>IA</span>
        </span>
      </div>
      <div style={{display:"flex",gap:2}}>
        {[
          {id:"dashboard", icon:"🎯", label:"Radar",    badge:null},
          {id:"propuesta", icon:"✍️", label:"Propuesta", badge:null},
          {id:"historial", icon:"📁", label:"Historial", badge:historialCount||null},
        ].map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)} style={{
            background:"none",border:"none",borderBottom:`2px solid ${view===t.id?C.accent:"transparent"}`,
            padding:"12px 16px",color:view===t.id?C.accent:C.muted,cursor:"pointer",
            fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,letterSpacing:.8,
            transition:"all .2s",display:"flex",alignItems:"center",gap:6,position:"relative",
          }}>
            <span>{t.icon}</span>
            <span>{t.label.toUpperCase()}</span>
            {t.badge ? (
              <span style={{background:C.purple,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700,lineHeight:1.4}}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center"}}>
        <Pill color={modoReal?C.green:C.yellow}>{modoReal?"● API REAL":"● DEMO"}</Pill>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ────────────────────────────────────────────────
function Dashboard({ licitaciones, setLicitaciones, modoReal, setModoReal, onSelectForPropuesta }) {
  const [ticket, setTicket]   = useState("");
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro]   = useState("TODAS");
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [anaIdx, setAnaIdx]   = useState(-1);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [filtroRubro, setFiltroRubro] = useState("Todos");
  const [alertaActiva, setAlertaActiva] = useState(()=>!!localStorage.getItem("licitia_alerta_hora"));
  const [analisisProfundo, setAnalisisProfundo] = useState({});
  const [loadingBases, setLoadingBases] = useState(false);

  const stats = {
    atacar:    licitaciones.filter(l=>l.recomendacion==="ATACAR").length,
    monitorear:licitaciones.filter(l=>l.recomendacion==="MONITOREAR").length,
    ignorar:   licitaciones.filter(l=>l.recomendacion==="IGNORAR").length,
  };

  const RUBROS_OPCIONES = ["Todos","Alimentación","Aseo y Mantención","Capacitación","Consultoría","Tecnología","Insumos y Materiales","Construcción","Salud","Transporte","Servicios"];
  const detectarRubro = (nombre="") => {
    const n = nombre.toLowerCase();
    if(/aseo|limpieza|mantenci/.test(n)) return "Aseo y Mantención";
    if(/capacitaci|formaci|taller|curso/.test(n)) return "Capacitación";
    if(/software|licencia|computac|tecnolog|sistema inform|hardware/.test(n)) return "Tecnología";
    if(/aliment|catering|alimentaci|cocina|raci[oó]n/.test(n)) return "Alimentación";
    if(/construcci|obra|paviment|edifici|infraestructur/.test(n)) return "Construcción";
    if(/médico|clínico|hospital|dental|salud|farmac|medicam/.test(n)) return "Salud";
    if(/transport|logistic|traslado|flete|camion/.test(n)) return "Transporte";
    if(/consultor|asesor|estudio|diagnóstico/.test(n)) return "Consultoría";
    if(/insumo|material|suministro|papel|[uú]til|oficina/.test(n)) return "Insumos y Materiales";
    return "Servicios";
  };
  const filtradas = licitaciones
    .filter(l => filtro==="TODAS" || l.recomendacion===filtro)
    .filter(l => filtroRubro==="Todos" || detectarRubro(l.Nombre)===filtroRubro);

  const activarAlerta = async () => {
    const perm = await Notification.requestPermission();
    if(perm==="granted"){
      localStorage.setItem("licitia_alerta_hora","09:00");
      setAlertaActiva(true);
      new Notification("LicitIA", {body:"Alerta diaria activada. Te avisaré cada mañana con las mejores licitaciones."});
    }
  };

  const desactivarAlerta = () => {
    localStorage.removeItem("licitia_alerta_hora");
    setAlertaActiva(false);
  };

  useEffect(()=>{
    const alerta = localStorage.getItem("licitia_alerta_hora");
    if(!alerta || !ticket) return;
    const hoy = new Date().toDateString();
    const ultimoAnalisis = localStorage.getItem("licitia_ultimo_analisis");
    if(ultimoAnalisis===hoy) return;
    const ahora = new Date();
    const [hh, mm] = alerta.split(":").map(Number);
    if(ahora.getHours() > hh || (ahora.getHours()===hh && ahora.getMinutes()>=mm)){
      localStorage.setItem("licitia_ultimo_analisis", hoy);
      conectar().then(()=>{
        if(Notification.permission==="granted")
          new Notification("LicitIA", {body:"Análisis diario listo. Revisa las licitaciones de hoy."});
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ticket]);

  const analizarUna = async l => {
    try {
      console.log("Licitacion raw:", JSON.stringify(l));
      const res = await fetch("/api/claude",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:400,messages:[{role:"user",content:`Analiza esta licitación chilena. Responde SOLO JSON sin markdown:\n{"score":número 1-10,"recomendacion":"ATACAR"|"MONITOREAR"|"IGNORAR","razon":"1-2 oraciones"}\n\nNombre: ${l.Nombre||"Sin nombre"}\nOrganismo: ${l.Organismo||"Desconocido"}\nDescripción: ${l.Descripcion||""}\nMonto: ${l.MontoEstimado||"No informado"}\nTipo: ${l.Tipo||"LE"}\nFecha cierre: ${l.FechaCierre||"Sin fecha"}\nRegión: ${l.Region||""}\n\nCriterios — ATACAR: L1/LE + monto bajo + servicio simple; MONITOREAR: datos insuficientes o monto medio; IGNORAR: LP/LQ/LR o muy compleja.`}]})
      });
      const d = await res.json();
      console.log("RESPUESTA CLAUDE:", JSON.stringify(d));
      const parsed = JSON.parse(d.content?.[0]?.text?.replace(/```json|```/g,"")||"{}");
      return {...l,...parsed};
    } catch { return {...l,score:5,recomendacion:"MONITOREAR",razon:"No analizado."}; }
  };

  const analizarConIA = async items => {
    setAnalyzing(true);
    const GRUPO = 5;
    const out = [];
    for (let i=0; i<items.length; i+=GRUPO) {
      setAnaIdx(i);
      const grupo = items.slice(i, i+GRUPO);
      const resultados = await Promise.all(grupo.map(l => analizarUna(l)));
      out.push(...resultados);
    }
    setAnaIdx(-1); setAnalyzing(false);
    return out;
  };

  const conectar = async () => {
    if(!ticket) return;
    setLoading(true);
    try {
      const hoy=new Date(), dd=String(hoy.getDate()).padStart(2,"0"), mm=String(hoy.getMonth()+1).padStart(2,"0");
      const fecha=`${dd}${mm}${hoy.getFullYear()}`;
      setLoadingMsg("Obteniendo listado del día...");
      const res = await fetch(`https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=${fecha}&estado=publicada&ticket=${ticket}`);
      const data = await res.json();
      if(data?.Listado?.length>0){
        console.log("PRIMER ITEM RAW:", JSON.stringify(data.Listado[0], null, 2));
        const basicos = data.Listado.slice(0,20);
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        // Segunda llamada secuencial con delay para evitar 429
        const completos = [];
        for(let i=0; i<basicos.length; i++){
          const item = basicos[i];
          setLoadingMsg(`Cargando detalle ${i+1} de ${basicos.length}...`);
          await sleep(300);
          try {
            const r2 = await fetch(`https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=${item.CodigoExterno}&ticket=${ticket}`);
            const d2 = await r2.json();
            const detalle = d2?.Listado?.[0] || {};
            completos.push({
              ...item,
              CodigoLicitacion: item.CodigoExterno,
              Nombre: item.Nombre,
              Organismo: detalle.Comprador?.NombreOrganismo || item.Comprador?.NombreOrganismo || "Sin organismo",
              Region: detalle.Comprador?.RegionUnidad || item.Comprador?.RegionUnidad || "Sin región",
              MontoEstimado: detalle.MontoEstimado || item.MontoEstimado || 0,
              Descripcion: detalle.Descripcion || "",
              FechaCierre: detalle.FechaCierre || item.FechaCierre || detalle.Fechas?.FechaCierre,
              NumOferentes: 0,
              GanadorHistorico: "Desconocido",
              ComplejidadBases: "Media",
            });
          } catch {
            // detalle falló (429 u otro) → usar datos básicos sin abortar
            completos.push({
              ...item,
              CodigoLicitacion: item.CodigoExterno,
              Organismo: item.Comprador?.NombreOrganismo || "Sin organismo",
              Region: item.Comprador?.RegionUnidad || "Sin región",
              MontoEstimado: item.MontoEstimado || 0,
              FechaCierre: item.FechaCierre,
              NumOferentes: 0,
              GanadorHistorico: "Desconocido",
              ComplejidadBases: "Media",
            });
          }
        }
        setLoadingMsg("Analizando con IA...");
        const analizadas = await analizarConIA(completos);
        setLicitaciones(analizadas); setModoReal(true);
      }
    } catch { alert("Error al conectar. Verifica tu ticket."); }
    setLoading(false);
    setLoadingMsg("");
  };

  const analizarBases = async (licitacion) => {
    setLoadingBases(true);
    try {
      const p = new URLSearchParams({
        codigo:      licitacion.CodigoLicitacion || '',
        nombre:      licitacion.Nombre           || '',
        organismo:   licitacion.Organismo        || '',
        descripcion: licitacion.Descripcion      || '',
        monto:       licitacion.MontoEstimado    || '0',
        tipo:        licitacion.Tipo             || '',
        region:      licitacion.Region           || '',
        fechaCierre: licitacion.FechaCierre      || '',
      });
      const r1 = await fetch(`/api/bases?${p}`);
      const { texto } = await r1.json();
      const r2 = await fetch('/api/analizar', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ textoBase: texto, licitacion }),
      });
      const data = await r2.json();
      setAnalisisProfundo(prev => ({...prev, [licitacion.CodigoLicitacion]: data}));
    } catch(e) { console.error('Error análisis bases:', e); }
    setLoadingBases(false);
  };

  const detalle = selected;
  const ds = detalle ? recStyle(detalle.recomendacion) : {};
  const ap = detalle ? analisisProfundo[detalle.CodigoLicitacion] : null;

  return (
    <div style={{padding:20}}>
      {/* API bar */}
      <div style={{background:C.card,borderRadius:12,padding:"12px 16px",border:`1px solid ${C.border}`,marginBottom:16,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <input value={ticket} onChange={e=>setTicket(e.target.value)} placeholder="Pega tu ticket de API aquí (api.mercadopublico.cl)…"
          style={{flex:1,minWidth:220,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 13px",color:C.text,fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none"}}/>
        <Btn onClick={conectar} disabled={!ticket||loading}>{loading?"CARGANDO…":"CONECTAR API"}</Btn>
        {loading && loadingMsg
          ? <span style={{color:C.accent,fontSize:11,fontFamily:"'DM Mono',monospace"}}>⏳ {loadingMsg}</span>
          : <span style={{color:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>Sin ticket → modo demo activo</span>
        }
        <button onClick={alertaActiva?desactivarAlerta:activarAlerta} style={{
          background:alertaActiva?`${C.green}15`:"none",
          border:`1px solid ${alertaActiva?C.green:C.border}`,
          color:alertaActiva?C.green:C.muted,
          borderRadius:8,padding:"6px 12px",fontSize:10,cursor:"pointer",
          fontFamily:"'DM Mono',monospace",fontWeight:700,whiteSpace:"nowrap",
        }}>{alertaActiva?"🔔 ALERTA ON":"🔕 ALERTA DIARIA"}</button>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        {[
          {label:"ATACAR",    val:stats.atacar,    color:C.green,  f:"ATACAR"},
          {label:"MONITOREAR",val:stats.monitorear,color:C.yellow, f:"MONITOREAR"},
          {label:"IGNORAR",   val:stats.ignorar,   color:C.red,    f:"IGNORAR"},
          {label:"TOTAL",     val:licitaciones.length, color:C.accent, f:"TODAS"},
        ].map(s=>(
          <div key={s.label} onClick={()=>setFiltro(s.f)} style={{
            background:filtro===s.f?`${s.color}12`:C.card,
            border:`1px solid ${filtro===s.f?s.color:C.border}`,
            borderRadius:10,padding:"10px 16px",cursor:"pointer",minWidth:90,
            boxShadow:filtro===s.f?`0 0 14px ${s.color}18`:"none",transition:"all .2s",
          }}>
            <div style={{color:s.color,fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{s.val}</div>
            <div style={{color:C.muted,fontSize:10,letterSpacing:1,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Selector de rubro */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{color:C.muted,fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:1,marginRight:4}}>RUBRO:</span>
        {RUBROS_OPCIONES.map(r=>(
          <button key={r} onClick={()=>setFiltroRubro(r)} style={{
            background:filtroRubro===r?`${C.purple}20`:"none",
            border:`1px solid ${filtroRubro===r?C.purple:C.border}`,
            color:filtroRubro===r?C.purple:C.muted,
            borderRadius:20,padding:"3px 11px",fontSize:10,cursor:"pointer",
            fontFamily:"'DM Mono',monospace",fontWeight:filtroRubro===r?700:400,
            transition:"all .15s",
          }}>{r}</button>
        ))}
      </div>

      {analyzing && (
        <div style={{background:`${C.accent}10`,border:`1px solid ${C.accent}30`,borderRadius:10,padding:"10px 16px",marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:"pulse 1s infinite"}}/>
          <span style={{color:C.accent,fontSize:12,fontFamily:"'DM Mono',monospace"}}>IA analizando licitación {anaIdx+1} de {licitaciones.length}…</span>
        </div>
      )}

      {/* Grid */}
      <div style={{display:"grid",gridTemplateColumns:selected?"1fr 360px":"1fr",gap:14,alignItems:"start"}}>
        {/* Lista */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {filtradas.map(l=>{
            const rs=recStyle(l.recomendacion), d=dias(l.FechaCierre), sel=selected?.CodigoLicitacion===l.CodigoLicitacion;
            return (
              <div key={l.CodigoLicitacion} onClick={()=>setSelected(sel?null:l)} style={{
                background:sel?"#0F1E30":C.card, border:`1px solid ${sel?C.accent:C.border}`,
                borderRadius:12,padding:"14px 16px",cursor:"pointer",
                boxShadow:sel?`0 0 18px ${C.accent}18`:"none",transition:"all .2s",
                display:"flex",gap:12,alignItems:"flex-start",
              }}>
                <Ring score={l.score}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}>
                    <p style={{margin:0,color:C.text,fontWeight:600,fontSize:13,lineHeight:1.4}}>{l.Nombre}</p>
                    <span style={{background:rs.bg,color:rs.color,border:`1px solid ${rs.color}30`,borderRadius:6,padding:"2px 8px",fontSize:9,fontWeight:700,letterSpacing:1,whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>{l.recomendacion}</span>
                  </div>
                  <p style={{margin:"3px 0 0",color:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{l.CodigoLicitacion} · {l.Organismo}</p>
                  <div style={{display:"flex",gap:12,marginTop:7,flexWrap:"wrap"}}>
                    <span style={{color:C.accent,fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmt(l.MontoEstimado)}</span>
                    <span style={{color:d<=5?C.red:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>⏱ {d}d</span>
                    <span style={{color:C.muted,fontSize:11}}>{l.Region}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {filtradas.length===0 && <p style={{color:C.muted,textAlign:"center",padding:40,fontFamily:"'DM Mono',monospace",fontSize:12}}>Sin licitaciones en este filtro</p>}
        </div>

        {/* Panel detalle */}
        {detalle && (
          <div style={{background:C.card,border:`1px solid ${C.accent}`,borderRadius:14,padding:20,boxShadow:`0 0 30px ${C.accent}12`,position:"sticky",top:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <Pill color={C.accent}>ANÁLISIS IA</Pill>
              <button onClick={()=>setSelected(null)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",borderRadius:6,padding:"2px 10px",fontSize:12}}>✕</button>
            </div>
            <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16}}>
              <Ring score={detalle.score}/>
              <span style={{background:ds.bg,color:ds.color,border:`1px solid ${ds.color}35`,borderRadius:8,padding:"5px 14px",fontSize:13,fontWeight:700,letterSpacing:1,fontFamily:"'DM Mono',monospace"}}>{detalle.recomendacion}</span>
            </div>
            <p style={{margin:"0 0 4px",color:C.text,fontSize:14,fontWeight:600,lineHeight:1.4}}>{detalle.Nombre}</p>
            <p style={{margin:"0 0 16px",color:C.accent,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{detalle.CodigoLicitacion}</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {[["Organismo",detalle.Organismo],["Región",detalle.Region],["Monto",fmt(detalle.MontoEstimado)],[`Cierre`,`${dias(detalle.FechaCierre)}d`],["Competencia",`${detalle.NumOferentes} oferentes`],["Complejidad",detalle.ComplejidadBases]].map(([k,v])=>(
                <div key={k} style={{background:C.surface,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.border}`}}>
                  <div style={{color:C.muted,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:.5,marginBottom:2}}>{k.toUpperCase()}</div>
                  <div style={{color:C.text,fontSize:12,fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{background:`${ds.color}08`,border:`1px solid ${ds.color}25`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
              <p style={{margin:"0 0 4px",color:ds.color,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>ANÁLISIS RÁPIDO</p>
              <p style={{margin:0,color:C.text,fontSize:12,lineHeight:1.6}}>{detalle.razon}</p>
            </div>

            {/* Análisis profundo */}
            {!ap && (
              <Btn variant="ghost" onClick={()=>analizarBases(detalle)} disabled={loadingBases} small>
                {loadingBases?"⏳ Analizando bases...":"🔍 ANALIZAR BASES COMPLETAS"}
              </Btn>
            )}
            {ap && (
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <Pill color={C.purple}>ANÁLISIS PROFUNDO</Pill>
                  <Ring score={ap.score||detalle.score}/>
                  <span style={{color:C.purple,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{ap.recomendacion||detalle.recomendacion}</span>
                </div>
                {ap.oportunidad_resumen && (
                  <div style={{background:`${C.purple}10`,border:`1px solid ${C.purple}25`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                    <p style={{margin:0,color:C.text,fontSize:12,lineHeight:1.5}}>{ap.oportunidad_resumen}</p>
                  </div>
                )}
                {ap.razon && (
                  <p style={{margin:"0 0 10px",color:C.muted,fontSize:11,lineHeight:1.6}}>{ap.razon}</p>
                )}
                {ap.requisitos_clave?.length>0 && (
                  <div style={{marginBottom:10}}>
                    <p style={{margin:"0 0 5px",color:C.muted,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>REQUISITOS CLAVE</p>
                    {ap.requisitos_clave.map((r,i)=>(
                      <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:3}}>
                        <span style={{color:C.yellow,fontSize:10,marginTop:1}}>▸</span>
                        <span style={{color:C.text,fontSize:11}}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
                {ap.criterios_evaluacion?.length>0 && (
                  <div style={{marginBottom:10}}>
                    <p style={{margin:"0 0 5px",color:C.muted,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>CRITERIOS EVALUACIÓN</p>
                    {ap.criterios_evaluacion.map((c,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{color:C.text,fontSize:11}}>{c.criterio}</span>
                        <span style={{color:C.accent,fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{c.porcentaje}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {ap.documentos_necesarios?.length>0 && (
                  <div style={{marginBottom:10}}>
                    <p style={{margin:"0 0 5px",color:C.muted,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:1}}>DOCUMENTOS NECESARIOS</p>
                    {ap.documentos_necesarios.map((d,i)=>(
                      <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:3}}>
                        <span style={{color:C.green,fontSize:10,marginTop:1}}>✓</span>
                        <span style={{color:C.text,fontSize:11}}>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {ap.nivel_competencia_estimado && (
                    <Pill color={ap.nivel_competencia_estimado==="bajo"?C.green:ap.nivel_competencia_estimado==="medio"?C.yellow:C.red}>
                      Competencia {ap.nivel_competencia_estimado}
                    </Pill>
                  )}
                  {ap.plazo_ejecucion && (
                    <Pill color={C.muted}>⏱ {ap.plazo_ejecucion}</Pill>
                  )}
                  {ap.precio_referencial && (
                    <Pill color={C.accent}>{fmt(ap.precio_referencial)}</Pill>
                  )}
                </div>
                <button onClick={()=>setAnalisisProfundo(prev=>({...prev,[detalle.CodigoLicitacion]:null}))}
                  style={{marginTop:8,background:"none",border:"none",color:C.muted,fontSize:10,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
                  ↺ Volver a analizar
                </button>
              </div>
            )}

            {detalle.recomendacion==="ATACAR" && (
              <Btn variant="purple" onClick={()=>onSelectForPropuesta(detalle)}>
                ✍️ GENERAR PROPUESTA →
              </Btn>
            )}
            <a href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${detalle.CodigoLicitacion}`} target="_blank" rel="noreferrer"
              style={{display:"block",marginTop:8,textAlign:"center",background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px",textDecoration:"none",fontSize:11,fontFamily:"'DM Mono',monospace"}}>
              VER EN MERCADO PÚBLICO ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECCION CARD (fixes useState-in-map hook violation) ───────────
function SeccionCard({ sec, contenido, generando, secActual }) {
  const [cp, setCp] = useState(false);
  const isLoading = generando && secActual === sec.id;
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:C.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{color:C.accent,fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600}}>{sec.icon} {sec.label}</span>
        {contenido&&!isLoading&&(
          <button onClick={()=>{navigator.clipboard.writeText(contenido);setCp(true);setTimeout(()=>setCp(false),1500);}} style={{background:"none",border:`1px solid ${cp?C.green:C.border}`,color:cp?C.green:C.muted,borderRadius:6,padding:"2px 10px",fontSize:10,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>
            {cp?"✓ OK":"COPIAR"}
          </button>
        )}
      </div>
      <div style={{padding:14}}>
        {isLoading
          ? <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{width:5,height:5,borderRadius:"50%",background:C.accent,animation:"pulse 1s infinite"}}/><span style={{color:C.muted,fontSize:12,fontFamily:"'DM Mono',monospace"}}>Generando con IA…</span></div>
          : contenido
            ? <pre style={{margin:0,color:C.text,fontSize:12,lineHeight:1.8,fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{contenido}</pre>
            : <span style={{color:C.dim,fontSize:11,fontFamily:"'DM Mono',monospace"}}>Pendiente…</span>
        }
      </div>
    </div>
  );
}

// ─── PROPUESTA VIEW ────────────────────────────────────────────────
function Propuesta({ licitacionPre, onGuardar, onIrHistorial }) {
  const [pstep, setPstep] = useState(1);
  const [generando, setGenerando] = useState(false);
  const [progreso, setProgreso]   = useState(0);
  const [secciones, setSecciones] = useState({});
  const [secActual, setSecActual] = useState("");
  const [copiado, setCopiado]     = useState(false);
  const [guardado, setGuardado]   = useState(false);

  const [lic, setLic] = useState({
    codigo: licitacionPre?.CodigoLicitacion||"",
    nombre: licitacionPre?.Nombre||"",
    organismo: licitacionPre?.Organismo||"",
    rubro: licitacionPre?.Rubro||RUBROS[0],
    monto: licitacionPre?.MontoEstimado||"",
    cierre: licitacionPre?.FechaCierre||"",
    basesResumen:"", criterios:"",
  });

  const [emp, setEmp] = useState({ nombre:"", rut:"", giro:"", contacto:"", experiencia:"", fortalezas:"", precio:"" });

  const PROMPTS = {
    presentacion:`Redacta una presentación profesional de la empresa "${emp.nombre}" (RUT ${emp.rut}, giro: ${emp.giro}) para la licitación "${lic.nombre}" del organismo "${lic.organismo}". Incluye: quiénes somos, misión, valores, capacidad. Tono formal chileno, máx 300 palabras. Solo texto plano.`,
    tecnica:`Redacta la propuesta técnica para la licitación "${lic.nombre}" (${lic.organismo}). Bases: ${lic.basesResumen||"servicio estándar del rubro "+lic.rubro}. Empresa: "${emp.nombre}", experiencia: ${emp.experiencia||"empresa comprometida con la calidad"}. Incluye: descripción del servicio, forma de entrega, estándares, garantías. Máx 400 palabras. Solo texto.`,
    metodologia:`Redacta la metodología de trabajo para ejecutar "${lic.nombre}" en rubro "${lic.rubro}". Bases: ${lic.basesResumen||"contrato estándar de servicio"}. Incluye: fases, procedimientos, controles de calidad, coordinación. Formato numerado, máx 350 palabras.`,
    equipo:`Redacta sección de equipo para "${emp.nombre}" en licitación "${lic.nombre}". Fortalezas: ${emp.fortalezas||"equipo comprometido y profesional"}. Crea perfiles genéricos relevantes para rubro "${lic.rubro}" con roles y responsabilidades. Máx 250 palabras.`,
    cronograma:`Redacta cronograma de actividades para ejecutar "${lic.nombre}" en rubro "${lic.rubro}". Presenta tabla de texto con semanas/meses, actividades, responsables e hitos. Claro y ejecutable, máx 300 palabras.`,
    economica:`Redacta propuesta económica formal para "${lic.nombre}" de "${lic.organismo}". Monto estimado organismo: $${lic.monto}. Precio ofertado: $${emp.precio||Math.round(parseInt(lic.monto||0)*.88)}. Incluye: desglose de costos, valor neto, IVA, total, forma de pago, validez 30 días. Formato formal.`,
    experiencia:`Redacta sección de experiencia de "${emp.nombre}" para "${lic.nombre}". Experiencia: ${emp.experiencia||"empresa nueva con capacidad técnica comprobable"}. Si es poca, destaca capacidades y compromiso. Incluye 2-3 referencias genéricas. Máx 250 palabras.`,
    declaraciones:`Redacta declaraciones juradas estándar para licitación pública chilena. Incluye: no inhabilitado para contratar con el Estado, sin deudas laborales/previsionales, veracidad de información, cumplimiento de bases. Datos: empresa "${emp.nombre}", RUT "${emp.rut}", representante "${emp.contacto}". Formato legal formal.`,
  };

  const generar = async () => {
    setGenerando(true); setPstep(3); setSecciones({}); setProgreso(0); setGuardado(false);
    const todasSecciones = {};
    for(let i=0;i<SECCIONES.length;i++){
      const s=SECCIONES[i]; setSecActual(s.id);
      setProgreso(Math.round((i/SECCIONES.length)*100));
      try {
        const res = await fetch("/api/claude",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1000,messages:[{role:"user",content:PROMPTS[s.id]}]})
        });
        const d = await res.json();
        const texto = d.content?.[0]?.text||"Error.";
        todasSecciones[s.id] = texto;
        setSecciones(prev=>({...prev,[s.id]:texto}));
      } catch {
        todasSecciones[s.id] = "Error de conexión.";
        setSecciones(prev=>({...prev,[s.id]:"Error de conexión."}));
      }
    }
    setProgreso(100); setSecActual(""); setGenerando(false);
    if(onGuardar){ onGuardar(lic, emp, todasSecciones); setGuardado(true); }
  };

  const exportar = () => {
    const txt = `PROPUESTA TÉCNICA Y ECONÓMICA\n${"═".repeat(55)}\nLicitación: ${lic.nombre}\nOrganismo: ${lic.organismo}\nCódigo: ${lic.codigo}\nEmpresa: ${emp.nombre} | RUT: ${emp.rut}\nGenerado: ${new Date().toLocaleDateString("es-CL")}\n\n`
      + SECCIONES.map(s=>`${"═".repeat(55)}\n${s.icon} ${s.label.toUpperCase()}\n${"═".repeat(55)}\n\n${secciones[s.id]||"—"}\n\n`).join("\n");
    navigator.clipboard.writeText(txt);
    setCopiado(true); setTimeout(()=>setCopiado(false),2500);
  };

  const listo = Object.keys(secciones).length===SECCIONES.length && !generando;

  return (
    <div style={{padding:20,maxWidth:760,margin:"0 auto"}}>
      {/* Steps */}
      <div style={{display:"flex",gap:6,marginBottom:20,alignItems:"center"}}>
        {[{n:1,label:"Licitación"},{n:2,label:"Tu Empresa"},{n:3,label:"Propuesta"}].map((s,i)=>(
          <div key={s.n} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:pstep>=s.n?C.purple:C.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:pstep>=s.n?"#fff":C.muted,fontFamily:"'DM Mono',monospace",boxShadow:pstep===s.n?`0 0 10px ${C.purple}`:"none",transition:"all .3s"}}>{s.n}</div>
            <span style={{color:pstep>=s.n?C.text:C.muted,fontSize:12,fontWeight:pstep===s.n?600:400}}>{s.label}</span>
            {i<2&&<span style={{color:C.dim,margin:"0 2px"}}>›</span>}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {pstep===1&&(
        <div>
          <h2 style={{margin:"0 0 4px",fontSize:17}}>Datos de la Licitación</h2>
          <p style={{margin:"0 0 18px",color:C.muted,fontSize:13}}>Copia la información desde Mercado Público.</p>
          <div style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <Field label="Código" value={lic.codigo} onChange={v=>setLic({...lic,codigo:v})} placeholder="ej: 1057-4-LE25"/>
              <Field label="Rubro" value={lic.rubro} onChange={v=>setLic({...lic,rubro:v})} options={RUBROS}/>
            </div>
            <Field label="Nombre de la licitación" value={lic.nombre} onChange={v=>setLic({...lic,nombre:v})} placeholder="ej: Servicio de Alimentación…"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <Field label="Organismo comprador" value={lic.organismo} onChange={v=>setLic({...lic,organismo:v})} placeholder="ej: Municipalidad de Santiago"/>
              <Field label="Monto estimado ($)" value={lic.monto} onChange={v=>setLic({...lic,monto:v})} placeholder="45000000" type="number"/>
            </div>
            <Field label="Fecha de cierre" value={lic.cierre} onChange={v=>setLic({...lic,cierre:v})} type="date"/>
            <Field label="Resumen de las bases" value={lic.basesResumen} onChange={v=>setLic({...lic,basesResumen:v})} placeholder="Qué pide el organismo, requisitos, condiciones especiales…" rows={4} hint="Copia la sección 'Objeto' y 'Especificaciones técnicas' de las bases."/>
            <Field label="Criterios de evaluación" value={lic.criterios} onChange={v=>setLic({...lic,criterios:v})} placeholder="ej: Precio 40%, Técnica 40%, Experiencia 20%" rows={2}/>
          </div>
          <div style={{marginTop:16}}>
            <Btn onClick={()=>setPstep(2)} disabled={!lic.nombre||!lic.organismo} variant="primary">CONTINUAR → DATOS EMPRESA</Btn>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {pstep===2&&(
        <div>
          <h2 style={{margin:"0 0 4px",fontSize:17}}>Datos de tu Empresa</h2>
          <p style={{margin:"0 0 18px",color:C.muted,fontSize:13}}>Más detalle = mejor propuesta generada.</p>
          <div style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <Field label="Razón social" value={emp.nombre} onChange={v=>setEmp({...emp,nombre:v})} placeholder="ej: Servicios XYZ SpA"/>
              <Field label="RUT empresa" value={emp.rut} onChange={v=>setEmp({...emp,rut:v})} placeholder="ej: 76.543.210-K"/>
            </div>
            <Field label="Giro comercial" value={emp.giro} onChange={v=>setEmp({...emp,giro:v})} placeholder="ej: Servicios de alimentación y catering"/>
            <Field label="Representante / contacto" value={emp.contacto} onChange={v=>setEmp({...emp,contacto:v})} placeholder="ej: Jorge Pérez González"/>
            <Field label="Experiencia previa relevante" value={emp.experiencia} onChange={v=>setEmp({...emp,experiencia:v})} placeholder="Trabajos similares, aunque sean privados. Si eres nuevo, escribe 'empresa nueva'." rows={3}/>
            <Field label="Fortalezas y ventajas" value={emp.fortalezas} onChange={v=>setEmp({...emp,fortalezas:v})} placeholder="ej: equipo de 5 personas, maquinaria propia, precios competitivos…" rows={2}/>
            <Field label="Precio que ofertarás ($)" value={emp.precio} onChange={v=>setEmp({...emp,precio:v})} placeholder={lic.monto?String(Math.round(parseInt(lic.monto)*.88)):""} type="number"
              hint={lic.monto?`💡 Sugerido: $${Math.round(parseInt(lic.monto||0)*.88).toLocaleString("es-CL")} (88% del monto estimado)`:""} />
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={()=>setPstep(1)} variant="ghost">← VOLVER</Btn>
            <Btn onClick={generar} disabled={!emp.nombre||!emp.rut} variant="purple">✨ GENERAR PROPUESTA CON IA</Btn>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {pstep===3&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:18}}>
            <div>
              <Pill color={listo?C.green:C.yellow}>{listo?"✓ PROPUESTA COMPLETA":`GENERANDO… ${progreso}%`}</Pill>
              <h2 style={{margin:"8px 0 2px",fontSize:17}}>{lic.nombre}</h2>
              <p style={{margin:0,color:C.muted,fontSize:12}}>{lic.organismo} · {emp.nombre}</p>
            </div>
            {listo&&<Btn onClick={exportar} variant="green">{copiado?"✓ COPIADO":"📋 EXPORTAR TODO"}</Btn>}
          </div>

          {generando&&(
            <div style={{background:C.card,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.border}`,marginBottom:14}}>
              <div style={{background:C.border,borderRadius:4,height:3,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${progreso}%`,background:`linear-gradient(90deg,${C.purple},${C.accent})`,transition:"width .5s",borderRadius:4}}/>
              </div>
              <p style={{margin:0,color:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>
                Generando: {SECCIONES.find(s=>s.id===secActual)?.label||"Finalizando…"}
              </p>
            </div>
          )}

          {SECCIONES.map(sec => (
            <SeccionCard
              key={sec.id}
              sec={sec}
              contenido={secciones[sec.id]}
              generando={generando}
              secActual={secActual}
            />
          ))}

          {listo&&(
            <div style={{background:`${C.green}08`,border:`1px solid ${C.green}25`,borderRadius:12,padding:20,marginTop:6,textAlign:"center"}}>
              <p style={{margin:"0 0 6px",color:C.green,fontSize:15,fontWeight:700}}>🎉 Propuesta lista para Mercado Público</p>
              <p style={{margin:"0 0 4px",color:C.muted,fontSize:12}}>Revisa cada sección, ajusta detalles y sube los documentos antes del cierre.</p>
              {guardado&&<p style={{margin:"0 0 14px",color:C.purple,fontSize:11,fontFamily:"'DM Mono',monospace"}}>✓ Guardada automáticamente en Historial</p>}
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                <Btn onClick={exportar} variant="green" small>{copiado?"✓ COPIADO":"📋 COPIAR TODO"}</Btn>
                <Btn onClick={()=>window.print()} variant="ghost" small>🖨️ PDF</Btn>
                {onIrHistorial&&<Btn onClick={onIrHistorial} variant="ghost" small>📁 VER HISTORIAL</Btn>}
                <Btn onClick={()=>{setPstep(1);setSecciones({});setGuardado(false);}} variant="ghost" small>+ NUEVA PROPUESTA</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VER PROPUESTA GUARDADA ────────────────────────────────────────
function VerPropuesta({ entrada, onVolver }) {
  const [copiado, setCopiado] = useState(null);
  const copiarSeccion = (id, texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(id); setTimeout(()=>setCopiado(null),1500);
  };
  const exportarPDF = () => window.print();
  const copiarTodo = () => {
    const txt = `PROPUESTA TÉCNICA Y ECONÓMICA\n${"═".repeat(55)}\nLicitación: ${entrada.lic.nombre}\nOrganismo: ${entrada.lic.organismo}\nEmpresa: ${entrada.emp.nombre} | RUT: ${entrada.emp.rut}\nGenerado: ${new Date(entrada.fecha).toLocaleDateString("es-CL")}\n\n`
      + SECCIONES.map(s=>`${"═".repeat(55)}\n${s.icon} ${s.label.toUpperCase()}\n${"═".repeat(55)}\n\n${entrada.secciones[s.id]||"—"}\n\n`).join("\n");
    navigator.clipboard.writeText(txt);
    setCopiado("all"); setTimeout(()=>setCopiado(null),2000);
  };
  return (
    <div style={{padding:20,maxWidth:760,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18,flexWrap:"wrap"}}>
        <Btn onClick={onVolver} variant="ghost" small>← HISTORIAL</Btn>
        <div style={{flex:1}}>
          <h2 style={{margin:"0 0 2px",fontSize:16}}>{entrada.lic.nombre}</h2>
          <p style={{margin:0,color:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{entrada.lic.organismo} · {entrada.emp.nombre} · {new Date(entrada.fecha).toLocaleDateString("es-CL")}</p>
        </div>
        <Btn onClick={copiarTodo} variant="green" small>{copiado==="all"?"✓ COPIADO":"📋 EXPORTAR TODO"}</Btn>
        <Btn onClick={exportarPDF} variant="ghost" small>🖨️ PDF</Btn>
      </div>
      {SECCIONES.map(sec=>{
        const contenido = entrada.secciones[sec.id];
        return (
          <div key={sec.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,background:C.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:C.accent,fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600}}>{sec.icon} {sec.label}</span>
              {contenido&&<button onClick={()=>copiarSeccion(sec.id,contenido)} style={{background:"none",border:`1px solid ${copiado===sec.id?C.green:C.border}`,color:copiado===sec.id?C.green:C.muted,borderRadius:6,padding:"2px 10px",fontSize:10,cursor:"pointer",fontFamily:"'DM Mono',monospace"}}>{copiado===sec.id?"✓ OK":"COPIAR"}</button>}
            </div>
            <div style={{padding:14}}>
              {contenido
                ? <pre style={{margin:0,color:C.text,fontSize:12,lineHeight:1.8,fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{contenido}</pre>
                : <span style={{color:C.dim,fontSize:11,fontFamily:"'DM Mono',monospace"}}>Sin contenido</span>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── HISTORIAL VIEW ────────────────────────────────────────────────
function Historial({ historial, onEliminar, onVerPropuesta }) {
  const [expandido, setExpandido] = useState(null);
  const [copiado, setCopiado]     = useState(null);

  const copiarTodo = (entrada) => {
    const txt = `PROPUESTA TÉCNICA Y ECONÓMICA\n${"═".repeat(55)}\nLicitación: ${entrada.lic.nombre}\nOrganismo: ${entrada.lic.organismo}\nCódigo: ${entrada.lic.codigo}\nEmpresa: ${entrada.emp.nombre} | RUT: ${entrada.emp.rut}\nGenerado: ${new Date(entrada.fecha).toLocaleDateString("es-CL")}\n\n`
      + SECCIONES.map(s=>`${"═".repeat(55)}\n${s.icon} ${s.label.toUpperCase()}\n${"═".repeat(55)}\n\n${entrada.secciones[s.id]||"—"}\n\n`).join("\n");
    navigator.clipboard.writeText(txt);
    setCopiado(entrada.id);
    setTimeout(()=>setCopiado(null), 2000);
  };

  if (historial.length === 0) return (
    <div style={{padding:60,textAlign:"center"}}>
      <div style={{fontSize:52,marginBottom:16}}>📁</div>
      <h3 style={{color:C.text,margin:"0 0 8px",fontSize:16}}>Sin propuestas guardadas</h3>
      <p style={{color:C.muted,fontSize:13,maxWidth:300,margin:"0 auto",lineHeight:1.6}}>
        Cada propuesta que generes quedará guardada aquí automáticamente, incluso si cierras el navegador.
      </p>
    </div>
  );

  return (
    <div style={{padding:20,maxWidth:760,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <h2 style={{margin:"0 0 3px",fontSize:17}}>Historial de Propuestas</h2>
          <p style={{margin:0,color:C.muted,fontSize:12}}>{historial.length} propuesta{historial.length!==1?"s":""} guardada{historial.length!==1?"s":""} · guardado automático en este navegador</p>
        </div>
        <Pill color={C.green}>● LOCAL</Pill>
      </div>

      {historial.map(entrada => {
        const exp = expandido === entrada.id;
        const seccionesListas = Object.keys(entrada.secciones).length;
        return (
          <div key={entrada.id} style={{background:C.card,border:`1px solid ${exp?C.accent:C.border}`,borderRadius:13,marginBottom:10,overflow:"hidden",transition:"border-color .2s"}}>
            {/* Cabecera */}
            <div style={{padding:"14px 16px",display:"flex",gap:12,alignItems:"center",cursor:"pointer"}} onClick={()=>setExpandido(exp?null:entrada.id)}>
              <div style={{width:38,height:38,borderRadius:10,background:`${C.purple}18`,border:`1px solid ${C.purple}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✍️</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,color:C.text,fontWeight:600,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entrada.lic.nombre}</p>
                <p style={{margin:"3px 0 0",color:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{entrada.lic.organismo} · {entrada.emp.nombre} · {new Date(entrada.fecha).toLocaleDateString("es-CL")}</p>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                <span style={{color:C.muted,fontSize:11,fontFamily:"'DM Mono',monospace"}}>{seccionesListas}/8 secciones</span>
                <Pill color={seccionesListas===8?C.green:C.yellow}>{seccionesListas===8?"COMPLETA":"PARCIAL"}</Pill>
                <span style={{color:C.muted,fontSize:14}}>{exp?"▲":"▼"}</span>
              </div>
            </div>

            {/* Detalles expandidos */}
            {exp && (
              <div style={{borderTop:`1px solid ${C.border}`,padding:"14px 16px"}}>
                {/* Info rápida */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                  {[
                    ["Código",      entrada.lic.codigo||"—"],
                    ["Monto",       entrada.lic.monto ? fmt(parseInt(entrada.lic.monto)) : "—"],
                    ["Precio ofert.",entrada.emp.precio ? fmt(parseInt(entrada.emp.precio)) : "—"],
                    ["Rubro",       entrada.lic.rubro||"—"],
                    ["RUT empresa", entrada.emp.rut||"—"],
                    ["Generado",    new Date(entrada.fecha).toLocaleString("es-CL")],
                  ].map(([k,v])=>(
                    <div key={k} style={{background:C.surface,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.border}`}}>
                      <div style={{color:C.muted,fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:.5,marginBottom:2}}>{k.toUpperCase()}</div>
                      <div style={{color:C.text,fontSize:12,fontWeight:600}}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Secciones */}
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                  {SECCIONES.map(s=>(
                    <span key={s.id} style={{
                      background:entrada.secciones[s.id]?`${C.green}12`:`${C.dim}30`,
                      color:entrada.secciones[s.id]?C.green:C.muted,
                      border:`1px solid ${entrada.secciones[s.id]?C.green+"30":C.border}`,
                      borderRadius:6,padding:"3px 9px",fontSize:10,
                      fontFamily:"'DM Mono',monospace",
                    }}>{s.icon} {s.label}</span>
                  ))}
                </div>

                {/* Acciones */}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Btn variant="green" small onClick={()=>copiarTodo(entrada)}>
                    {copiado===entrada.id?"✓ COPIADO":"📋 COPIAR TODO"}
                  </Btn>
                  <Btn variant="ghost" small onClick={()=>onVerPropuesta(entrada)}>
                    👁 VER PROPUESTA
                  </Btn>
                  <Btn variant="ghost" small onClick={()=>{ if(window.confirm("¿Eliminar esta propuesta del historial?")) onEliminar(entrada.id); }}>
                    🗑 ELIMINAR
                  </Btn>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────
const LS_KEY = "licitia_historial_v1";

export default function App() {
  const [view, setView]             = useState("dashboard");
  const [licitaciones, setLicitaciones] = useState(MOCK);
  const [modoReal, setModoReal]     = useState(false);
  const [licPre, setLicPre]         = useState(null);
  const [historial, setHistorial]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
    catch { return []; }
  });
  const [verEntrada, setVerEntrada] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(historial)); }
    catch {}
  }, [historial]);

  const guardarPropuesta = (lic, emp, secciones) => {
    const nueva = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      lic, emp, secciones,
    };
    setHistorial(prev => [nueva, ...prev]);
  };

  const eliminarPropuesta = (id) => {
    setHistorial(prev => prev.filter(e => e.id !== id));
  };

  const verPropuesta = (entrada) => {
    setVerEntrada(entrada);
    setView("ver");
  };

  const irAPropuesta = (l) => {
    setLicPre(l);
    setView("propuesta");
  };

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div className="no-print" style={{background:"#070B12",borderBottom:`1px solid ${C.border}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:C.accent,boxShadow:`0 0 8px ${C.accent}`}}/>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:C.muted,letterSpacing:2}}>MERCADO PÚBLICO · SISTEMA IA</span>
          </div>
          <h1 style={{margin:0,fontSize:17,fontWeight:700,letterSpacing:.5}}>
            Licit<span style={{color:C.accent}}>IA</span>
            <span style={{color:C.muted,fontWeight:400,fontSize:13,marginLeft:8}}>— Detecta y gana licitaciones</span>
          </h1>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <Pill color={C.green}>Chile</Pill>
          <Pill color={C.accent}>v1.1</Pill>
        </div>
      </div>

      <Nav view={view} setView={setView} modoReal={modoReal} historialCount={historial.length}/>

      {view==="dashboard" && (
        <Dashboard
          licitaciones={licitaciones} setLicitaciones={setLicitaciones}
          modoReal={modoReal} setModoReal={setModoReal}
          onSelectForPropuesta={irAPropuesta}
        />
      )}
      {view==="propuesta" && (
        <Propuesta
          licitacionPre={licPre}
          onGuardar={guardarPropuesta}
          onIrHistorial={()=>setView("historial")}
        />
      )}
      {view==="historial" && (
        <Historial
          historial={historial}
          onEliminar={eliminarPropuesta}
          onVerPropuesta={verPropuesta}
        />
      )}
      {view==="ver" && verEntrada && (
        <VerPropuesta entrada={verEntrada} onVolver={()=>setView("historial")}/>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @media print{
          .no-print{display:none!important}
          .print-content{background:white!important;color:black!important;padding:20px}
          body{background:white!important;color:black!important}
          pre{color:black!important;font-size:11pt!important;line-height:1.6!important}
          .print-header{display:block!important;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px}
        }
        *{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:#2A3D55}
        select option{background:#0F1620;color:#E2EAF4}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#182030;border-radius:2px}
      `}</style>
    </div>
  );
}
