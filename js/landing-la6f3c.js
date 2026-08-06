// Detecta automáticamente si estamos en desarrollo local o en producción
const DASHBOARD_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://127.0.0.1:5500'
  : 'https://mercadoalerta.cl';

// Mismo patrón que dashboard.js — el backend vive en un subdominio propio en producción.
const API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  // Staging: cualquier hostname que contenga "staging" (ej. el nombre que
  // le pongas al Static Site de Render) apunta al backend de staging,
  // nunca al de producción — así no hace falta acordarse de configurar
  // esto a mano en cada deploy nuevo.
  : window.location.hostname.includes('staging')
  ? 'https://mercadoalertabackend-1.onrender.com'
  : 'https://api.mercadoalerta.cl';

document.querySelectorAll('.dashboard-link').forEach(a => {
  a.href = DASHBOARD_BASE + a.dataset.path;
});

// Decisiones de diseño/marketing (qué plan destacar, qué botones arrancan
// deshabilitados) — esto no es "información del plan" en el sentido de
// cuotas/precios, así que se queda acá. Los NÚMEROS de cada plan (cuántas
// alertas, cuánto cuesta, etc.) SÍ vienen del backend vía /api/planes, para
// no tener que volver a tocar este archivo cada vez que cambien un precio.
const DISENO_POR_PLAN = {
  trial: { destacado: true, disabled: false, textoBoton: 'Empezar Gratis' },
  basico: { destacado: false, disabled: true, textoBoton: 'Elegir Basic' },
  full: { destacado: false, disabled: true, textoBoton: 'Elegir Full' },
};

function formatCLP(numero) {
  return '$' + numero.toLocaleString('es-CL');
}

function armarFeaturesPlan(plan) {
  const items = [
    `Hasta <strong>${plan.limiteAlertas} alertas</strong> activas`,
    `Hasta <strong>${plan.limiteBusquedas} búsquedas</strong> preconfiguradas`,
    `Hasta <strong>${plan.limiteRecordatorios} recordatorios</strong> de cierre`,
    `Hasta <strong>${plan.limiteSeguimientos} seguimientos</strong> de procesos`,
    `Alertas por <strong>${plan.mensajeria}</strong>`,
  ];
  // El cupo es 10x limiteAlertas (ver spec: tope WhatsApp) — se calcula acá
  // en vez de venir del backend porque es una regla derivada, no un campo
  // propio de PLANES; si el múltiplo cambia después de calibrar con datos
  // reales, este archivo también hay que actualizarlo.
  if (plan.mensajeria?.includes('WhatsApp')) {
    items.push(`Hasta <strong>${plan.limiteAlertas * 10} notificaciones por WhatsApp</strong> al mes`);
  }
  if (plan.detalleAnalisisPrecios === 'completo') items.push('<strong>Análisis de precios</strong> de Mercado Público, con detalle por proveedor y organismo');
  else if (plan.accesoAnalisisPrecios) items.push('<strong>Análisis de precios</strong> de Mercado Público (rango de precios)');
  if (plan.limitePortafolio) items.push(`Portafolio (hasta <strong>${plan.limitePortafolio} ítems</strong>, para probar)`);
  else if (plan.portafolio) items.push('Portafolio <strong>Ilimitado</strong>');
  items.push(`<strong>${plan.limiteAnalisisIA} análisis</strong> de procesos con IA al mes`);
  if (!plan.requierePago) items.push('Sin tarjeta de crédito');
  return items.map((texto) => `<li>${texto}</li>`).join('');
}

function armarTarjetaPlan(clave, plan) {
  const diseno = DISENO_POR_PLAN[clave] || { destacado: false, disabled: false, textoBoton: `Elegir ${plan.nombreDisplay}` };

  const precioHtml = !plan.requierePago
    ? `<div class="price-now"><span class="price-amount">Gratis</span></div>
       <div class="price-later">Por ${plan.diasTrial} días · luego puedes elegir Basic o Full para seguir usándolo</div>`
    : `<div class="price-now"><span class="price-amount">${formatCLP(plan.monto)}</span><span class="price-period">CLP / mes</span></div>
       <div class="price-later">${plan.montoRegular && plan.montoRegular !== plan.monto ? `Precio normal ${formatCLP(plan.montoRegular)} CLP/mes · IVA incluido` : 'IVA incluido'}</div>`;

  const stampHtml = plan.montoRegular && plan.montoRegular !== plan.monto
    ? '<div class="price-stamp">OFERTA DE LANZAMIENTO</div>'
    : '';

  return `
    <div class="price-card${diseno.destacado ? ' destacado' : ''}">
      ${stampHtml}
      <div class="price-plan-name">${plan.nombreDisplay}</div>
      <div class="price-plan-desc">${plan.descripcion}</div>
      ${precioHtml}
      <ul class="price-features">${armarFeaturesPlan(plan)}</ul>
      <a href="https://mercadoalerta.cl/register.html?plan=${clave}" class="btn ${diseno.destacado ? 'btn-primary' : 'btn-ghost'} dashboard-link${diseno.disabled ? ' btn-deshabilitado' : ''}" data-path="/register.html?plan=${clave}"${diseno.disabled ? ' disabled="true"' : ''}>${diseno.textoBoton}</a>
    </div>
  `;
}

async function cargarPlanes() {
  const contenedor = document.getElementById('pricingGrid');
  try {
    const res = await fetch(`${API_BASE}/api/planes`);
    if (!res.ok) throw new Error('No se pudo cargar la información de planes.');
    const { planes } = await res.json();

    contenedor.innerHTML = Object.entries(planes)
      .map(([clave, plan]) => armarTarjetaPlan(clave, plan))
      .join('');

    // Los links recién armados también necesitan el dashboard_base correcto.
    contenedor.querySelectorAll('.dashboard-link').forEach((a) => {
      a.href = DASHBOARD_BASE + a.dataset.path;
    });
  } catch (err) {
    contenedor.innerHTML = '<div class="price-card"><div class="price-plan-desc">No pudimos cargar los planes en este momento. Actualiza la página o vuelve a intentar más tarde.</div></div>';
  }
}
cargarPlanes();

const tickerData = [
  { codigo: '1002772-59-LR26', nombre: 'Suministro de mobiliario escolar', extra: 'Municipalidad de Talca' },
  { codigo: 'CA-3390-2026', nombre: 'Insumos de aseo y limpieza', extra: 'Hospital Regional de Rancagua' },
  { codigo: '588809-165-COT26', nombre: 'Insumos computacionales', extra: 'Corp. Municipal de Talagante' },
  { codigo: '5542-78-COT26', nombre: 'Servicio de traducción español-inglés', extra: 'Universidad de Chile' },
  { codigo: 'CA-4471-2026', nombre: 'Arriendo de equipos audiovisuales', extra: 'Municipalidad de Providencia' },
  { codigo: '2322-433-COT26', nombre: 'Islas de reciclaje', extra: 'Municipalidad de Vallenar' },
];
const track = document.getElementById('tickerTrack');
const buildTicker = () => tickerData.map(i =>
  `<div class="ticker-item"><span class="codigo">${i.codigo}</span> · <span class="nombre">${i.nombre}</span> · ${i.extra}</div>`
).join('');
track.innerHTML = buildTicker() + buildTicker();

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
});
navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Abrir menú');
}));
document.addEventListener('click', (e) => {
  if (!navLinks.contains(e.target) && e.target !== navToggle && !navToggle.contains(e.target)) {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menú');
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
