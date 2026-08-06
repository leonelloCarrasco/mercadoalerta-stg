// Detecta automáticamente si estamos en desarrollo local o en producción
const DASHBOARD_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://127.0.0.1:5500'
  : 'https://mercadoalerta.cl';

document.querySelectorAll('.dashboard-link').forEach(a => {
  a.href = DASHBOARD_BASE + a.dataset.path;
});

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

const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
