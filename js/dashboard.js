const API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  // Staging: cualquier hostname que contenga "staging" (ej. el nombre que
  // le pongas al Static Site de Render) apunta al backend de staging,
  // nunca al de producción — así no hace falta acordarse de configurar
  // esto a mano en cada deploy nuevo.
  : window.location.hostname.includes('staging')
  ? 'https://mercadoalertabackend-1.onrender.com'
  : 'https://api.mercadoalerta.cl';

const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

function showError(msg) {
  const el = document.getElementById('errorBanner');
  el.textContent = "❌ " + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showErrorAlertas(msg) {
  const el = document.getElementById('errorBannerAlertas');
  el.textContent = "❌ " + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showErrorNotificaciones(msg) {
  const el = document.getElementById('errorBannerNotificaciones');
  el.textContent = "❌ " + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showErrorBusquedas(msg) {
  const el = document.getElementById('errorBannerBusquedas');
  el.textContent = "❌ " + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showErrorBusquedasOp(msg) {
  const el = document.getElementById('errorBannerBusquedasOp');
  el.textContent = "❌ " + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showErrorModal(msg) {
  const el = document.getElementById('errorBannerModal');
  el.textContent = "❌ " + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showErrorBubble(target, msg) {
  const bubble = document.createElement('div');
  bubble.className = 'error-bubble';
  bubble.textContent = "❌ " + msg;
  document.body.appendChild(bubble);

  const rect = target.getBoundingClientRect();
  bubble.style.left = `${rect.left + rect.width / 2}px`;
  bubble.style.top = `${rect.top - 10}px`;

  setTimeout(() => bubble.remove(), 4000);
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...authHeaders, ...(options.headers || {}) } });
  if (res.status === 401) {
    localStorage.removeItem('token'); localStorage.removeItem('lastActivityAt');
    window.location.href = 'login.html';
    throw new Error('Sesión inválida');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * Escapa HTML antes de insertar texto de origen externo/usuario dentro de un
 * innerHTML — sin esto, un nombre de organismo, una nota de Portafolio, o el
 * resumen/checklist que devuelve la IA (que a su vez procesa un archivo que
 * el usuario sube) podría contener HTML/script que se ejecuta en el
 * navegador de quien lo mire (XSS). Se usa en TODO texto que no sea 100%
 * fijo del propio template — nombres/organismos que vienen de la API de
 * Mercado Público, notas escritas a mano, y cualquier campo del resultado
 * de Análisis de Procesos con IA.
 */
function escapeHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(n) {
  if (n === null || n === undefined) return 'No especificado';
  return '$' + Number(n).toLocaleString('es-CL');
}

// Formatea a "xx.xxx.xxx-x": "761234285" -> "76.123.428-5"
function formatearRut(valor) {
  const limpio = String(valor || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (!limpio) return '';

  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dv = limpio.slice(-1);
  return cuerpo ? `${cuerpo}-${dv}` : dv;
}

function etiquetaNivel(nivel) {
  if (nivel === 'categoria') return 'Rubro';
  if (nivel === 'obra') return 'Obra';
  return 'Producto';
}

// Con pocas regiones las lista todas; con muchas resume en un contador que
// se puede tocar/clickear para expandir el detalle completo — evita que el
// texto se desborde en el .row-meta, y a diferencia de un tooltip nativo
// (title) sí funciona en mobile, donde no hay hover.
// Criterio exclusivo de Compra Ágil (migración 029) — muestra el rango como
// corresponda según qué extremos estén definidos.
function formatearMontoTag(montoMinimo, montoMaximo) {
  if (!montoMinimo && !montoMaximo) return '';
  if (montoMinimo && montoMaximo) return `<br><span>Monto C.A.: ${formatMoney(montoMinimo)} – ${formatMoney(montoMaximo)}</span>`;
  if (montoMinimo) return `<br><span>Monto mín: ${formatMoney(montoMinimo)}</span>`;
  return `<br><span>Monto máx: ${formatMoney(montoMaximo)}</span>`;
}

function formatearRegionesTag(regiones) {
  if (!regiones || regiones.length === 0) return '<br><span>Todas las regiones</span>';
  if (regiones.length <= 2) return `<br><span>Regiones: ${regiones.join(', ')}</span>`;

  const resumen = `Regiones: ${regiones.length} seleccionadas`;
  const completo = `Regiones: ${regiones.join(', ')}`.replace(/"/g, '&quot;');
  return `<br><span class="regiones-toggle" data-resumen="${resumen}" data-completo="${completo}" style="border-bottom: 1px dotted var(--text-muted); cursor: pointer;">${resumen}</span>`;
}

// Solo se muestra si NO son ambos (ambos = el caso por defecto, no aporta info extra).
function formatearTipoProcesoTag(tiposProceso) {
  if (!tiposProceso || tiposProceso.length === 0 || tiposProceso.length === 2) return '';
  const etiquetas = { licitacion: 'Solo Licitaciones', compra_agil: 'Solo Compras Ágiles' };
  return `<br><span>${etiquetas[tiposProceso[0]] || tiposProceso[0]}</span>`;
}

function formatearTramosTag(tramos) {
  if (!tramos || tramos.length === 0) return '';
  if (tramos.length <= 3) return `<br><span>Tramos Lic.: ${tramos.join(', ')}</span>`;

  const resumen = `Tramos: ${tramos.length} seleccionados`;
  const completo = `Tramos: ${tramos.join(', ')}`.replace(/"/g, '&quot;');
  return `<br><span class="regiones-toggle" data-resumen="${resumen}" data-completo="${completo}" style="border-bottom: 1px dotted var(--text-muted); cursor: pointer;">${resumen}</span>`;
}

function formatearOrganismosTag(organismos) {
  if (!organismos || organismos.length === 0) return '';
  if (organismos.length === 1) return `<br><span>Organismo: ${organismos[0]}</span>`;

  const resumen = `Organismos: ${organismos.length} seleccionados`;
  const completo = `Organismos: ${organismos.join(', ')}`.replace(/"/g, '&quot;');
  return `<br><span class="regiones-toggle" data-resumen="${resumen}" data-completo="${completo}" style="border-bottom: 1px dotted var(--text-muted); cursor: pointer;">${resumen}</span>`;
}

function formatMontoConTramo(h) {
  if (h.monto !== null && h.monto !== undefined) return formatMoney(h.monto);
  if (h.monto_utm_min) {
    return h.monto_utm_max
      ? `Entre ${h.monto_utm_min} y ${h.monto_utm_max} UTM`
      : `Desde ${h.monto_utm_min} UTM`;
  }
  return 'No especificado';
}

function formatDate(iso) {
  if (!iso) return 'No especificada';
  try {
    return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// Extrae "YYYY-MM-DD" en hora LOCAL (no UTC) — hace falta para que los filtros
// de fecha comparen contra el mismo día que el usuario ve en pantalla (formatDate
// de arriba también usa hora local). Comparar contra iso.slice(0,10) directo
// compara en UTC, que puede ser un día distinto al que se muestra en Chile.
function fechaLocalISO(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function soloDigitos(valor) {
  return valor.replace(/\D/g, '');
}

function formatearMiles(valor) {
  const digitos = soloDigitos(valor);
  if (!digitos) return '';
  return '$' + Number(digitos).toLocaleString('es-CL');
}

function registrarInputMonto(id) {
  const input = document.getElementById(id);
  input.addEventListener('input', () => {
    input.value = formatearMiles(input.value);
  });
  return input;
}

const montoMinimoInput = registrarInputMonto('montoMinimo');
const montoMaximoInput = registrarInputMonto('montoMaximo');

const regionDropdownBtn = document.getElementById('regionDropdownBtn');
const regionDropdownPanel = document.getElementById('regionDropdownPanel');
const filtroRegionConfigSelect = document.getElementById('filtroRegionConfig');
const filtroRegionHistSelect = document.getElementById('filtroRegionHist');
const tramoDropdownBtn = document.getElementById('tramoDropdownBtn');
const tramoDropdownPanel = document.getElementById('tramoDropdownPanel');
const tipoProcesoLicitacionChk = document.getElementById('tipoProcesoLicitacion');
const tipoProcesoCompraAgilChk = document.getElementById('tipoProcesoCompraAgil');

// --- Buscador de categorías (chips) ---
let categoriasSeleccionadas = []; // [{ codigo, titulo }]
const categoriaBuscarInput = document.getElementById('categoriaBuscar');
const categoriaResultadosEl = document.getElementById('categoriaResultados');
const categoriasChipsEl = document.getElementById('categoriasChips');
let categoriaBuscarTimeout = null;

function renderCategoriasChips() {
  categoriasChipsEl.innerHTML = categoriasSeleccionadas.map((c) => `
    <span class="categoria-chip" data-codigo="${c.codigo}">
      ${escapeHtml(c.titulo)} <span class="nivel-badge ${c.nivel}">${c.nivel === 'categoria' ? 'Rub.' : 'Prod.'}</span> <span class="cod">(${c.codigo})</span>
      <span class="quitar" data-quitar="${c.codigo}">✕</span>
    </span>
  `).join('');

  categoriasChipsEl.querySelectorAll('[data-quitar]').forEach((el) => {
    el.addEventListener('click', () => {
      categoriasSeleccionadas = categoriasSeleccionadas.filter((c) => c.codigo !== el.dataset.quitar);
      renderCategoriasChips();
    });
  });

  actualizarNotaLimiteCategorias();
}

/**
 * El máximo de categorías/productos por alerta depende del plan
 * (limiteCategorias, ver planes.js — Trial 1, Basic 2, Full 3): un segundo
 * eje de valor entre planes además de las cantidades. obtenerPlanesData()
 * ya cachea el resultado de /api/planes, así que llamarlo acá en cada
 * chip no pega a la red más que la primera vez.
 */
async function limiteCategoriasDelPlan() {
  try {
    const planes = await obtenerPlanesData();
    return planes?.[window.usuarioActual?.plan]?.limiteCategorias ?? 1;
  } catch (err) {
    return 1;
  }
}

async function actualizarNotaLimiteCategorias() {
  const nota = document.getElementById('categoriasLimiteMsg');
  if (!nota) return;
  const limite = await limiteCategoriasDelPlan();
  if (categoriasSeleccionadas.length >= limite) {
    nota.textContent = `Llegaste al máximo de tu plan: ${limite} producto${limite === 1 ? '' : 's'} o rubro${limite === 1 ? '' : 's'} por alerta.`;
  } else {
    nota.textContent = `Puedes agregar hasta ${limite} producto${limite === 1 ? '' : 's'} o rubro${limite === 1 ? '' : 's'} por alerta (llevas ${categoriasSeleccionadas.length}).`;
  }
}

async function agregarCategoria(codigo, titulo, nivel) {
  if (categoriasSeleccionadas.some((c) => c.codigo === codigo)) return; // ya está agregada, no duplicar

  const limite = await limiteCategoriasDelPlan();
  if (categoriasSeleccionadas.length >= limite) {
    showError(`Tu plan permite hasta ${limite} producto${limite === 1 ? '' : 's'} o rubro${limite === 1 ? '' : 's'} por alerta. Quita uno para agregar otro.`);
    return;
  }

  categoriasSeleccionadas = [...categoriasSeleccionadas, { codigo, titulo, nivel }];
  renderCategoriasChips();
}

categoriaBuscarInput.addEventListener('input', () => {
  clearTimeout(categoriaBuscarTimeout);
  const texto = categoriaBuscarInput.value.trim();

  if (texto.length < 2) {
    categoriaResultadosEl.classList.remove('open');
    return;
  }

  categoriaBuscarTimeout = setTimeout(async () => {
    try {
      // nivel=producto: en este modo del buscador solo interesan productos
      // puntuales — para elegir un rubro completo está la pestaña "Explorar por rubro".
      const data = await apiFetch(`/api/alerts/categorias/buscar?q=${encodeURIComponent(texto)}&nivel=producto`);
      if (data.resultados.length === 0) {
        categoriaResultadosEl.innerHTML = '<div class="categoria-resultado-vacio">Sin resultados</div>';
      } else {
        categoriaResultadosEl.innerHTML = data.resultados.map((r) => `
          <div class="categoria-resultado-item" data-codigo="${r.codigo}" data-titulo="${r.titulo.replace(/"/g, '&quot;')}" data-nivel="${r.nivel}">
            <span>${escapeHtml(r.titulo)} <span class="nivel-badge ${r.nivel}">${r.nivel === 'categoria' ? 'Rubro' : r.nivel === 'obra' ? 'Obra' : 'Producto'}</span></span>
            <span class="cod">${r.codigo}</span>
          </div>
        `).join('');

        categoriaResultadosEl.querySelectorAll('[data-codigo]').forEach((el) => {
          el.addEventListener('click', () => {
            agregarCategoria(el.dataset.codigo, el.dataset.titulo, el.dataset.nivel);
            categoriaBuscarInput.value = '';
            categoriaResultadosEl.classList.remove('open');
          });
        });
      }
      categoriaResultadosEl.classList.add('open');
    } catch (err) {
      console.warn('Error buscando productos o rubros:', err.message);
    }
  }, 300);
});

document.addEventListener('click', (e) => {
  if (!categoriaBuscarInput.contains(e.target) && !categoriaResultadosEl.contains(e.target)) {
    categoriaResultadosEl.classList.remove('open');
  }
});

// --- Buscador de rubro/producto de SELECCIÓN ÚNICA, para los filtros de las
// tablas de Alertas y Notificaciones (misma lógica de búsqueda del modal de
// nueva alerta — /api/alerts/categorias/buscar — pero sin restringir a
// "producto": acá interesa poder filtrar tanto por rubro como por producto
// puntual, y sin chips: al elegir un resultado, el input se llena con el
// título elegido, listo para usarse en el filtro). Se instancia una vez por
// cada campo (Alertas y Notificaciones) más abajo.
function crearBuscadorCategoriaUnico(inputId, resultadosId, alCambiar) {
  const input = document.getElementById(inputId);
  const resultadosEl = document.getElementById(resultadosId);
  let seleccion = null; // { codigo, nivel } o null si no hay selección/no calza con el catálogo
  let timeout = null;

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    seleccion = null;
    alCambiar(seleccion);
    const texto = input.value.trim();

    if (texto.length < 2) {
      resultadosEl.classList.remove('open');
      return;
    }

    timeout = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/alerts/categorias/buscar?q=${encodeURIComponent(texto)}`);
        resultadosEl.innerHTML = data.resultados.length === 0
          ? '<div class="categoria-resultado-vacio">Sin resultados</div>'
          : data.resultados.map((r) => `
              <div class="categoria-resultado-item" data-codigo="${r.codigo}" data-titulo="${r.titulo.replace(/"/g, '&quot;')}" data-nivel="${r.nivel}">
                <span>${escapeHtml(r.titulo)} <span class="nivel-badge ${r.nivel}">${r.nivel === 'categoria' ? 'Rubro' : r.nivel === 'obra' ? 'Obra' : 'Producto'}</span></span>
                <span class="cod">${r.codigo}</span>
              </div>
            `).join('');

        resultadosEl.querySelectorAll('[data-codigo]').forEach((el) => {
          el.addEventListener('click', () => {
            seleccion = { codigo: el.dataset.codigo, nivel: el.dataset.nivel };
            input.value = el.dataset.titulo;
            resultadosEl.classList.remove('open');
            alCambiar(seleccion);
          });
        });
        resultadosEl.classList.add('open');
      } catch (err) {
        console.warn('Error buscando rubro o producto:', err.message);
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultadosEl.contains(e.target)) {
      resultadosEl.classList.remove('open');
    }
  });

  return {
    limpiar() {
      seleccion = null;
      input.value = '';
      resultadosEl.classList.remove('open');
    },
  };
}

// Compara el código elegido en el filtro contra un código guardado (de una
// alerta o de una notificación): si el filtro es un PRODUCTO puntual, exige
// coincidencia exacta; si es un RUBRO, compara solo los primeros 6 dígitos
// (nivel de categoría UNSPSC), para que capture cualquier producto de ese
// rubro además del propio rubro. Simplificación: no expande la jerarquía
// completa vía el árbol de rubros (como sí hace el backend en matching.service.js),
// alcanza para un filtro rápido en pantalla.
function coincideConFiltroCategoria(codigoGuardado, filtroSeleccion) {
  if (!filtroSeleccion || !codigoGuardado) return true;
  if (filtroSeleccion.nivel === 'producto') return String(codigoGuardado) === filtroSeleccion.codigo;
  return String(codigoGuardado).slice(0, 6) === filtroSeleccion.codigo.slice(0, 6);
}

let filtroCategoriaConfigSeleccion = null;
const buscadorCategoriaConfig = crearBuscadorCategoriaUnico('filtroCategoriaConfig', 'filtroCategoriaConfigResultados', (sel) => {
  filtroCategoriaConfigSeleccion = sel;
  configsPaginaActual = 1;
  renderConfigs();
});

let filtroCategoriaHistSeleccion = null;
const buscadorCategoriaHist = crearBuscadorCategoriaUnico('filtroCategoriaHist', 'filtroCategoriaHistResultados', (sel) => {
  filtroCategoriaHistSeleccion = sel;
  historialPaginaActual = 1;
  renderHistorial();
});

// --- Factory genérico para el modal de "Nueva Búsqueda" ---
// El modal de "Nueva Alerta" ya tiene su propio selector de organismo hecho a
// mano (organismoBuscar...) — para no duplicar exactamente esa misma lógica
// una tercera vez, este factory generaliza el mismo patrón visual (buscador
// con autocompletado + chips) para poder instanciarlo también en el modal de
// búsquedas sin repetir código.

// Buscador con autocompletado + selección MÚLTIPLE en chips (mismo patrón que
// el organismoBuscar del modal de alertas, generalizado para reusarlo acá).
function crearBuscadorMultiple(inputId, resultadosId, chipsId, apiPath, { soloUno = false } = {}) {
  const input = document.getElementById(inputId);
  const resultadosEl = document.getElementById(resultadosId);
  const chipsEl = document.getElementById(chipsId);
  let seleccionados = [];
  let timeout = null;

  function renderChips() {
    chipsEl.innerHTML = seleccionados.map((o) => `
      <span class="categoria-chip" data-organismo="${o.replace(/"/g, '&quot;')}">
        ${escapeHtml(o)}
        <span class="quitar" data-quitar="${o.replace(/"/g, '&quot;')}">✕</span>
      </span>
    `).join('');
    chipsEl.querySelectorAll('[data-quitar]').forEach((el) => {
      el.addEventListener('click', () => {
        seleccionados = seleccionados.filter((o) => o !== el.dataset.quitar);
        renderChips();
      });
    });
  }

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    const texto = input.value.trim();
    if (texto.length < 2) {
      resultadosEl.classList.remove('open');
      return;
    }
    timeout = setTimeout(async () => {
      try {
        const data = await apiFetch(`${apiPath}?q=${encodeURIComponent(texto)}`);
        const disponibles = data.resultados.filter((o) => !seleccionados.includes(o));
        resultadosEl.innerHTML = disponibles.length === 0
          ? '<div class="categoria-resultado-vacio">Sin resultados</div>'
          : disponibles.map((o) => `<div class="categoria-resultado-item" data-organismo="${o.replace(/"/g, '&quot;')}"><span>${escapeHtml(o)}</span></div>`).join('');

        resultadosEl.querySelectorAll('[data-organismo]').forEach((el) => {
          el.addEventListener('click', () => {
            seleccionados = soloUno ? [el.dataset.organismo] : [...seleccionados, el.dataset.organismo];
            renderChips();
            input.value = '';
            resultadosEl.classList.remove('open');
          });
        });
        resultadosEl.classList.add('open');
      } catch (err) {
        console.warn('Error buscando:', err.message);
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultadosEl.contains(e.target)) {
      resultadosEl.classList.remove('open');
    }
  });

  return {
    get: () => [...seleccionados],
    reset: () => { seleccionados = []; renderChips(); input.value = ''; },
  };
}

// --- Tabs "Buscar producto" / "Explorar por rubro" ---
const categoriaModoTabs = document.getElementById('categoriaModoTabs');
const categoriaModoProducto = document.getElementById('categoriaModoProducto');
const categoriaModoRubro = document.getElementById('categoriaModoRubro');

categoriaModoTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.categoria-modo-tab');
  if (!tab) return;

  categoriaModoTabs.querySelectorAll('.categoria-modo-tab').forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');

  const esRubro = tab.dataset.modo === 'rubro';
  categoriaModoProducto.style.display = esRubro ? 'none' : '';
  categoriaModoRubro.style.display = esRubro ? '' : 'none';
  categoriaResultadosEl.classList.remove('open');
  rubroArbolPanel.classList.remove('open');

  if (esRubro) cargarArbolRubros(); // lazy: solo se pide la primera vez que se abre esta pestaña
});

// --- Árbol de rubros (Segmento > Familia > Rubro), modo "Explorar por rubro" ---
// El usuario conoce el concepto "Rubro" (nivel 3 de UNSPSC) mejor que "Categoría":
// al elegir un rubro, la alerta aplica a TODOS los productos de ese rubro (el
// backend ya matchea por prefijo de código, ver matching.service.js).
const rubroArbolBtn = document.getElementById('rubroArbolBtn');
const rubroArbolPanel = document.getElementById('rubroArbolPanel');
let arbolRubrosData = null; // cacheado en memoria mientras dura la sesión del dashboard

function renderArbolRubros(filtro = '') {
  const filtroNorm = filtro.trim().toLowerCase();

  const html = arbolRubrosData.map((segmento) => {
    const familiasHtml = segmento.familias.map((familia) => {
      const rubrosFiltrados = filtroNorm
        ? familia.rubros.filter((r) => r.titulo.toLowerCase().includes(filtroNorm))
        : familia.rubros;
      if (rubrosFiltrados.length === 0) return '';

      const hojasHtml = rubrosFiltrados.map((r) => `
        <div class="rubro-hoja" data-codigo="${r.codigo}" data-titulo="${r.titulo.replace(/"/g, '&quot;')}">${escapeHtml(r.titulo)}</div>
      `).join('');

      // Con filtro activo, se abren automáticamente las ramas que tienen resultados.
      return `
        <details class="rubro-familia" ${filtroNorm ? 'open' : ''}>
          <summary>${familia.familia}</summary>
          ${hojasHtml}
        </details>
      `;
    }).join('');

    if (!familiasHtml.trim()) return '';

    return `
      <details class="rubro-segmento" ${filtroNorm ? 'open' : ''}>
        <summary>${segmento.segmento}</summary>
        ${familiasHtml}
      </details>
    `;
  }).join('');

  rubroArbolPanel.innerHTML = `
    <input type="text" id="rubroArbolBuscar" class="rubro-arbol-buscar" placeholder="Filtrar rubros..." value="${filtro.replace(/"/g, '&quot;')}">
    <div id="rubroArbolContenido">${html.trim() ? html : '<div class="rubro-arbol-vacio">Sin rubros que coincidan</div>'}</div>
  `;

  rubroArbolPanel.querySelectorAll('.rubro-hoja').forEach((el) => {
    el.addEventListener('click', () => {
      agregarCategoria(el.dataset.codigo, el.dataset.titulo, 'categoria');
      rubroArbolPanel.classList.remove('open');
    });
  });

  const buscarInput = document.getElementById('rubroArbolBuscar');
  buscarInput.addEventListener('click', (e) => e.stopPropagation());
  buscarInput.addEventListener('input', () => renderArbolRubros(buscarInput.value));
  // Mantiene el foco en el campo de filtro entre renders (se pierde al reemplazar innerHTML).
  buscarInput.focus();
  buscarInput.setSelectionRange(buscarInput.value.length, buscarInput.value.length);
}

async function cargarArbolRubros() {
  if (!arbolRubrosData) {
    rubroArbolPanel.innerHTML = '<div class="rubro-arbol-vacio">Cargando rubros...</div>';
    rubroArbolPanel.classList.add('open');
    try {
      const data = await apiFetch('/api/alerts/categorias/arbol');
      arbolRubrosData = data.arbol;
    } catch (err) {
      rubroArbolPanel.innerHTML = `<div class="rubro-arbol-vacio">Error al cargar los rubros: ${err.message}</div>`;
      return;
    }
  }
  renderArbolRubros();
}

rubroArbolBtn.addEventListener('click', () => {
  const abrir = !rubroArbolPanel.classList.contains('open');
  if (abrir) cargarArbolRubros();
  rubroArbolPanel.classList.toggle('open', abrir);
});

document.addEventListener('click', (e) => {
  if (!rubroArbolBtn.contains(e.target) && !rubroArbolPanel.contains(e.target)) {
    rubroArbolPanel.classList.remove('open');
  }
});

// Vuelve el selector de categoría a su estado inicial (pestaña "Buscar producto")
// al abrir/cerrar el modal de nueva alerta.
function resetCategoriaSelector() {
  categoriaModoTabs.querySelectorAll('.categoria-modo-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  categoriaModoProducto.style.display = '';
  categoriaModoRubro.style.display = 'none';
  categoriaBuscarInput.value = '';
  categoriaResultadosEl.classList.remove('open');
  rubroArbolPanel.classList.remove('open');
}

// --- Selector múltiple de regiones (checkboxes dentro de un desplegable) ---
// Vacío/ninguna marcada = "todas las regiones" (así lo interpreta el backend).
let regionesDisponibles = [];
let regionesSeleccionadas = new Set();

function actualizarTextoRegionDropdown() {
  if (regionesSeleccionadas.size === 0) {
    regionDropdownBtn.innerHTML = '<span class="placeholder">Todas las regiones</span>';
  } else if (regionesSeleccionadas.size <= 2) {
    regionDropdownBtn.textContent = [...regionesSeleccionadas].join(', ');
  } else {
    regionDropdownBtn.textContent = `${regionesSeleccionadas.size} regiones seleccionadas`;
  }
}

function renderRegionDropdownPanel() {
  const opciones = regionesDisponibles.map((r) => `
    <label class="region-checkbox-item">
      <input type="checkbox" value="${r}" ${regionesSeleccionadas.has(r) ? 'checked' : ''}>
      <span>${r}</span>
    </label>
  `).join('');

  regionDropdownPanel.innerHTML = `
    <div class="region-dropdown-actions">
      <button type="button" id="regionSeleccionarTodas">Seleccionar todas</button>
      <button type="button" id="regionLimpiarSeleccion">Limpiar</button>
    </div>
    ${opciones}
  `;

  regionDropdownPanel.querySelectorAll('input[type="checkbox"]').forEach((chk) => {
    chk.addEventListener('change', () => {
      if (chk.checked) regionesSeleccionadas.add(chk.value);
      else regionesSeleccionadas.delete(chk.value);
      actualizarTextoRegionDropdown();
    });
  });

  document.getElementById('regionSeleccionarTodas').addEventListener('click', () => {
    regionesSeleccionadas = new Set(regionesDisponibles);
    renderRegionDropdownPanel();
    actualizarTextoRegionDropdown();
  });
  document.getElementById('regionLimpiarSeleccion').addEventListener('click', () => {
    regionesSeleccionadas = new Set();
    renderRegionDropdownPanel();
    actualizarTextoRegionDropdown();
  });
}

function resetRegionDropdown() {
  regionesSeleccionadas = new Set();
  actualizarTextoRegionDropdown();
  renderRegionDropdownPanel();
}

regionDropdownBtn.addEventListener('click', () => {
  const abrir = !regionDropdownPanel.classList.contains('open');
  regionDropdownPanel.classList.toggle('open', abrir);
  regionDropdownBtn.classList.toggle('open', abrir);
});

document.addEventListener('click', (e) => {
  if (!regionDropdownBtn.contains(e.target) && !regionDropdownPanel.contains(e.target)) {
    regionDropdownPanel.classList.remove('open');
    regionDropdownBtn.classList.remove('open');
  }
});

async function cargarRegiones() {
  try {
    const data = await apiFetch('/api/alerts/regiones');
    regionesDisponibles = data.regiones;
    renderRegionDropdownPanel();
    actualizarTextoRegionDropdown();

    const opciones = data.regiones.map(r => `<option value="${r}">${r}</option>`).join('');
    filtroRegionConfigSelect.innerHTML = '<option value="">Todas las regiones</option>' + opciones;
    filtroRegionHistSelect.innerHTML = '<option value="">Todas las regiones</option>' + opciones;
    busquedaRegionSelect.innerHTML = '<option value="">Todas las regiones</option>' + opciones;
  } catch (err) {
    console.warn('No se pudieron cargar las regiones:', err.message);
  }
}

// --- Tipo de Licitación (tramo UTM) — mismo patrón de checkboxes que regiones,
// pero cada opción tiene un código (L1, LE, LP...) distinto de su etiqueta visible. ---
let tramosDisponibles = []; // [{codigo, descripcion}]
let tramosSeleccionados = new Set(); // set de códigos

function actualizarTextoTramoDropdown() {
  if (tramosSeleccionados.size === 0) {
    tramoDropdownBtn.innerHTML = '<span class="placeholder">Todos los tramos</span>';
  } else if (tramosSeleccionados.size <= 3) {
    tramoDropdownBtn.textContent = [...tramosSeleccionados].join(', ');
  } else {
    tramoDropdownBtn.textContent = `${tramosSeleccionados.size} tramos seleccionados`;
  }
}

function renderTramoDropdownPanel() {
  const opciones = tramosDisponibles.map((t) => `
    <label class="region-checkbox-item">
      <input type="checkbox" value="${t.codigo}" ${tramosSeleccionados.has(t.codigo) ? 'checked' : ''}>
      <span>${t.codigo} — ${t.descripcion}</span>
    </label>
  `).join('');

  tramoDropdownPanel.innerHTML = `
    <div class="region-dropdown-actions">
      <button type="button" id="tramoSeleccionarTodos">Seleccionar todos</button>
      <button type="button" id="tramoLimpiarSeleccion">Limpiar</button>
    </div>
    ${opciones}
  `;

  tramoDropdownPanel.querySelectorAll('input[type="checkbox"]').forEach((chk) => {
    chk.addEventListener('change', () => {
      if (chk.checked) tramosSeleccionados.add(chk.value);
      else tramosSeleccionados.delete(chk.value);
      actualizarTextoTramoDropdown();
    });
  });

  document.getElementById('tramoSeleccionarTodos').addEventListener('click', () => {
    tramosSeleccionados = new Set(tramosDisponibles.map((t) => t.codigo));
    renderTramoDropdownPanel();
    actualizarTextoTramoDropdown();
  });
  document.getElementById('tramoLimpiarSeleccion').addEventListener('click', () => {
    tramosSeleccionados = new Set();
    renderTramoDropdownPanel();
    actualizarTextoTramoDropdown();
  });
}

function resetTramoDropdown() {
  tramosSeleccionados = new Set();
  actualizarTextoTramoDropdown();
  renderTramoDropdownPanel();
}

tramoDropdownBtn.addEventListener('click', () => {
  const abrir = !tramoDropdownPanel.classList.contains('open');
  tramoDropdownPanel.classList.toggle('open', abrir);
  tramoDropdownBtn.classList.toggle('open', abrir);
});

document.addEventListener('click', (e) => {
  if (!tramoDropdownBtn.contains(e.target) && !tramoDropdownPanel.contains(e.target)) {
    tramoDropdownPanel.classList.remove('open');
    tramoDropdownBtn.classList.remove('open');
  }
});

async function cargarTramos() {
  try {
    const data = await apiFetch('/api/alerts/tramos');
    tramosDisponibles = data.tramos;
    renderTramoDropdownPanel();
    actualizarTextoTramoDropdown();
  } catch (err) {
    console.warn('No se pudieron cargar los tramos de Licitación:', err.message);
  }
}

// --- Tipo de proceso (Licitaciones / Compras Ágiles) — al menos uno debe
// quedar marcado; si el usuario intenta destildar el último, se revierte.
// El tramo UTM solo tiene sentido para Licitaciones, y el rango de monto
// mínimo/máximo solo para Compras Ágiles (un tramo YA define un rango de
// monto para licitaciones) — cada campo se muestra u oculta según corresponda.
const tramoFieldEl = document.getElementById('tramoField');
const montoFieldEl = document.getElementById('montoField');

function actualizarCamposSegunTipoProceso() {
  const licitacionesActivas = tipoProcesoLicitacionChk.checked;
  const compraAgilActiva = tipoProcesoCompraAgilChk.checked;

  tramoFieldEl.style.display = licitacionesActivas ? '' : 'none';
  montoFieldEl.style.display = compraAgilActiva ? '' : 'none';

  // Si se oculta un campo, se limpia su valor — no debe quedar guardado un
  // criterio que el usuario ya no puede ver ni editar en el formulario.
  if (!licitacionesActivas) resetTramoDropdown();
  if (!compraAgilActiva) {
    montoMinimoInput.value = '';
    montoMaximoInput.value = '';
  }
}

// Combobox equivalente para vista mobile — .tipo-proceso-row se oculta y este
// <select> queda como único control visible, pero los checkboxes de arriba
// siguen siendo la fuente de verdad (toda la lógica de campos depende de ellos).
const tipoProcesoSelectEl = document.getElementById('tipoProcesoSelect');

function syncTipoProcesoSelectDesdeCheckboxes() {
  const lic = tipoProcesoLicitacionChk.checked;
  const agil = tipoProcesoCompraAgilChk.checked;
  tipoProcesoSelectEl.value = lic && agil ? 'ambas' : (agil ? 'compra_agil' : 'licitacion');
}

tipoProcesoSelectEl.addEventListener('change', () => {
  const val = tipoProcesoSelectEl.value;
  tipoProcesoLicitacionChk.checked = val !== 'compra_agil';
  tipoProcesoCompraAgilChk.checked = val !== 'licitacion';
  actualizarCamposSegunTipoProceso();
});

[tipoProcesoLicitacionChk, tipoProcesoCompraAgilChk].forEach((chk) => {
  chk.addEventListener('change', () => {
    if (!tipoProcesoLicitacionChk.checked && !tipoProcesoCompraAgilChk.checked) {
      chk.checked = true; // no se puede dejar los dos destildados
    }
    syncTipoProcesoSelectDesdeCheckboxes();
    actualizarCamposSegunTipoProceso();
  });
});

function resetTipoProceso() {
  tipoProcesoLicitacionChk.checked = true;
  tipoProcesoCompraAgilChk.checked = true;
  tipoProcesoSelectEl.value = 'ambas';
  actualizarCamposSegunTipoProceso();
}

// --- Organismo comprador — buscador con autocompletado + selección múltiple
// (chips), mismo patrón visual que las categorías pero sin límite de 1. ---
const organismoBuscarInput = document.getElementById('organismoBuscar');
const organismoResultadosEl = document.getElementById('organismoResultados');
const organismosChipsEl = document.getElementById('organismosChips');
let organismoBuscarTimeout = null;
let organismosSeleccionados = [];

function renderOrganismosChips() {
  organismosChipsEl.innerHTML = organismosSeleccionados.map((o) => `
    <span class="categoria-chip" data-organismo="${o.replace(/"/g, '&quot;')}">
      ${escapeHtml(o)}
      <span class="quitar" data-quitar-organismo="${o.replace(/"/g, '&quot;')}">✕</span>
    </span>
  `).join('');

  organismosChipsEl.querySelectorAll('[data-quitar-organismo]').forEach((el) => {
    el.addEventListener('click', () => {
      organismosSeleccionados = organismosSeleccionados.filter((o) => o !== el.dataset.quitarOrganismo);
      renderOrganismosChips();
    });
  });
}

function resetOrganismos() {
  organismosSeleccionados = [];
  renderOrganismosChips();
}

organismoBuscarInput.addEventListener('input', () => {
  clearTimeout(organismoBuscarTimeout);
  const texto = organismoBuscarInput.value.trim();

  if (texto.length < 2) {
    organismoResultadosEl.classList.remove('open');
    return;
  }

  organismoBuscarTimeout = setTimeout(async () => {
    try {
      const data = await apiFetch(`/api/alerts/organismos/buscar?q=${encodeURIComponent(texto)}`);
      const disponibles = data.resultados.filter((o) => !organismosSeleccionados.includes(o));

      organismoResultadosEl.innerHTML = disponibles.length === 0
        ? '<div class="categoria-resultado-vacio">Sin resultados</div>'
        : disponibles.map((o) => `
            <div class="categoria-resultado-item" data-organismo="${o.replace(/"/g, '&quot;')}">
              <span>${o}</span>
            </div>
          `).join('');

      organismoResultadosEl.querySelectorAll('[data-organismo]').forEach((el) => {
        el.addEventListener('click', () => {
          organismosSeleccionados.push(el.dataset.organismo);
          renderOrganismosChips();
          organismoBuscarInput.value = '';
          organismoResultadosEl.classList.remove('open');
        });
      });
      organismoResultadosEl.classList.add('open');
    } catch (err) {
      console.warn('Error buscando organismos:', err.message);
    }
  }, 300);
});

document.addEventListener('click', (e) => {
  if (!organismoBuscarInput.contains(e.target) && !organismoResultadosEl.contains(e.target)) {
    organismoResultadosEl.classList.remove('open');
  }
});

const confirmModal = document.getElementById('confirmModal');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmModalCancel = document.getElementById('confirmModalCancel');
const confirmModalAccept = document.getElementById('confirmModalAccept');

function confirmDialog(mensaje) {
  return new Promise((resolve) => {
    confirmModalMessage.textContent = mensaje;
    confirmModal.classList.add('open');

    function cerrar(resultado) {
      confirmModal.classList.remove('open');
      confirmModalAccept.removeEventListener('click', onAceptar);
      confirmModalCancel.removeEventListener('click', onCancelar);
      confirmModal.removeEventListener('click', onOverlay);
      resolve(resultado);
    }
    function onAceptar() { cerrar(true); }
    function onCancelar() { cerrar(false); }
    function onOverlay(e) { if (e.target === confirmModal) cerrar(false); }

    confirmModalAccept.addEventListener('click', onAceptar);
    confirmModalCancel.addEventListener('click', onCancelar);
    confirmModal.addEventListener('click', onOverlay);
  });
}

// Modal bloqueante genérico (mismo patrón que #buscandoModal) para cualquier
// operación breve donde conviene impedir doble clic / navegación a mitad de
// camino — el texto cambia según la acción (eliminar, agregar seguimiento, etc.).
const procesandoModal = document.getElementById('procesandoModal');
const procesandoModalMensaje = document.getElementById('procesandoModalMensaje');

function mostrarProcesando(mensaje) {
  procesandoModalMensaje.textContent = mensaje;
  procesandoModal.classList.add('open');
}
function ocultarProcesando() {
  procesandoModal.classList.remove('open');
}

async function cargarUsuario() {
  try {
    const data = await apiFetch('/api/auth/me');
    window.usuarioActual = data.usuario;

    const nombreCompleto = data.usuario.nombre
      ? `${data.usuario.nombre} ${data.usuario.apellido || ''}`.trim()
      : data.usuario.email;
    //document.getElementById('userInfo').textContent =
    //  `${nombreCompleto} · ${data.usuario.nombre_empresa || data.usuario.rut_empresa}`;

    const iniciales = data.usuario.nombre
      ? `${data.usuario.nombre[0]}${(data.usuario.apellido || '')[0] || ''}`.toUpperCase()
      : data.usuario.email[0].toUpperCase();
    inicialesUsuarioActual = iniciales;
    aplicarAvatar(data.usuario.avatar_data);
    document.getElementById('topbarMenuName').textContent = nombreCompleto;
    document.getElementById('topbarMenuEmail').textContent = data.usuario.email;
    document.getElementById('sidebarMenuName').textContent = nombreCompleto;
    document.getElementById('sidebarMenuEmail').textContent = data.usuario.email;

    mostrarBannerPlan(data.usuario);
    renderAnalisis(data.usuario);

    // Tour de bienvenida (ver js/tutorial.js) — se define después en el
    // orden de carga de <script>, pero para cuando esta promesa resuelve
    // (después del round-trip a /api/auth/me) ya está disponible.
    if (window.verificarTutorialOnboarding) window.verificarTutorialOnboarding(data.usuario);
    marcarSubtabsAnalisisBloqueados();

    // Solo visible para el usuario admin (users.es_admin, migración 028) —
    // se inyecta por JS en vez de dejarlo fijo en el HTML para que no
    // "parpadee" visible antes de saber si el usuario es admin o no.
    /*if (data.usuario.es_admin) {
      const linkAdmin = document.createElement('a');
      linkAdmin.href = 'admin.html';
      linkAdmin.className = 'sidebar-link';
      linkAdmin.innerHTML = '<div class="icon"><img src="/assets/icons/alt-administrador.svg" class="icon-desc"></img></div> Panel Admin';
      document.querySelector('.sidebar-nav').appendChild(linkAdmin);
    }*/
  } catch (err) {
    showError('No se pudo cargar tu sesión: ' + err.message);
  }
}

function mostrarBannerPlan(usuario) {
  const banner = document.getElementById('planBanner');

  if (usuario.estado_pago === 'pendiente') {
    banner.className = 'plan-banner bloqueo';
    banner.innerHTML = `
      <p>Tu pago está pendiente de confirmación. Completa el pago para poder usar MercadoAlerta.</p>
      <div class="btn-group">
        <button class="btn" id="btn-completar-pago" onclick="iniciarUpgrade('${usuario.empresa_id}', '${usuario.plan}', 'btn-completar-pago')">Completar pago</button>
      </div>
    `;
    banner.style.display = 'flex';
    return;
  }

  if (usuario.plan === 'trial' && usuario.fecha_expiracion_trial) {
    const msRestantes = new Date(usuario.fecha_expiracion_trial) - new Date();
    const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

    if (diasRestantes <= 0) {
      banner.className = 'plan-banner bloqueo';
      banner.innerHTML = `
        <p>Tu período de prueba de 14 días terminó. Elige un plan para seguir recibiendo alertas.</p>
        <div class="btn-group">
          <button class="btn" id="btn-elegir-basico" onclick="iniciarUpgrade('${usuario.empresa_id}', 'basico', 'btn-elegir-basico')">✅ Elegir Basic</button>
          <button class="btn" id="btn-elegir-full" onclick="iniciarUpgrade('${usuario.empresa_id}', 'full', 'btn-elegir-full')">🌟 Elegir Full</button>
        </div>
      `;
      banner.style.display = 'flex';
    } else if (diasRestantes <= 2) {
      banner.className = 'plan-banner aviso';
      banner.innerHTML = `
        <p>Tu período de prueba termina en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}. Elige un plan para no perder tus alertas.</p>
        <div class="btn-group">
          <button class="btn" id="btn-elegir-basico" onclick="iniciarUpgrade('${usuario.empresa_id}', 'basico', 'btn-elegir-basico')">✅ Elegir Basic</button>
          <button class="btn" id="btn-elegir-full" onclick="iniciarUpgrade('${usuario.empresa_id}', 'full', 'btn-elegir-full')">🌟 Elegir Full</button>
        </div>
      `;
      banner.style.display = 'flex';
    }
    return;
  }

  // Suscripción cancelada, acceso por vencer — mismo criterio que el aviso
  // de trial (2 días), ver migración 039. El caso "ya venció" no necesita
  // banner propio acá: para ese momento estado_pago ya pasó a 'pendiente'
  // (lo hace el job avisos-trial.js al cortar el acceso) y cae en el primer
  // bloque de esta función (el de "pago pendiente"), que ya cubre avisar.
  if (usuario.suscripcion_cancelada_en && usuario.acceso_hasta) {
    const msRestantes = new Date(usuario.acceso_hasta) - new Date();
    const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

    if (diasRestantes > 0 && diasRestantes <= 2) {
      banner.className = 'plan-banner aviso';
      banner.innerHTML = `
        <p>Cancelaste tu suscripción — tu acceso termina en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}. Si te arrepentiste, puedes reactivarlo.</p>
        <div class="btn-group">
          <button class="btn" id="btn-elegir-basico" onclick="iniciarUpgrade('${usuario.empresa_id}', 'basico', 'btn-elegir-basico')">✅ Elegir Basic</button>
          <button class="btn" id="btn-elegir-full" onclick="iniciarUpgrade('${usuario.empresa_id}', 'full', 'btn-elegir-full')">🌟 Elegir Full</button>
        </div>
      `;
      banner.style.display = 'flex';
    }
  }
}

async function iniciarUpgrade(empresaId, plan, btnId) {
  // btn puede venir null si algún call site no pasa btnId (o el id no
  // coincide con nada en el DOM) — antes esto tiraba un error sin manejar
  // ("Cannot read properties of null") que dejaba el click sin hacer nada.
  // Ahora, si no hay botón, seguimos igual con el flujo de pago (que es lo
  // que realmente le importa al usuario) y solo nos salteamos el
  // deshabilitar/cambiar texto del botón.
  const btn = btnId ? document.getElementById(btnId) : null;
  const textoOriginal = btn ? btn.textContent : null;

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Redirigiendo a MercadoPago...';
  }
  try {
    const data = await apiFetch(`/api/empresas/${empresaId}/upgrade`, {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
  } catch (err) {
    showError('No se pudo iniciar el pago: ' + err.message);
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }
}

// Espejo de src/utils/planes.js (backend) — solo para dar feedback inmediato
// en el cliente antes de abrir el modal. El backend es la fuente de verdad real
// y vuelve a validar esto en POST /api/alerts/config de todas formas.
const LIMITES_ALERTAS_POR_PLAN = { trial: 1, basico: 5, full: 10 };

function obtenerLimitesPlanActual() {
  const plan = window.usuarioActual?.plan;
  if (!plan || !(plan in LIMITES_ALERTAS_POR_PLAN)) return null;
  return { limiteAlertas: LIMITES_ALERTAS_POR_PLAN[plan] };
}

const CONFIGS_POR_PAGINA = 10;
let configsData = [];
let configsPaginaActual = 1;
let mapaCategorias = {}; // codigo -> { titulo, nivel }, para mostrar descripciones en vez de códigos

async function cargarConfigs() {
  const card = document.getElementById('configsCard');
  try {
    const data = await apiFetch('/api/alerts/config');
    configsData = data.configs;
    configsPaginaActual = 1;

    // Resolvemos en un solo request todos los códigos únicos que aparezcan
    // en cualquier config, para mostrar la descripción en vez del código crudo.
    const codigosUnicos = [...new Set(configsData.flatMap((c) => c.categorias || []))];
    if (codigosUnicos.length > 0) {
      try {
        const detalle = await apiFetch(`/api/alerts/categorias/detalle?codigos=${codigosUnicos.join(',')}`);
        mapaCategorias = Object.fromEntries(detalle.categorias.map((c) => [c.codigo, { titulo: c.titulo, nivel: c.nivel }]));
      } catch (err) {
        console.warn('No se pudieron resolver las descripciones de rubros o productos:', err.message);
        mapaCategorias = {};
      }
    }

    renderConfigs();
    renderInicio();
  } catch (err) {
    card.innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
  }
}

function obtenerConfigsFiltrados() {
  const estado = document.getElementById('filtroEstado').value;
  const tipoProceso = document.getElementById('filtroTipoProcesoConfig').value;
  const region = filtroRegionConfigSelect.value;

  return configsData.filter(c => {
    if (estado && String(c.activo) !== estado) return false;
    // Una config sin tipos_proceso (o con ambos) monitorea licitaciones Y compras
    // ágiles — mismo criterio que formatearTipoProcesoTag: solo restringe si el
    // array tiene largo 1.
    if (tipoProceso && c.tipos_proceso && c.tipos_proceso.length === 1 && c.tipos_proceso[0] !== tipoProceso) return false;
    // Una alerta sin regiones (null/[]) monitorea TODAS las regiones, así que
    // también debe aparecer al filtrar por cualquier región específica.
    if (region && c.regiones && c.regiones.length > 0 && !c.regiones.includes(region)) return false;
    if (filtroCategoriaConfigSeleccion) {
      const coincide = (c.categorias || []).some(cod => coincideConFiltroCategoria(cod, filtroCategoriaConfigSeleccion));
      if (!coincide) return false;
    }
    return true;
  });
}

function renderConfigs() {
  const card = document.getElementById('configsCard');
  if (configsData.length === 0) {
    card.innerHTML = '<div class="empty-state">Todavía no tienes alertas configuradas. Crea una arriba.</div>';
    return;
  }

  const configsFiltrados = obtenerConfigsFiltrados();
  if (configsFiltrados.length === 0) {
    card.innerHTML = '<div class="empty-state">Ningún resultado con los filtros seleccionados.</div>';
    return;
  }

  const totalPaginas = Math.ceil(configsFiltrados.length / CONFIGS_POR_PAGINA);
  if (configsPaginaActual > totalPaginas) configsPaginaActual = totalPaginas;
  const inicio = (configsPaginaActual - 1) * CONFIGS_POR_PAGINA;
  const pagina = configsFiltrados.slice(inicio, inicio + CONFIGS_POR_PAGINA);

  const filasHtml = pagina.map(c => {
    const categoriasInfo = (c.categorias || []).map((cod) => {
      const info = mapaCategorias[cod];
      return { codigo: cod, titulo: info ? info.titulo : cod, nivel: info ? info.nivel : 'categoria' };
    });
    const nombresCategorias = categoriasInfo.map((cat) => `${escapeHtml(cat.titulo)} <span class="nivel-badge ${cat.nivel}">${etiquetaNivel(cat.nivel)}</span> <span class="cod">(${cat.codigo})</span>`);
    return `
    <div class="row">
      <div class="row-info">
        <div class="row-title">${nombresCategorias.length ?  nombresCategorias.join(', ') : 'Todos los  rubros y productos'}</div>
        <div class="row-meta">
          <span style="font-size: 14px;">${c.activo ? '🟢 Activa' : '⚪ Pausada'}</span>
          ${formatearTipoProcesoTag(c.tipos_proceso)}
          ${formatearTramosTag(c.tramos_licitacion)}
          ${formatearMontoTag(c.monto_minimo, c.monto_maximo)}
          ${formatearRegionesTag(c.regiones)}
          ${formatearOrganismosTag(c.organismos)}
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" data-toggle="${c.id}" data-activo="${c.activo}">${c.activo ? '❚❚ Pausar' : '▶ Reactivar'}</button>
        <button class="btn btn-danger" data-delete="${c.id}">✖ Eliminar</button>
      </div>
    </div>
  `;
  }).join('');

  const mostrarPaginador = configsFiltrados.length > CONFIGS_POR_PAGINA;
  const paginadorHtml = mostrarPaginador ? `
    <div class="paginador">
      <button type="button" class="btn btn-ghost" id="configsPrev" ${configsPaginaActual === 1 ? 'disabled' : ''}>‹ Anterior</button>
      <span class="paginador-info">Página ${configsPaginaActual} de ${totalPaginas}</span>
      <button type="button" class="btn btn-ghost" id="configsNext" ${configsPaginaActual === totalPaginas ? 'disabled' : ''}>Siguiente ›</button>
    </div>
  ` : '';

  card.innerHTML = filasHtml + paginadorHtml;

  card.querySelectorAll('.regiones-toggle').forEach((el) => {
    el.addEventListener('click', () => {
      const expandido = el.classList.toggle('expandido');
      el.innerHTML = expandido ? el.dataset.completo : el.dataset.resumen;
    });
  });

  card.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmado = await confirmDialog('¿Eliminar esta alerta?');
      if (!confirmado) return;
      mostrarProcesando('Eliminando...');
      try {
        await apiFetch(`/api/alerts/config/${btn.dataset.delete}`, { method: 'DELETE' });
        cargarConfigs();
      } catch (err) { showErrorAlertas(err.message); } finally { ocultarProcesando(); }
    });
  });

  card.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const nuevoEstado = btn.dataset.activo !== 'true';
      try {
        await apiFetch(`/api/alerts/config/${btn.dataset.toggle}`, {
          method: 'PUT',
          body: JSON.stringify({ activo: nuevoEstado }),
        });
        cargarConfigs();
      } catch (err) { showErrorBubble(btn, err.message); }
    });
  });

  if (mostrarPaginador) {
    document.getElementById('configsPrev').addEventListener('click', () => {
      configsPaginaActual--;
      renderConfigs();
    });
    document.getElementById('configsNext').addEventListener('click', () => {
      configsPaginaActual++;
      renderConfigs();
    });
  }
}

document.getElementById('newAlertForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('createBtn');
  btn.disabled = true;
  btn.textContent = 'Creando...';

  const montoMinimo = soloDigitos(montoMinimoInput.value);
  const montoMaximo = soloDigitos(montoMaximoInput.value);
  const regiones = [...regionesSeleccionadas];
  const categorias = categoriasSeleccionadas.map((c) => c.codigo);
  const tramosLicitacion = [...tramosSeleccionados];
  const organismos = [...organismosSeleccionados];

  const tiposProceso = [];
  if (tipoProcesoLicitacionChk.checked) tiposProceso.push('licitacion');
  if (tipoProcesoCompraAgilChk.checked) tiposProceso.push('compra_agil');

  if (categorias.length === 0) {
    showErrorModal('Debes elegir un producto o rubro para la alerta.');
    btn.disabled = false;
    btn.textContent = 'Crear alerta';
    return;
  }

  if (tiposProceso.length === 0) {
    showErrorModal('Debes dejar marcado al menos "Licitaciones" o "Compras Ágiles".');
    btn.disabled = false;
    btn.textContent = 'Crear alerta';
    return;
  }

  if (montoMinimo && montoMaximo && Number(montoMaximo) < Number(montoMinimo)) {
    showErrorModal('El monto máximo no puede ser menor que el monto mínimo.');
    btn.disabled = false;
    btn.textContent = 'Crear alerta';
    return;
  }

  try {
    await apiFetch('/api/alerts/config', {
      method: 'POST',
      body: JSON.stringify({
        montoMinimo: montoMinimo ? Number(montoMinimo) : null,
        montoMaximo: montoMaximo ? Number(montoMaximo) : null,
        regiones,
        categorias,
        tiposProceso,
        tramosLicitacion,
        organismos,
      }),
    });
    document.getElementById('newAlertForm').reset();
    categoriasSeleccionadas = [];
    renderCategoriasChips();
    resetRegionDropdown();
    resetCategoriaSelector();
    resetTramoDropdown();
    resetTipoProceso();
    resetOrganismos();
    newAlertModal.classList.remove('open');
    cargarConfigs();
  } catch (err) {
    showErrorModal(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear alerta';
  }
});

const HISTORIAL_POR_PAGINA = 10;

// ============================================================
// --- Sección: Búsquedas ---
// ============================================================

const newBusquedaModal = document.getElementById('newBusquedaModal');
const busquedaRegionSelect = document.getElementById('busquedaRegionSelect');
const busquedaRutProveedorInput = document.getElementById('busquedaRutProveedor');
const busquedaTextoLibreInput = document.getElementById('busquedaTextoLibre');
const busquedaHorasRecientesInput = document.getElementById('busquedaHorasRecientes');
const busquedaCodigoLabelEl = document.getElementById('busquedaCodigoLabel');
const busquedaEstadosCACheckboxes = document.querySelectorAll('input[name="busquedaEstadoCA"]');

// Mismo formateo de RUT que ya usa la sección "Mi cuenta" (formatearRut, ver
// más arriba en este archivo), aplicado en vivo mientras el usuario escribe.
busquedaRutProveedorInput.addEventListener('input', () => {
  const cursorAlFinal = busquedaRutProveedorInput.selectionStart === busquedaRutProveedorInput.value.length;
  busquedaRutProveedorInput.value = formatearRut(busquedaRutProveedorInput.value);
  if (cursorAlFinal) busquedaRutProveedorInput.setSelectionRange(busquedaRutProveedorInput.value.length, busquedaRutProveedorInput.value.length);
});

const buscadorOrganismosBusqueda = crearBuscadorMultiple(
  'busquedaOrganismoBuscar', 'busquedaOrganismoResultados', 'busquedaOrganismosChips',
  '/api/alerts/organismos/buscar',
  { soloUno: true }
);

const busquedaTipoLicitacionRadio = document.getElementById('busquedaTipoLicitacion');
const busquedaTipoCompraAgilRadio = document.getElementById('busquedaTipoCompraAgil');
const busquedaModoRadios = document.querySelectorAll('input[name="busquedaModo"]');
const busquedaModoCompraAgilRadios = document.querySelectorAll('input[name="busquedaModoCompraAgil"]');
const busquedaModoFieldEl = document.getElementById('busquedaModoField');
const busquedaModoCompraAgilFieldEl = document.getElementById('busquedaModoCompraAgilField');
const busquedaCodigoFieldEl = document.getElementById('busquedaCodigoField');
const busquedaEstadoFieldEl = document.getElementById('busquedaEstadoField');
const busquedaRutProveedorFieldEl = document.getElementById('busquedaRutProveedorField');
//const busquedaFechaFieldEl = document.getElementById('busquedaFechaField');
const busquedaOrganismoFieldEl = document.getElementById('busquedaOrganismoField');
const busquedaOrganismoSmallEl = document.getElementById('busquedaOrganismoSmall');
const busquedaTextoLibreFieldEl = document.getElementById('busquedaTextoLibreField');
const busquedaRegionFieldEl = document.getElementById('busquedaRegionField');
const busquedaEstadosCompraAgilFieldEl = document.getElementById('busquedaEstadosCompraAgilField');
const busquedaHorasRecientesFieldEl = document.getElementById('busquedaHorasRecientesField');
const busquedaAvisoLimitacionEl = document.getElementById('busquedaAvisoLimitacion');

const AVISOS_LIMITACION = {
  codigo: 'Busca una Licitación puntual.',
  estado_fecha: 'Busca Licitaciones por estado.',
  proveedor: 'Busca Licitaciones por proveedor (RUT).',
  organismo: 'Busca Licitaciones por organismo comprador (nombre).',
};

function modoLicitacionSeleccionado() {
  return document.querySelector('input[name="busquedaModo"]:checked')?.value || 'codigo';
}
function modoCompraAgilSeleccionado() {
  return document.querySelector('input[name="busquedaModoCompraAgil"]:checked')?.value || 'codigo';
}

function actualizarCamposBusquedaSegunTipo() {
  const esCompraAgil = busquedaTipoCompraAgilRadio.checked;
  const modo = modoLicitacionSeleccionado();
  const modoCA = modoCompraAgilSeleccionado();

  // Grupo de "modo" según tipo — Licitaciones tiene 4 opciones excluyentes,
  // Compra Ágil solo 2 (su API sí combina texto/región/estado libremente).
  busquedaModoFieldEl.style.display = esCompraAgil ? 'none' : '';
  busquedaModoCompraAgilFieldEl.style.display = esCompraAgil ? '' : 'none';

  const modoActivo = esCompraAgil ? modoCA : modo;

  // 'codigo' es compartido entre los dos tipos (mismo campo, label distinto).
  busquedaCodigoFieldEl.style.display = (modoActivo === 'codigo') ? '' : 'none';
  busquedaCodigoLabelEl.innerHTML = esCompraAgil ? '<strong>Código de la Compra Ágil *</strong>' : '<strong>Código de la Licitación *</strong>';
  document.getElementById('busquedaCodigoExterno').placeholder = esCompraAgil ? 'Ej: 1195-39-COT26' : 'Ej: 1509-5-L114';

  // Exclusivo de Licitaciones:
  busquedaEstadoFieldEl.style.display = (!esCompraAgil && modo === 'estado_fecha') ? '' : 'none';
  busquedaRutProveedorFieldEl.style.display = (!esCompraAgil && modo === 'proveedor') ? '' : 'none';
  //busquedaFechaFieldEl.style.display = (!esCompraAgil && modo !== 'codigo') ? '' : 'none';
  busquedaOrganismoFieldEl.style.display = (!esCompraAgil && modo === 'organismo') ? '' : 'none';
  busquedaOrganismoSmallEl.textContent = 'Elige una institución compradora.';

  // Exclusivo de Compra Ágil (modo 'listado'):
  const listadoCA = esCompraAgil && modoCA === 'listado';
  busquedaTextoLibreFieldEl.style.display = listadoCA ? '' : 'none';
  busquedaRegionFieldEl.style.display = listadoCA ? '' : 'none';
  busquedaEstadosCompraAgilFieldEl.style.display = listadoCA ? '' : 'none';
  busquedaHorasRecientesFieldEl.style.display = listadoCA ? '' : 'none';

  busquedaAvisoLimitacionEl.textContent = esCompraAgil ? '' : AVISOS_LIMITACION[modo];

  // Limpia lo que quede oculto, para no guardar un criterio que el usuario ya no ve.
  if (esCompraAgil) {
    busquedaRutProveedorInput.value = '';
    //busquedaFechaInput.value = '';
    if (modoCA !== 'organismo') buscadorOrganismosBusqueda.reset();
  } else {
    buscadorOrganismosBusqueda.reset();
  }
  if (!listadoCA) {
    busquedaTextoLibreInput.value = '';
    busquedaRegionSelect.value = '';
    busquedaHorasRecientesInput.value = '';
    busquedaEstadosCACheckboxes.forEach((chk) => { chk.checked = false; });
    [...busquedaEstadosCompraAgilSelectEl.options].forEach((opt) => { opt.selected = false; });
  }
}

const busquedaCodigoExternoInput = document.getElementById('busquedaCodigoExterno');
//const busquedaFechaInput = document.getElementById('busquedaFecha');

[busquedaTipoLicitacionRadio, busquedaTipoCompraAgilRadio, ...busquedaModoRadios, ...busquedaModoCompraAgilRadios].forEach((radio) => {
  radio.addEventListener('change', actualizarCamposBusquedaSegunTipo);
});

// Combobox equivalente para vista mobile — mismo patrón que tipoProcesoSelect:
// los radios de arriba siguen siendo la fuente de verdad, el <select> solo
// refleja y escribe su estado.
function vincularRadiosConSelect(radios, selectEl) {
  selectEl.addEventListener('change', () => {
    radios.forEach((r) => { r.checked = (r.value === selectEl.value); });
    actualizarCamposBusquedaSegunTipo();
  });
  radios.forEach((r) => {
    r.addEventListener('change', () => { if (r.checked) selectEl.value = r.value; });
  });
}

const busquedaTipoSelectEl = document.getElementById('busquedaTipoSelect');
const busquedaModoSelectEl = document.getElementById('busquedaModoSelect');
const busquedaModoCompraAgilSelectEl = document.getElementById('busquedaModoCompraAgilSelect');
vincularRadiosConSelect([busquedaTipoLicitacionRadio, busquedaTipoCompraAgilRadio], busquedaTipoSelectEl);
vincularRadiosConSelect([...busquedaModoRadios], busquedaModoSelectEl);
vincularRadiosConSelect([...busquedaModoCompraAgilRadios], busquedaModoCompraAgilSelectEl);

// Igual que vincularRadiosConSelect, pero para un grupo de checkboxes
// independientes (0 o más marcados) — el equivalente mobile es un <select multiple>.
function vincularCheckboxesConSelectMultiple(checkboxes, selectEl) {
  selectEl.addEventListener('change', () => {
    const seleccionados = new Set([...selectEl.selectedOptions].map((opt) => opt.value));
    checkboxes.forEach((c) => { c.checked = seleccionados.has(c.value); });
  });
  checkboxes.forEach((c) => {
    c.addEventListener('change', () => {
      [...selectEl.options].forEach((opt) => {
        opt.selected = [...checkboxes].some((chk) => chk.value === opt.value && chk.checked);
      });
    });
  });
}

const busquedaEstadosCompraAgilSelectEl = document.getElementById('busquedaEstadosCompraAgilSelect');
vincularCheckboxesConSelectMultiple([...busquedaEstadosCACheckboxes], busquedaEstadosCompraAgilSelectEl);

function resetFormularioBusqueda() {
  document.getElementById('newBusquedaForm').reset();
  buscadorOrganismosBusqueda.reset();
  busquedaTipoLicitacionRadio.checked = true;
  document.getElementById('busquedaModoCodigo').checked = true;
  document.getElementById('busquedaModoCACodigo').checked = true;
  busquedaTipoSelectEl.value = 'licitacion';
  busquedaModoSelectEl.value = 'codigo';
  busquedaModoCompraAgilSelectEl.value = 'codigo';
  actualizarCamposBusquedaSegunTipo();
  document.getElementById('errorBannerBusquedaModal').style.display = 'none';
}

// Espejo de src/utils/planes.js (backend) — igual que LIMITES_ALERTAS_POR_PLAN,
// solo para dar feedback inmediato antes de abrir el modal. El backend vuelve
// a validar esto en POST /api/busquedas de todas formas.
const LIMITES_BUSQUEDAS_POR_PLAN = { trial: 5, basico: 10, full: 20 };

document.getElementById('abrirNuevaBusquedaBtn').addEventListener('click', () => {
  const limite = LIMITES_BUSQUEDAS_POR_PLAN[window.usuarioActual?.plan];
  if (limite !== undefined && busquedasData.length >= limite) {
    showErrorBusquedas(`Tu plan (${window.usuarioActual?.plan}) permite guardar hasta ${limite} búsqueda${limite === 1 ? '' : 's'}. Elimina alguna antes de crear una nueva.`);
    return;
  }
  resetFormularioBusqueda();
  newBusquedaModal.classList.add('open');
});
document.getElementById('cerrarNuevaBusquedaBtn').addEventListener('click', () => {
  newBusquedaModal.classList.remove('open');
});
newBusquedaModal.addEventListener('click', (e) => {
  if (e.target === newBusquedaModal) newBusquedaModal.classList.remove('open');
});

document.getElementById('newBusquedaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('crearBusquedaBtn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const nombre = document.getElementById('busquedaNombre').value.trim();
  const tipo = busquedaTipoCompraAgilRadio.checked ? 'compra_agil' : 'licitacion';
  const modo = tipo === 'compra_agil' ? modoCompraAgilSeleccionado() : modoLicitacionSeleccionado();
  const organismos = buscadorOrganismosBusqueda.get();

  const payload = { nombre, tipo, modo };

  if (tipo === 'licitacion') {
    //payload.fecha = busquedaFechaInput.value || null;
    if (modo === 'codigo') {
      payload.codigoExterno = busquedaCodigoExternoInput.value.trim();
    } else if (modo === 'estado_fecha') {
      payload.estado = document.getElementById('busquedaEstadoSelect').value;
    } else if (modo === 'proveedor') {
      payload.rutProveedor = busquedaRutProveedorInput.value.trim();
    } else if (modo === 'organismo') {
      if (organismos.length === 0) {
        mostrarErrorModalBusqueda('Elige un organismo para este modo de búsqueda.');
        btn.disabled = false;
        btn.textContent = '+ Guardar búsqueda';
        return;
      }
      payload.organismos = organismos;
    }
  } else if (modo === 'codigo') {
    payload.codigoExterno = busquedaCodigoExternoInput.value.trim();
  } else {
    payload.textoLibre = busquedaTextoLibreInput.value.trim() || null;
    payload.regiones = busquedaRegionSelect.value ? [busquedaRegionSelect.value] : [];
    payload.estados = [...busquedaEstadosCACheckboxes].filter((c) => c.checked).map((c) => c.value);
    payload.horasRecientes = busquedaHorasRecientesInput.value ? Number(busquedaHorasRecientesInput.value) : null;
  }

  if (!nombre) {
    mostrarErrorModalBusqueda('Debes ponerle un nombre a la búsqueda.');
    btn.disabled = false;
    btn.textContent = '+ Guardar búsqueda';
    return;
  }
  if ((tipo === 'licitacion' && modo === 'codigo' || tipo === 'compra_agil' && modo === 'codigo') && !payload.codigoExterno) {
    mostrarErrorModalBusqueda('Debes ingresar el código.');
    btn.disabled = false;
    btn.textContent = '+ Guardar búsqueda';
    return;
  }

  try {
    await apiFetch('/api/busquedas', { method: 'POST', body: JSON.stringify(payload) });
    newBusquedaModal.classList.remove('open');
    cargarBusquedas();
  } catch (err) {
    mostrarErrorModalBusqueda(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Guardar búsqueda';
  }
});

function mostrarErrorModalBusqueda(mensaje) {
  const el = document.getElementById('errorBannerBusquedaModal');
  el.textContent = '❌ ' + mensaje;
  el.style.display = 'block';
}

let busquedasData = [];

const BUSQUEDAS_POR_PAGINA = 10;
let busquedasPaginaActual = 1;

async function cargarBusquedas() {
  const card = document.getElementById('busquedasCard');
  try {
    const data = await apiFetch('/api/busquedas');
    busquedasData = data.busquedas;
    busquedasPaginaActual = 1;
    renderBusquedas();
  } catch (err) {
    card.innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
  }
}

function etiquetaTipoBusqueda(tipo) {
  return tipo === 'compra_agil' ? '⚡ Compra Ágil' : '📋 Licitación';
}

const ETIQUETAS_MODO = {
  codigo: 'Por código',
  estado_fecha: 'Por estado',
  proveedor: 'Por proveedor',
  organismo: 'Por organismo',
  listado: 'Por texto/región/estado',
};

const ETIQUETAS_ESTADO_BUSQUEDA = {
  todos: 'Todos los estados', publicada: 'Publicada', cerrada: 'Cerrada',
  desierta: 'Desierta', adjudicada: 'Adjudicada', revocada: 'Revocada', suspendida: 'Suspendida',
  cancelada: 'Cancelada',
};

// Arma la línea de detalle de una búsqueda guardada según su tipo/modo — cada
// combinación tiene un conjunto de campos totalmente distinto (ver migraciones 033/034).
function describirBusquedaEnFila(b) {
  const fechaTexto = b.fecha ? formatDate(b.fecha).split(',')[0] : 'Hoy (al ejecutar)';

  if (b.tipo === 'compra_agil') {
    if (b.modo === 'codigo') return `<br><span>Código: ${escapeHtml(b.codigo_externo)}</span>`;
    const partes = [];
    if (b.texto_libre) partes.push(`<br><span>Texto: "${b.texto_libre}"</span>`);
    partes.push(formatearRegionesTag(b.regiones));
    if (b.estados && b.estados.length > 0) {
      partes.push(`<br><span>Estado: ${b.estados.map((e) => ETIQUETAS_ESTADO_BUSQUEDA[e] || e).join(', ')}</span>`);
    }
    if (b.horas_recientes) partes.push(`<br><span>Últimas ${b.horas_recientes}h</span>`);
    return partes.join('');
  }

  if (b.modo === 'codigo') return `<br><span>Código: ${escapeHtml(b.codigo_externo)}</span>`;
  if (b.modo === 'estado_fecha') return `<br><span>Estado: ${ETIQUETAS_ESTADO_BUSQUEDA[b.estado] || b.estado}</span><br><span>Fecha: ${fechaTexto}</span>`;
  if (b.modo === 'proveedor') return `<br><span>Proveedor RUT: ${b.rut_proveedor}</span><br><span>Fecha: ${fechaTexto}</span>`;
  if (b.modo === 'organismo') return `${formatearOrganismosTag(b.organismos)}<br><span>Fecha: ${fechaTexto}</span>`;
  return '';
}

function renderBusquedas() {
  const card = document.getElementById('busquedasCard');
  if (busquedasData.length === 0) {
    card.innerHTML = '<div class="empty-state">Todavía no tienes búsquedas guardadas. Crea una arriba.</div>';
    return;
  }

  const totalPaginas = Math.ceil(busquedasData.length / BUSQUEDAS_POR_PAGINA);
  if (busquedasPaginaActual > totalPaginas) busquedasPaginaActual = totalPaginas;
  const inicio = (busquedasPaginaActual - 1) * BUSQUEDAS_POR_PAGINA;
  const pagina = busquedasData.slice(inicio, inicio + BUSQUEDAS_POR_PAGINA);

  const filasHtml = pagina.map((b) => `
    <div class="row" data-busqueda-id="${b.id}">
      <div class="row-info">
        <div class="row-title">${escapeHtml(b.nombre)}</div>
        <div class="row-meta">
          <span>${etiquetaTipoBusqueda(b.tipo)}</span>
          <span>${ETIQUETAS_MODO[b.modo] || b.modo}</span>
          ${describirBusquedaEnFila(b)}
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" data-ejecutar="${b.id}">▶ Ejecutar</button>
        <button class="btn btn-danger" data-eliminar-busqueda="${b.id}">✖ Eliminar</button>
      </div>
    </div>
  `).join('');

  const mostrarPaginador = busquedasData.length > BUSQUEDAS_POR_PAGINA;
  const paginadorHtml = mostrarPaginador ? `
    <div class="paginador">
      <button type="button" class="btn btn-ghost" id="busquedasPrev" ${busquedasPaginaActual === 1 ? 'disabled' : ''}>‹ Anterior</button>
      <span class="paginador-info">Página ${busquedasPaginaActual} de ${totalPaginas}</span>
      <button type="button" class="btn btn-ghost" id="busquedasNext" ${busquedasPaginaActual === totalPaginas ? 'disabled' : ''}>Siguiente ›</button>
    </div>
  ` : '';

  card.innerHTML = filasHtml + paginadorHtml;

  if (mostrarPaginador) {
    document.getElementById('busquedasPrev').addEventListener('click', () => {
      busquedasPaginaActual--;
      renderBusquedas();
    });
    document.getElementById('busquedasNext').addEventListener('click', () => {
      busquedasPaginaActual++;
      renderBusquedas();
    });
  }

  card.querySelectorAll('.regiones-toggle').forEach((el) => {
    el.addEventListener('click', () => {
      const expandido = el.classList.toggle('expandido');
      el.innerHTML = expandido ? el.dataset.completo : el.dataset.resumen;
    });
  });

  card.querySelectorAll('[data-eliminar-busqueda]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const confirmado = await confirmDialog('¿Eliminar esta búsqueda guardada?');
      if (!confirmado) return;
      mostrarProcesando('Eliminando...');
      try {
        await apiFetch(`/api/busquedas/${btn.dataset.eliminarBusqueda}`, { method: 'DELETE' });
        cargarBusquedas();
      } catch (err) { showErrorBusquedas(err.message); } finally { ocultarProcesando(); }
    });
  });

  card.querySelectorAll('[data-ejecutar]').forEach((btn) => {
    btn.addEventListener('click', () => ejecutarBusquedaGuardada(btn.dataset.ejecutar, btn));
  });
}

let ultimoResultadoBusqueda = null; // { busqueda, tipo, modo, resultados, paginacion? } — para el export a PDF
let ultimaBusquedaIdEjecutada = null; // para poder pedir la página siguiente sin re-clickear "Ejecutar"

const BUSQUEDA_RESULTADOS_POR_PAGINA = 10;
let busquedaResultadosPaginaActual = 1;

// Compra Ágil en modo 'listado' pagina de verdad contra la API (ver
// busqueda-ejecutor.service.js) — acá NO se cortan resultados en el cliente,
// cada "página" ya viene lista desde el backend. Para el resto (Licitaciones,
// y Compra Ágil modo 'codigo', que trae 1 solo resultado) se sigue paginando
// en el cliente como antes, sobre el array completo ya traído.
function esPaginacionServidor(data) {
  return data.tipo === 'compra_agil' && data.modo === 'listado' && data.paginacion;
}

const buscandoModal = document.getElementById('buscandoModal');

async function ejecutarBusquedaGuardada(id, btn, numeroPagina = 1) {
  const textoOriginal = btn ? btn.textContent : null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Buscando...';
  }
  buscandoModal.classList.add('open');

  const wrap = document.getElementById('busquedaResultadosWrap');

  try {
    const data = await apiFetch(`/api/busquedas/${id}/ejecutar`, {
      method: 'POST',
      body: JSON.stringify({ numeroPagina }),
    });
    ultimoResultadoBusqueda = data;
    ultimaBusquedaIdEjecutada = id;
    busquedaResultadosPaginaActual = 1;

    document.getElementById('busquedaResultadosTitulo').textContent = `Resultados — ${data.busqueda.nombre}`;
    wrap.style.display = '';
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

    renderResultadosBusqueda(data);
  } catch (err) {
    showErrorBusquedas(err.message);
  } finally {
    buscandoModal.classList.remove('open');
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }
}

function urlFichaLicitacion(codigoExterno) {
  return `http://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(codigoExterno)}`;
}
function urlFichaCompraAgil(codigoExterno) {
  return `https://buscador.mercadopublico.cl/ficha?code=${encodeURIComponent(codigoExterno)}`;
}

function urlFichaProveedor(rutProveedor){
  return `https://proveedor.mercadopublico.cl/ficha/${encodeURIComponent(rutProveedor)}`;
}

function filaResultadoHtml(r, tipo) {
  return `
    <div class="row">
      <div class="row-info">
        <div class="row-title">
          <a href="${tipo === 'compra_agil' ? urlFichaCompraAgil(r.codigo_externo) : urlFichaLicitacion(r.codigo_externo)}" target="_blank" rel="noopener noreferrer" style="font-size:13px;">${escapeHtml(r.nombre) || escapeHtml(r.codigo_externo)} ↗</a>
        </div>
        <div class="row-meta">
          <span>${etiquetaTipoBusqueda(tipo)}</span>
          <br>
          <span>Código: ${escapeHtml(r.codigo_externo)}</span>
          <br><span>Estado: ${escapeHtml(r.estado) || 'Desconocido'}</span>
          <br><span>Cierra: ${formatDate(r.fecha_cierre)}</span>
        </div>
        <div class="oportunidad-botones">
          ${botonesOportunidadHtml(tipo, r.codigo_externo, r.nombre, "busqueda")}
        </div>
      </div>
    </div>
  `;
}

function renderResultadosBusqueda(data) {
  const card = document.getElementById('busquedaResultadosCard');
  const { tipo, resultados } = data;

  if (resultados.length === 0) {
    card.innerHTML = '<div class="empty-state">Sin resultados para esta búsqueda en este momento.</div>';
    return;
  }

  if (esPaginacionServidor(data)) {
    // Paginación real: cada página ya viene completa desde el backend — se
    // muestra tal cual, sin recortar de nuevo en el cliente.
    const { numero_pagina, total_paginas, total_resultados } = data.paginacion;
    const filasHtml = resultados.map((r) => filaResultadoHtml(r, tipo)).join('');
    const paginadorHtml = total_paginas > 1 ? `
      <div class="paginador">
        <button type="button" class="btn btn-ghost" id="busquedaResultadosPrev" ${numero_pagina === 1 ? 'disabled' : ''}>‹ Anterior</button>
        <span class="paginador-info">Página ${numero_pagina} de ${total_paginas} (${total_resultados} resultados)</span>
        <button type="button" class="btn btn-ghost" id="busquedaResultadosNext" ${numero_pagina === total_paginas ? 'disabled' : ''}>Siguiente ›</button>
      </div>
    ` : `<div class="paginador-info" style="padding:8px 0;">${total_resultados} resultado${total_resultados === 1 ? '' : 's'}</div>`;

    card.innerHTML = filasHtml + paginadorHtml;

    if (numero_pagina > 1) {
      document.getElementById('busquedaResultadosPrev').addEventListener('click', () => {
        ejecutarBusquedaGuardada(ultimaBusquedaIdEjecutada, null, numero_pagina - 1);
      });
    }
    if (numero_pagina < total_paginas) {
      document.getElementById('busquedaResultadosNext').addEventListener('click', () => {
        // Al llegar al final de lo cargado, se lanza la consulta pidiendo la
        // página siguiente REAL de la API (no hay más que cortar localmente).
        ejecutarBusquedaGuardada(ultimaBusquedaIdEjecutada, null, numero_pagina + 1);
      });
    }
    return;
  }

  // Sin paginación real de la API (Licitaciones, o Compra Ágil modo 'codigo')
  // — se pagina en el cliente sobre el array completo ya traído, como antes.
  const totalPaginas = Math.ceil(resultados.length / BUSQUEDA_RESULTADOS_POR_PAGINA);
  if (busquedaResultadosPaginaActual > totalPaginas) busquedaResultadosPaginaActual = totalPaginas;
  const inicio = (busquedaResultadosPaginaActual - 1) * BUSQUEDA_RESULTADOS_POR_PAGINA;
  const pagina = resultados.slice(inicio, inicio + BUSQUEDA_RESULTADOS_POR_PAGINA);

  const filasHtml = pagina.map((r) => filaResultadoHtml(r, tipo)).join('');

  const mostrarPaginador = resultados.length > BUSQUEDA_RESULTADOS_POR_PAGINA;
  const paginadorHtml = mostrarPaginador ? `
    <div class="paginador">
      <button type="button" class="btn btn-ghost" id="busquedaResultadosPrev" ${busquedaResultadosPaginaActual === 1 ? 'disabled' : ''}>‹ Anterior</button>
      <span class="paginador-info">Página ${busquedaResultadosPaginaActual} de ${totalPaginas}</span>
      <button type="button" class="btn btn-ghost" id="busquedaResultadosNext" ${busquedaResultadosPaginaActual === totalPaginas ? 'disabled' : ''}>Siguiente ›</button>
    </div>
  ` : '';

  card.innerHTML = filasHtml + paginadorHtml;

  if (mostrarPaginador) {
    document.getElementById('busquedaResultadosPrev').addEventListener('click', () => {
      busquedaResultadosPaginaActual--;
      renderResultadosBusqueda(data);
    });
    document.getElementById('busquedaResultadosNext').addEventListener('click', () => {
      busquedaResultadosPaginaActual++;
      renderResultadosBusqueda(data);
    });
  }
}

// --- Exportar PDF (liviano — jsPDF + autotable vía CDN, se genera en el
// navegador, sin pedirle nada al backend). Al comienzo de la página 1 van los
// filtros con los que se armó la búsqueda, y después la tabla de resultados.
// Nota: si la búsqueda tiene más páginas de resultados en el servidor
// (Compra Ágil modo 'listado'), el PDF solo incluye la página actualmente
// cargada en pantalla — no descarga todas las páginas de golpe. ---
function describirCriteriosBusqueda(b) {
  const partes = [];
  // Sin emoji: las fuentes estándar de jsPDF (Helvetica/Times/Courier) no
  // tienen esos glifos y los muestran como caracteres inválidos en el PDF.
  partes.push(['Tipo de búsqueda', b.tipo === 'compra_agil' ? 'Compra Ágil' : 'Licitación']);
  partes.push(['Modo de búsqueda', ETIQUETAS_MODO[b.modo] || b.modo]);

  if (b.tipo === 'compra_agil') {
    if (b.modo === 'codigo') {
      partes.push(['Código', b.codigo_externo]);
      return partes;
    }
    partes.push(['Texto libre', b.texto_libre || '—']);
    partes.push(['Región', b.regiones && b.regiones.length > 0 ? b.regiones.join(', ') : 'Todas']);
    partes.push(['Estado', b.estados && b.estados.length > 0 ? b.estados.map((e) => ETIQUETAS_ESTADO_BUSQUEDA[e] || e).join(', ') : 'Todos']);
    partes.push(['Nuevas en las últimas', b.horas_recientes ? `${b.horas_recientes} horas` : '—']);
    return partes;
  }

  const fechaTexto = b.fecha ? formatDate(b.fecha).split(',')[0] : 'Hoy (al momento de ejecutar)';
  if (b.modo === 'codigo') partes.push(['Código', b.codigo_externo]);
  if (b.modo === 'estado_fecha') {
    partes.push(['Estado', ETIQUETAS_ESTADO_BUSQUEDA[b.estado] || b.estado]);
    partes.push(['Fecha', fechaTexto]);
  }
  if (b.modo === 'proveedor') {
    partes.push(['RUT proveedor', b.rut_proveedor]);
    partes.push(['Fecha', fechaTexto]);
  }
  if (b.modo === 'organismo') {
    partes.push(['Organismo', b.organismos && b.organismos.length > 0 ? b.organismos.join(', ') : '—']);
    partes.push(['Fecha', fechaTexto]);
  }
  return partes;
}

// jsPDF/autotable se cargan por <script> normal en dashboard.html, así que
// deberían estar listos para cuando este archivo corre — pero si un
// bloqueador de anuncios o un corte de red impidió que cargaran, el clic
// tiraba un TypeError sin ningún aviso. Acá se reintenta cargarlos on-demand
// antes de generar el PDF, y si igual falla se muestra un error legible.
function cargarScriptExterno(src) {
  // Siempre se agrega un <script> nuevo (en vez de reusar el que ya está en
  // el HTML) — si ese ya falló, su evento 'error' ya disparó una sola vez y
  // no hay forma de "reengancharse" a un reintento que el navegador no hará solo.
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

async function asegurarJsPDFDisponible() {
  if (window.jspdf?.jsPDF?.API?.autoTable) return;
  try {
    await cargarScriptExterno('https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.0.0/jspdf.umd.min.js');
    await cargarScriptExterno('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js');
  } catch {
    // se valida abajo con un mensaje uniforme, sin importar en qué script falló
  }
  if (!window.jspdf?.jsPDF?.API?.autoTable) {
    throw new Error('No se pudo cargar la librería para generar el PDF. Revisa tu conexión a internet o si un bloqueador de anuncios está impidiendo cargar cdnjs.cloudflare.com, y vuelve a intentar.');
  }
}

document.getElementById('descargarPdfBtn').addEventListener('click', async () => {
  if (!ultimoResultadoBusqueda) return;
  const btn = document.getElementById('descargarPdfBtn');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generando...';

  try {
    await asegurarJsPDFDisponible();
  } catch (err) {
    showErrorBusquedas(err.message);
    btn.disabled = false;
    btn.textContent = textoOriginal;
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
  const { busqueda, resultados } = ultimoResultadoBusqueda;

  doc.setFontSize(14);
  doc.text(`Búsqueda: ${escapeHtml(busqueda.nombre)}`, 40, 40);
  doc.setFontSize(9);
  doc.text(`Generado el ${new Date().toLocaleString('es-CL')}`, 40, 56);

  doc.autoTable({
    startY: 70,
    head: [['Filtro', 'Valor']],
    body: describirCriteriosBusqueda(busqueda),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 30, 40] },
    columnStyles: { 0: { cellWidth: 130, fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  const siguienteY = doc.lastAutoTable.finalY + 14;

  doc.autoTable({
    startY: siguienteY,
    head: [['Nombre', 'Código', 'Estado', 'Cierre']],
    body: resultados.map((r) => [r.nombre || '', r.codigo_externo || '', r.estado || '—', formatDate(r.fecha_cierre)]),
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 40] },
    margin: { left: 40, right: 40 },
  });

  const nombreArchivo = `busqueda-${busqueda.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}.pdf`;
  doc.save(nombreArchivo);

  btn.disabled = false;
  btn.textContent = textoOriginal;
});

// ============================================================
// --- Sección: Oportunidades (recordatorios + seguimiento) ---
// ============================================================

// Botones que aparecen en cada fila de Notificaciones y de resultados de
// Búsquedas — "Seguir" solo tiene sentido para Licitaciones (ver diseño:
// Compra Ágil tiene un ciclo de vida demasiado corto para que valga la pena
// avisar en cada cambio de estado intermedio). "Pipeline" aplica a los dos
// tipos — gestionar tu propio proceso no depende de la API de Mercado Público.
function botonesOportunidadHtml(tipoProceso, codigoExterno, nombre, origen) {
  const nombreEscapado = (nombre || codigoExterno || '').replace(/"/g, '&quot;');
  let html = `<button data-from="${origen}" type="button" class="btn btn-ghost" data-recordatorio-tipo="${tipoProceso}" data-recordatorio-codigo="${codigoExterno}" data-recordatorio-nombre="${nombreEscapado}">🔔 Recordarme</button>`;
  if (tipoProceso === 'licitacion') {
    html += ` <button data-from="${origen}" type="button" class="btn btn-ghost" data-seguir-codigo="${codigoExterno}" data-seguir-nombre="${nombreEscapado}">➕ Seguir</button>`;
  }
  html += ` <button data-from="${origen}" type="button" class="btn btn-ghost" data-pipeline-tipo="${tipoProceso}" data-pipeline-codigo="${codigoExterno}" data-pipeline-nombre="${nombreEscapado}">🗂️ Portafolio</button>`;
  return html;
}

const HORAS_RECORDATORIO = {
  licitacion: [
    { horas: 24, etiqueta: '1 día antes del cierre' },
    { horas: 72, etiqueta: '3 días antes del cierre' },
    { horas: 168, etiqueta: '1 semana antes del cierre' },
  ],
  compra_agil: [
    { horas: 2, etiqueta: '2 horas antes del cierre' },
    { horas: 6, etiqueta: '6 horas antes del cierre' },
    { horas: 12, etiqueta: '12 horas antes del cierre' },
  ],
};

const agregarRecordatorioModal = document.getElementById('agregarRecordatorioModal');
let recordatorioPendiente = null; // { tipoProceso, codigoExterno }

function abrirModalRecordatorio(tipoProceso, codigoExterno, nombre) {
  recordatorioPendiente = { tipoProceso, codigoExterno };
  document.getElementById('agregarRecordatorioNombre').textContent = nombre || codigoExterno;

  const select = document.getElementById('agregarRecordatorioHoras');
  select.innerHTML = HORAS_RECORDATORIO[tipoProceso].map((o) => `<option value="${o.horas}">${o.etiqueta}</option>`).join('');

  document.getElementById('errorBannerRecordatorioModal').style.display = 'none';
  agregarRecordatorioModal.classList.add('open');
}

document.getElementById('cerrarAgregarRecordatorioBtn').addEventListener('click', () => {
  agregarRecordatorioModal.classList.remove('open');
});
agregarRecordatorioModal.addEventListener('click', (e) => {
  if (e.target === agregarRecordatorioModal) agregarRecordatorioModal.classList.remove('open');
});

document.getElementById('confirmarAgregarRecordatorioBtn').addEventListener('click', async () => {
  if (!recordatorioPendiente) return;
  const btn = document.getElementById('confirmarAgregarRecordatorioBtn');
  const horasAntes = Number(document.getElementById('agregarRecordatorioHoras').value);

  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    await apiFetch('/api/oportunidades/recordatorios', {
      method: 'POST',
      body: JSON.stringify({ ...recordatorioPendiente, horasAntes }),
    });
    agregarRecordatorioModal.classList.remove('open');
    if (typeof cargarOportunidades === 'function') cargarOportunidades();
  } catch (err) {
    const el = document.getElementById('errorBannerRecordatorioModal');
    el.textContent = '❌ ' + err.message;
    el.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '🔔 Guardar recordatorio';
  }
});

// Delegación de eventos: los botones "Recordarme"/"Seguir" aparecen en varias
// listas (Notificaciones, resultados de Búsquedas) que se re-renderizan
// seguido — más simple engancharlos una sola vez acá que re-atarlos cada vez.
document.addEventListener('click', async (e) => {
  const btnRecordatorio = e.target.closest('[data-recordatorio-codigo]');
  if (btnRecordatorio) {
    abrirModalRecordatorio(btnRecordatorio.dataset.recordatorioTipo, btnRecordatorio.dataset.recordatorioCodigo, btnRecordatorio.dataset.recordatorioNombre);
    return;
  }

  const btnSeguir = e.target.closest('[data-seguir-codigo]');
  if (btnSeguir) {
    btnSeguir.disabled = true;
    btnSeguir.textContent = 'Agregando...';
    mostrarProcesando('Agregando Seguimiento...');
    try {
      await apiFetch('/api/oportunidades/seguimientos', {
        method: 'POST',
        body: JSON.stringify({ codigoExterno: btnSeguir.dataset.seguirCodigo }),
      });
      btnSeguir.textContent = '✓ Siguiendo';
      if (typeof cargarOportunidades === 'function') cargarOportunidades();
    } catch (err) {
      btnSeguir.disabled = false;
      btnSeguir.textContent = '➕ Seguir';
      if(btnSeguir.dataset.from === 'notificaciones'){
        showErrorNotificaciones(err.message);
      }else{
        showErrorBusquedasOp(err.message);
      }
    } finally {
      ocultarProcesando();
    }
    return;
  }

  const btnPipeline = e.target.closest('[data-pipeline-codigo]');
  if (btnPipeline) {
    btnPipeline.disabled = true;
    btnPipeline.textContent = 'Agregando...';
    mostrarProcesando('Agregando al Pipeline...');
    try {
      await apiFetch('/api/pipeline', {
        method: 'POST',
        body: JSON.stringify({ tipoProceso: btnPipeline.dataset.pipelineTipo, codigoExterno: btnPipeline.dataset.pipelineCodigo }),
      });
      btnPipeline.textContent = '✓ En pipeline';
      if (typeof cargarOportunidades === 'function') cargarOportunidades();
    } catch (err) {
      btnPipeline.disabled = false;
      btnPipeline.textContent = '🗂️ Portafolio';
      if (btnPipeline.dataset.from === 'notificaciones') {
        showErrorNotificaciones(err.message);
      } else {
        showErrorBusquedasOp(err.message);
      }
    } finally {
      ocultarProcesando();
    }
  }
});

// --- Listado dentro de "Oportunidades" ---
let recordatoriosData = [];
let seguimientosData = [];
let pipelineData = [];
let oportunidadesSubtabActiva = 'recordatorios';

const oportunidadesSubTabSelect = document.getElementById('oportunidadesSubTabSelect');

document.querySelectorAll('#oportunidadesSubTabs .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#oportunidadesSubTabs .tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    oportunidadesSubTabSelect.value = btn.dataset.subtab;
    oportunidadesSubtabActiva = btn.dataset.subtab;
    renderOportunidadesActiva();
  });
});

oportunidadesSubTabSelect.addEventListener('change', () => {
  document.querySelectorAll('#oportunidadesSubTabs .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.subtab === oportunidadesSubTabSelect.value));
  oportunidadesSubtabActiva = oportunidadesSubTabSelect.value;
  renderOportunidadesActiva();
});

async function cargarOportunidades() {
  const card = document.getElementById('oportunidadesCard');
  try {
    const [recordatoriosRes, seguimientosRes, pipelineRes] = await Promise.all([
      apiFetch('/api/oportunidades/recordatorios'),
      apiFetch('/api/oportunidades/seguimientos'),
      apiFetch('/api/pipeline'),
    ]);
    recordatoriosData = recordatoriosRes.recordatorios;
    seguimientosData = seguimientosRes.seguimientos;
    pipelineData = pipelineRes.pipeline;
    renderOportunidadesActiva();
    renderInicioOportunidades();
  } catch (err) {
    card.innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
  }
}

async function renderOportunidadesActiva() {
  const card = document.getElementById('oportunidadesCard');
  // El kanban (desktop) necesita scroll horizontal — .card tiene overflow:hidden,
  // que lo recortaría. En mobile el pipeline es una lista vertical normal
  // (igual que Recordatorios/Seguimiento), así que ahí SÍ conviene .card.
  const esKanbanDesktop = oportunidadesSubtabActiva === 'pipeline' && !MEDIA_QUERY_MOBILE.matches;
  card.classList.toggle('card', !esKanbanDesktop);

  if (oportunidadesSubtabActiva === 'recordatorios') renderRecordatorios();
  else if (oportunidadesSubtabActiva === 'seguimiento') renderSeguimientos();
  else if (pipelineData.length === 0 && !(await tieneAcceso('portafolio'))) {
    // Defensivo — con los planes de hoy (Trial/Basic/Full) esto ya no se
    // dispara nunca, porque los tres tienen portafolio:true (Trial con su
    // propio limitePortafolio más chico, ver pipeline.routes.js). Se deja
    // por si en el futuro se agrega algún plan/estado con portafolio:false.
    card.innerHTML = '<div class="empty-state">El Portafolio no está disponible en tu plan actual. <a href="#" onclick="mostrarSeccion(\'cuenta\'); poblarSeccionCuenta(); return false;" style="color: var(--gold);">Revisa tu plan →</a></div>';
  }
  else renderPipeline();
}

function renderRecordatorios() {
  const card = document.getElementById('oportunidadesCard');
  if (recordatoriosData.length === 0) {
    card.innerHTML = '<div class="empty-state">Todavía no tienes recordatorios de cierre. Agrégalos desde Notificaciones o Búsquedas con el botón "🔔 Recordarme".</div>';
    return;
  }

  card.innerHTML = recordatoriosData.map((r) => `
    <div class="row">
      <div class="row-info">
        <div class="row-title">${escapeHtml(r.nombre) || escapeHtml(r.codigo_externo)}</div>
        <div class="row-meta">
          <span>${r.tipo_proceso === 'compra_agil' ? '⚡ Compra Ágil' : '📋 Licitación'}</span>
          <br><span>Código: ${escapeHtml(r.codigo_externo)}</span>
          <br><span>Organismo: ${escapeHtml(r.organismo) || 'No especificado'}</span>
          <br><span>Monto: ${r.monto != null ? formatMoney(r.monto) : 'No especificado'}</span>
          <br><span>Cierra: ${formatDate(r.fecha_cierre)}</span>
          <br><span>Avisa: ${r.horas_antes}h antes del cierre</span>
          <br><span>${r.notificado_at ? `✅ Avisado el ${formatDate(r.notificado_at)}` : '⏳ Pendiente de avisar'}</span>
        </div>
      </div>
      <button class="btn btn-danger" data-eliminar-recordatorio="${r.id}">✖ Eliminar</button>
    </div>
  `).join('');

  card.querySelectorAll('[data-eliminar-recordatorio]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const confirmado = await confirmDialog('¿Eliminar este recordatorio de cierre?');
      if (!confirmado) return;
      const id = btn.dataset.eliminarRecordatorio;
      mostrarProcesando('Eliminando...');
      try {
        await apiFetch(`/api/oportunidades/recordatorios/${id}`, { method: 'DELETE' });
        // Actualiza el array local YA (no depende de que el refresh de abajo
        // llegue bien) y vuelve a renderizar esta misma pestaña al toque.
        recordatoriosData = recordatoriosData.filter((r) => String(r.id) !== String(id));
        renderRecordatorios();
        cargarOportunidades();
      } catch (err) {
        document.getElementById('errorBannerOportunidades').textContent = '❌ ' + err.message;
        document.getElementById('errorBannerOportunidades').style.display = 'block';
      } finally {
        ocultarProcesando();
      }
    });
  });
}

function renderSeguimientos() {
  const card = document.getElementById('oportunidadesCard');
  if (seguimientosData.length === 0) {
    card.innerHTML = '<div class="empty-state">Todavía no estás siguiendo ninguna Licitación. Agrégalas desde Notificaciones o Búsquedas con el botón "➕ Seguir".</div>';
    return;
  }

  card.innerHTML = seguimientosData.map((s) => `
    <div class="row">
      <div class="row-info">
        <div class="row-title">
          <a href="http://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(s.codigo_externo)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.nombre) || escapeHtml(s.codigo_externo)} ↗</a>
        </div>
        <div class="row-meta">
          <span>📋 Licitación</span>
          <br><span>Código: ${escapeHtml(s.codigo_externo)}</span>
          <br><span>Organismo: ${escapeHtml(s.organismo) || 'No especificado'}</span>
          <br><span>Región: ${escapeHtml(s.region) || 'No especificada'}</span>
          <br><span>Estado actual: ${escapeHtml(s.estado) || 'Desconocido'}</span>
          <br><span>Cierra: ${formatDate(s.fecha_cierre)}</span>
          ${s.resuelta ? '<br><span>✅ Proceso resuelto</span>' : ''}
        </div>
      </div>
      <button class="btn btn-danger" data-eliminar-seguimiento="${s.id}">✖ Dejar de seguir</button>
    </div>
  `).join('');

  card.querySelectorAll('[data-eliminar-seguimiento]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const confirmado = await confirmDialog('¿Dejar de seguir esta Licitación?');
      if (!confirmado) return;
      const id = btn.dataset.eliminarSeguimiento;
      mostrarProcesando('Eliminando...');
      try {
        await apiFetch(`/api/oportunidades/seguimientos/${id}`, { method: 'DELETE' });
        // Actualiza el array local YA (no depende de que el refresh de abajo
        // llegue bien) y vuelve a renderizar esta misma pestaña al toque.
        seguimientosData = seguimientosData.filter((s) => String(s.id) !== String(id));
        renderSeguimientos();
        cargarOportunidades();
      } catch (err) {
        document.getElementById('errorBannerOportunidades').textContent = '❌ ' + err.message;
        document.getElementById('errorBannerOportunidades').style.display = 'block';
      } finally {
        ocultarProcesando();
      }
    });
  });
}

// --- Pipeline (mini-CRM) — kanban por estado_personal en desktop (con drag
// & drop nativo de HTML5 entre columnas); en mobile, en vez de 7 columnas
// angostas imposibles de usar, pasa a una lista vertical filtrable por
// estado — mismo patrón `.row` que ya usan Recordatorios y Seguimiento, con
// un <select> arriba para elegir qué estado ver (o "Todos"). El punto de
// corte es el mismo breakpoint (720px) que ya usa .tipo-proceso-select en
// el modal de Búsquedas — no es un concepto de mobile nuevo, es el mismo.
const ESTADOS_PIPELINE = [
  { valor: 'por_evaluar', emoji: '🆕', etiqueta: 'Por evaluar' },
  { valor: 'evaluando', emoji: '🔍', etiqueta: 'Evaluando' },
  { valor: 'preparando_oferta', emoji: '✍️', etiqueta: 'Preparando oferta' },
  { valor: 'oferta_enviada', emoji: '📤', etiqueta: 'Oferta enviada' },
  { valor: 'ganada', emoji: '🏆', etiqueta: 'Ganada' },
  { valor: 'perdida', emoji: '❌', etiqueta: 'Perdida' },
  { valor: 'descartada', emoji: '🗑️', etiqueta: 'Descartada' },
];

const MEDIA_QUERY_MOBILE = window.matchMedia('(max-width: 720px)');
let pipelineFiltroMobileActivo = ''; // '' = todos los estados — se conserva entre renders

function urlFichaPipeline(item) {
  return item.tipo_proceso === 'compra_agil' ? urlFichaCompraAgil(item.codigo_externo) : urlFichaLicitacion(item.codigo_externo);
}

function selectEstadoPipelineHtml(item) {
  const opciones = ESTADOS_PIPELINE.map((e) => `<option value="${e.valor}" ${e.valor === item.estado_personal ? 'selected' : ''}>${e.emoji} ${e.etiqueta}</option>`).join('');
  return `<select class="select-pipeline" data-pipeline-select="${item.id}">${opciones}</select>`;
}

// Tarjeta del kanban (desktop).
function tarjetaPipelineHtml(item) {
  return `
    <div class="kanban-card" draggable="true" data-pipeline-id="${item.id}">
      <a href="${urlFichaPipeline(item)}" target="_blank" rel="noopener noreferrer" class="kanban-card-title">${escapeHtml(item.nombre) || escapeHtml(item.codigo_externo)} ↗</a>
      <div class="kanban-card-meta">
        ${item.tipo_proceso === 'compra_agil' ? '⚡ Compra Ágil' : '📋 Licitación'}<br>
        ${escapeHtml(item.organismo) || 'Organismo no especificado'}<br>
        ${item.monto != null ? formatMoney(item.monto) : 'Monto no especificado'}<br>
        Cierra: ${formatDate(item.fecha_cierre)}
      </div>
      ${selectEstadoPipelineHtml(item)}
      <textarea data-pipeline-nota="${item.id}" placeholder="Nota...">${escapeHtml(item.nota) || ''}</textarea>
      <div class="kanban-card-actions">
        <button type="button" data-eliminar-pipeline="${item.id}">✖ Quitar</button>
      </div>
    </div>
  `;
}

// Fila de la lista mobile — mismo `.row` que Recordatorios/Seguimiento, con
// los mismos controles (select de estado + nota + eliminar) que la tarjeta
// del kanban, así que comparten el mismo cableado de eventos (ver
// wirePipelineControles más abajo).
function filaPipelineHtml(item) {
  const estadoInfo = ESTADOS_PIPELINE.find((e) => e.valor === item.estado_personal);
  return `
    <div class="row">
      <div class="row-info">
        <div class="row-title">
          <a href="${urlFichaPipeline(item)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.nombre) || escapeHtml(item.codigo_externo)} ↗</a>
        </div>
        <div class="row-meta">
          <span>${item.tipo_proceso === 'compra_agil' ? '⚡ Compra Ágil' : '📋 Licitación'}</span>
          <br><span>Organismo: ${escapeHtml(item.organismo) || 'No especificado'}</span>
          <br><span>Monto: ${item.monto != null ? formatMoney(item.monto) : 'No especificado'}</span>
          <br><span>Cierra: ${formatDate(item.fecha_cierre)}</span>
          <br><span>Estado: ${estadoInfo ? `${estadoInfo.emoji} ${estadoInfo.etiqueta}` : item.estado_personal}</span>
        </div>
        <div class="field kanban-card" style="margin-top: 8px; max-width: 100%;">
          ${selectEstadoPipelineHtml(item)}
          <textarea data-pipeline-nota="${item.id}" placeholder="Nota...">${escapeHtml(item.nota) || ''}</textarea>
        </div>
      </div>
      <button class="btn btn-danger" data-eliminar-pipeline="${item.id}">✖ Quitar</button>
    </div>
  `;
}

async function moverTarjetaPipeline(id, nuevoEstado) {
  mostrarProcesando('Moviendo...');
  try {
    await apiFetch(`/api/pipeline/${id}`, { method: 'PUT', body: JSON.stringify({ estadoPersonal: nuevoEstado }) });
    const item = pipelineData.find((it) => String(it.id) === String(id));
    if (item) item.estado_personal = nuevoEstado;
    renderPipeline();
  } catch (err) {
    document.getElementById('errorBannerOportunidades').textContent = '❌ ' + err.message;
    document.getElementById('errorBannerOportunidades').style.display = 'block';
    renderPipeline(); // vuelve a pintar como estaba antes, por si el drag/select ya cambió el DOM
  } finally {
    ocultarProcesando();
  }
}

// Cableado compartido entre el kanban (desktop) y la lista (mobile) — los
// dos usan los mismos atributos data-pipeline-select/nota/eliminar-pipeline,
// así que este mismo código sirve para ambos.
function wirePipelineControles(contenedor) {
  contenedor.querySelectorAll('[data-pipeline-select]').forEach((select) => {
    select.addEventListener('change', () => moverTarjetaPipeline(select.dataset.pipelineSelect, select.value));
    select.addEventListener('click', (e) => e.stopPropagation()); // no dispara el drag al abrir el combo
  });

  contenedor.querySelectorAll('[data-pipeline-nota]').forEach((textarea) => {
    textarea.addEventListener('blur', async () => {
      const id = textarea.dataset.pipelineNota;
      try {
        await apiFetch(`/api/pipeline/${id}`, { method: 'PUT', body: JSON.stringify({ nota: textarea.value }) });
        const item = pipelineData.find((it) => String(it.id) === String(id));
        if (item) item.nota = textarea.value;
      } catch (err) {
        document.getElementById('errorBannerOportunidades').textContent = '❌ ' + err.message;
        document.getElementById('errorBannerOportunidades').style.display = 'block';
      }
    });
  });

  contenedor.querySelectorAll('[data-eliminar-pipeline]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const confirmado = await confirmDialog('¿Quitar esto del pipeline?');
      if (!confirmado) return;
      const id = btn.dataset.eliminarPipeline;
      mostrarProcesando('Eliminando...');
      try {
        await apiFetch(`/api/pipeline/${id}`, { method: 'DELETE' });
        pipelineData = pipelineData.filter((it) => String(it.id) !== String(id));
        renderPipeline();
        cargarOportunidades();
      } catch (err) {
        document.getElementById('errorBannerOportunidades').textContent = '❌ ' + err.message;
        document.getElementById('errorBannerOportunidades').style.display = 'block';
      } finally {
        ocultarProcesando();
      }
    });
  });
}

function renderPipeline() {
  const card = document.getElementById('oportunidadesCard');
  if (pipelineData.length === 0) {
    card.innerHTML = '<div class="empty-state">Todavía no tienes nada en tu portafolio. Agrega ítems desde Notificaciones o Búsquedas con el botón "🗂️ Portafolio".</div>';
    return;
  }

  if (MEDIA_QUERY_MOBILE.matches) renderPipelineMobile(card);
  else renderPipelineKanban(card);
}

function renderPipelineKanban(card) {
  card.innerHTML = `
    <div class="kanban-board">
      ${ESTADOS_PIPELINE.map((estado) => {
        const items = pipelineData.filter((it) => it.estado_personal === estado.valor);
        return `
          <div class="kanban-column" data-columna="${estado.valor}">
            <div class="kanban-column-header">
              <span>${estado.emoji} ${estado.etiqueta}</span>
              <span class="kanban-column-count">${items.length}</span>
            </div>
            <div class="kanban-column-body">${items.map(tarjetaPipelineHtml).join('')}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  wirePipelineControles(card);

  // Drag & drop nativo — enhancement de desktop, el select de cada tarjeta ya alcanza por sí solo.
  let idArrastrando = null;
  card.querySelectorAll('.kanban-card').forEach((el) => {
    el.addEventListener('dragstart', () => {
      idArrastrando = el.dataset.pipelineId;
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  });
  card.querySelectorAll('.kanban-column').forEach((columna) => {
    columna.addEventListener('dragover', (e) => {
      e.preventDefault();
      columna.classList.add('drag-over');
    });
    columna.addEventListener('dragleave', () => columna.classList.remove('drag-over'));
    columna.addEventListener('drop', (e) => {
      e.preventDefault();
      columna.classList.remove('drag-over');
      if (idArrastrando) moverTarjetaPipeline(idArrastrando, columna.dataset.columna);
    });
  });
}

function renderPipelineMobile(card) {
  const opcionesFiltro = ESTADOS_PIPELINE.map((e) => {
    const n = pipelineData.filter((it) => it.estado_personal === e.valor).length;
    return `<option value="${e.valor}" ${e.valor === pipelineFiltroMobileActivo ? 'selected' : ''}>${e.emoji} ${e.etiqueta} (${n})</option>`;
  }).join('');

  card.innerHTML = `
    <div style="padding: 16px 16px 0 16px;">
      <div class="field">
        <label for="pipelineFiltroEstadoMobile">Ver</label>
        <select id="pipelineFiltroEstadoMobile">
          <option value="" ${pipelineFiltroMobileActivo === '' ? 'selected' : ''}>Todos los estados (${pipelineData.length})</option>
          ${opcionesFiltro}
        </select>
      </div>
    </div>
    <div id="pipelineListaMobile"></div>
  `;

  document.getElementById('pipelineFiltroEstadoMobile').addEventListener('change', (e) => {
    pipelineFiltroMobileActivo = e.target.value;
    renderPipelineListaMobile();
  });

  renderPipelineListaMobile();
}

function renderPipelineListaMobile() {
  const contenedor = document.getElementById('pipelineListaMobile');
  if (!contenedor) return;

  const items = pipelineFiltroMobileActivo
    ? pipelineData.filter((it) => it.estado_personal === pipelineFiltroMobileActivo)
    : pipelineData;

  contenedor.innerHTML = items.length === 0
    ? '<div class="empty-state">Nada en este estado todavía.</div>'
    : items.map(filaPipelineHtml).join('');

  wirePipelineControles(contenedor);
}

// Si la pantalla cruza el breakpoint mobile/desktop mientras se está viendo
// el pipeline (ej. rotar el celular, achicar la ventana), se vuelve a
// renderizar con el layout que corresponda (vía renderOportunidadesActiva,
// que además ajusta la clase .card según haga falta).
MEDIA_QUERY_MOBILE.addEventListener('change', () => {
  if (oportunidadesSubtabActiva === 'pipeline') renderOportunidadesActiva();
});

let historialData = [];
let historialPaginaActual = 1;

async function cargarHistorial() {
  const card = document.getElementById('historyCard');
  try {
    const data = await apiFetch('/api/alerts/history');
    historialData = data.historial;
    historialPaginaActual = 1;
    renderHistorial();
    renderInicio();
  } catch (err) {
    card.innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
  }
}

// Botón manual de "Actualizar" en Notificaciones — el backfill de una alerta
// nueva (y el matching normal en general) corren en segundo plano del lado
// del backend, así que no hay forma de que el frontend sepa automáticamente
// cuándo terminó y se generó una notificación nueva. En vez de hacer polling
// automático, se deja en manos del usuario refrescar cuando quiera ver si ya
// llegó algo — más simple y sin llamadas de más de fondo.
document.getElementById('refrescarHistorialBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = 'Actualizando...';
  try {
    await cargarHistorial();
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
});

// --- Inicio: resumen ---
function renderInicio() {
  const activas = configsData.filter((c) => c.activo).length;
  const pausadas = configsData.filter((c) => !c.activo).length;
  const hace7dias = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const notif7d = historialData.filter((h) => h.sent_at && new Date(h.sent_at).getTime() >= hace7dias).length;

  // Es el primer momento crítico de todo el producto: alguien recién
  // confirmó su cuenta y no tiene ni una sola alerta — sin esto, lo único
  // que veía era una fila de "—"/0 sin ninguna indicación de qué hacer.
  document.getElementById('inicioOnboardingBanner').style.display = (activas + pausadas === 0) ? 'block' : 'none';

  document.getElementById('statAlertasActivas').textContent = activas;
  document.getElementById('statAlertasPausadas').textContent = pausadas;
  document.getElementById('statNotifTotal').textContent = historialData.length;
  document.getElementById('statNotif7d').textContent = notif7d;

  renderInicioOportunidades();

  const reporteCard = document.getElementById('inicioReporteCard');
  if (historialData.length === 0) {
    reporteCard.className = 'card';
    reporteCard.innerHTML = '<div class="empty-state">Aún no se te ha enviado ninguna notificación.</div>';
    return;
  }

  const porTipo = { licitacion: 0, compra_agil: 0 };
  const porCanal = {};
  historialData.forEach((h) => {
    if (h.tipo_proceso in porTipo) porTipo[h.tipo_proceso]++;
    porCanal[h.canal] = (porCanal[h.canal] || 0) + 1;
  });

  reporteCard.className = 'inicio-cards-grid';
  reporteCard.innerHTML = `
    <div class="inicio-reporte-grupo">
      <h4>Por tipo de proceso</h4>
      <div class="inicio-reporte-fila"><span>📋 Licitación</span><strong>${porTipo.licitacion}</strong></div>
      <div class="inicio-reporte-fila"><span>⚡ Compra Ágil</span><strong>${porTipo.compra_agil}</strong></div>
    </div>
    <div class="inicio-reporte-grupo">
      <h4>Por canal de envío</h4>
      ${Object.entries(porCanal).map(([canal, cantidad]) => `
        <div class="inicio-reporte-fila">
          <div style="display: flex;">
            <img src="/assets/icons/${canal}.png" class="icon-desc-canal">&nbsp;</img>
            <p>${canal === 'whatsapp' ? 'WhatsApp' : canal === 'telegram' ? 'Telegram' : 'Email'}</p>
          </div>
          <div><strong>${cantidad}</strong></div>
        </div>
      `).join('')}
    </div>
  `;
}

// Resumen de "Oportunidades" (recordatorios + seguimientos) en Inicio — usa
// los mismos arrays que la pestaña Oportunidades (recordatoriosData /
// seguimientosData, cargados en cargarOportunidades) en vez de pedirlos de nuevo.
function renderInicioOportunidades() {
  const card = document.getElementById('inicioOportunidadesCard');
  if (!card) return;

  if (recordatoriosData.length === 0 && seguimientosData.length === 0 && pipelineData.length === 0) {
    card.className = 'card';
    card.innerHTML = '<div class="empty-state">Todavía no agregaste recordatorios, seguimientos ni ítems al portafolio. Hazlo desde Notificaciones o Búsquedas con "🔔 Recordarme" / "➕ Seguir" / "🗂️ Portafolio".</div>';
    return;
  }

  const recordatoriosPendientes = recordatoriosData.filter((r) => !r.notificado_at).length;
  const seguimientosActivos = seguimientosData.filter((s) => !s.resuelta).length;
  const ESTADOS_EN_CURSO = ['por_evaluar', 'evaluando', 'preparando_oferta', 'oferta_enviada'];
  const pipelineEnCurso = pipelineData.filter((it) => ESTADOS_EN_CURSO.includes(it.estado_personal)).length;
  const pipelineGanadas = pipelineData.filter((it) => it.estado_personal === 'ganada').length;

  card.className = 'inicio-cards-grid';
  card.innerHTML = `
    <div class="inicio-reporte-grupo">
      <h4>⏰ Recordatorios</h4>
      <div class="inicio-reporte-fila"><span>Pendientes de avisar</span><strong>${recordatoriosPendientes}</strong></div>
      <div class="inicio-reporte-fila"><span>Total</span><strong>${recordatoriosData.length}</strong></div>
    </div>
    <div class="inicio-reporte-grupo">
      <h4>➕ Seguimientos</h4>
      <div class="inicio-reporte-fila"><span>Licitaciones activas</span><strong>${seguimientosActivos}</strong></div>
      <div class="inicio-reporte-fila"><span>Total</span><strong>${seguimientosData.length}</strong></div>
    </div>
    <div class="inicio-reporte-grupo">
      <h4>🗂️ Portafolio</h4>
      <div class="inicio-reporte-fila"><span>En curso</span><strong>${pipelineEnCurso}</strong></div>
      <div class="inicio-reporte-fila"><span>Ganadas</span><strong>${pipelineGanadas}</strong></div>
      <div class="inicio-reporte-fila"><span>Total</span><strong>${pipelineData.length}</strong></div>
    </div>
  `;
}

function obtenerHistorialFiltrado() {
  const tipo = document.getElementById('filtroTipoHist').value;
  const region = filtroRegionHistSelect.value;
  const fechaCierre = document.getElementById('filtroFechaHist').value;
  const fechaEnvio = document.getElementById('filtroFechaEnvioHist').value;

  return historialData.filter(h => {
    if (tipo && h.tipo_proceso !== tipo) return false;
    if (region && h.region !== region) return false;
    if (filtroCategoriaHistSeleccion && !coincideConFiltroCategoria(h.codigo_categoria, filtroCategoriaHistSeleccion)) return false;
    if (fechaCierre && (!h.fecha_cierre || fechaLocalISO(h.fecha_cierre) !== fechaCierre)) return false;
    if (fechaEnvio && (!h.sent_at || fechaLocalISO(h.sent_at) !== fechaEnvio)) return false;
    return true;
  });
}

function renderHistorial() {
  const card = document.getElementById('historyCard');
  if (historialData.length === 0) {
    card.innerHTML = '<div class="empty-state">Todavía no se te ha enviado ninguna alerta.</div>';
    return;
  }

  const historialFiltrado = obtenerHistorialFiltrado();
  if (historialFiltrado.length === 0) {
    card.innerHTML = '<div class="empty-state">Ningún resultado con los filtros seleccionados.</div>';
    return;
  }

  // Agrupar por codigo_externo — el mismo proceso genera un registro en
  // alerts_sent POR CADA canal (email/telegram) que el usuario tenga
  // configurado, ya que la deduplicación se reserva por canal (ver
  // intentarReservarEnvio en el backend). Eso es correcto a nivel de datos
  // (necesitamos ambos registros para el historial real de envíos), pero
  // antes se mostraba como dos tarjetas idénticas en la UI — acá se agrupan
  // en una sola tarjeta con un tag por canal.
  //
  // Se agrupa ANTES de paginar (no después) para que un grupo nunca quede
  // partido entre dos páginas.
  const gruposPorCodigo = new Map();
  for (const h of historialFiltrado) {
    if (!gruposPorCodigo.has(h.codigo_externo)) {
      gruposPorCodigo.set(h.codigo_externo, { ...h, envios: [] });
    }
    gruposPorCodigo.get(h.codigo_externo).envios.push({ id: h.id, canal: h.canal, sent_at: h.sent_at });
  }
  const grupos = [...gruposPorCodigo.values()];

  const totalPaginas = Math.ceil(grupos.length / HISTORIAL_POR_PAGINA);
  if (historialPaginaActual > totalPaginas) historialPaginaActual = totalPaginas;
  const inicio = (historialPaginaActual - 1) * HISTORIAL_POR_PAGINA;
  const pagina = grupos.slice(inicio, inicio + HISTORIAL_POR_PAGINA);

  const filasHtml = pagina.map(h => `
    <div class="row">
      <div class="row-info">
        <div class="row-title">${h.tipo_proceso === 'compra_agil'
          ? `<a href="https://buscador.mercadopublico.cl/ficha?code=${encodeURIComponent(h.codigo_externo)}" target="_blank" rel="noopener noreferrer">${escapeHtml(h.nombre) || escapeHtml(h.codigo_externo)} ↗</a>`
          : `<a href="http://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(h.codigo_externo)}" target="_blank" rel="noopener noreferrer">${escapeHtml(h.nombre) || escapeHtml(h.codigo_externo)} ↗</a>`
        }</div>
        <div class="row-meta">
          <span>${h.tipo_proceso === 'compra_agil' ? '⚡ Compra Ágil' : '📋 Licitación'}</span>
          <br>
          <span>Código: ${escapeHtml(h.codigo_externo)}</span>
          <br>
          <span>Monto: ${formatMontoConTramo(h)}</span>
          <br>
          <span>Región: ${escapeHtml(h.region)}</span>
          <br>
          <span>Organismo: ${escapeHtml(h.organismo)}</span>
          <br>
          <span>Cierra: ${formatDate(h.fecha_cierre)}</span>
        </div>
        <div class="oportunidad-botones">
          ${botonesOportunidadHtml(h.tipo_proceso, h.codigo_externo, h.nombre, "notificaciones")}
        </div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
          ${h.envios.map((e) => `
            <span class="tag-${e.canal}"><img src="/assets/icons/${e.canal}.png" class="icon-desc-canal">&nbsp;</img> ${e.canal === 'whatsapp' ? 'WhatsApp' : e.canal === 'telegram' ? 'Telegram' : 'Email'} · ${formatDate(e.sent_at)}</span>
          `).join('')}
        </div>
        <button type="button" class="btn btn-danger" data-eliminar-notificacion="${h.envios.map((e) => e.id).join(',')}">✖ Eliminar</button>
      </div>
    </div>
  `).join('');

  const mostrarPaginador = grupos.length > HISTORIAL_POR_PAGINA;
  const paginadorHtml = mostrarPaginador ? `
    <div class="paginador">
      <button type="button" class="btn btn-ghost" id="historialPrev" ${historialPaginaActual === 1 ? 'disabled' : ''}>‹ Anterior</button>
      <span class="paginador-info">Página ${historialPaginaActual} de ${totalPaginas}</span>
      <button type="button" class="btn btn-ghost" id="historialNext" ${historialPaginaActual === totalPaginas ? 'disabled' : ''}>Siguiente ›</button>
    </div>
  ` : '';

  card.innerHTML = filasHtml + paginadorHtml;

  if (mostrarPaginador) {
    document.getElementById('historialPrev').addEventListener('click', () => {
      historialPaginaActual--;
      renderHistorial();
    });
    document.getElementById('historialNext').addEventListener('click', () => {
      historialPaginaActual++;
      renderHistorial();
    });
  }

  // Eliminar del historial — no afecta recordatorios/seguimiento/portafolio
  // en Oportunidades (tablas totalmente independientes, ver
  // eliminarDelHistorial en el backend). Un grupo puede representar más de
  // un registro real (uno por canal) — se borran todos los ids del grupo,
  // ya que desde la perspectiva del usuario es "una sola notificación".
  card.querySelectorAll('[data-eliminar-notificacion]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const confirmado = await confirmDialog('¿Eliminar esta notificación del historial? No afecta ningún recordatorio, seguimiento ni ítem de tu portafolio.');
      if (!confirmado) return;
      const ids = btn.dataset.eliminarNotificacion.split(',');
      mostrarProcesando('Eliminando...');
      try {
        await Promise.all(ids.map((id) => apiFetch(`/api/alerts/history/${id}`, { method: 'DELETE' })));
        historialData = historialData.filter((h) => !ids.includes(String(h.id)));
        renderHistorial();
      } catch (err) {
        showErrorNotificaciones(err.message);
      } finally {
        ocultarProcesando();
      }
    });
  });
}

['filtroEstado', 'filtroTipoProcesoConfig', 'filtroRegionConfig'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    configsPaginaActual = 1;
    renderConfigs();
  });
});

['filtroTipoHist', 'filtroRegionHist', 'filtroFechaHist', 'filtroFechaEnvioHist'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    historialPaginaActual = 1;
    renderHistorial();
  });
});

document.getElementById('limpiarFiltroConfigBtn').addEventListener('click', () => {
  document.getElementById('filtroEstado').value = '';
  document.getElementById('filtroTipoProcesoConfig').value = '';
  filtroRegionConfigSelect.value = '';
  buscadorCategoriaConfig.limpiar();
  filtroCategoriaConfigSeleccion = null;
  configsPaginaActual = 1;
  renderConfigs();
});

document.getElementById('limpiarFiltroHistBtn').addEventListener('click', () => {
  document.getElementById('filtroTipoHist').value = '';
  filtroRegionHistSelect.value = '';
  buscadorCategoriaHist.limpiar();
  filtroCategoriaHistSeleccion = null;
  document.getElementById('filtroFechaHist').value = '';
  document.getElementById('filtroFechaEnvioHist').value = '';
  historialPaginaActual = 1;
  renderHistorial();
});

document.querySelectorAll('.logout-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    localStorage.removeItem('token'); localStorage.removeItem('lastActivityAt');
    window.location.href = 'login.html';
  });
});

// --- Navegación (sidebar desktop + bottom bar y menú superior en mobile) ---
const sectionLinks = document.querySelectorAll('[data-section]');
const secciones = {
  inicio: document.getElementById('secInicio'),
  alertas: document.getElementById('tabAlertas'),
  busquedas: document.getElementById('secBusquedas'),
  notificaciones: document.getElementById('tabNotificaciones'),
  oportunidades: document.getElementById('tabOportunidades'),
  analisis: document.getElementById('tabAnalisis'),
  ia: document.getElementById('secIA'),
  cuenta: document.getElementById('secCuenta'),
  ayuda: document.getElementById('secAyuda'),
};

const bottombarMasBtn = document.getElementById('bottombarMasBtn');

function mostrarSeccion(nombre) {
  sectionLinks.forEach((l) => l.classList.toggle('active', l.dataset.section === nombre));
  setSidebarMenuOpen(false);
  Object.entries(secciones).forEach(([key, el]) => el.classList.toggle('active', key === nombre));
  bottombarMasBtn.classList.toggle('active', nombre === 'analisis' || nombre === 'ia' || nombre === 'oportunidades');
}

sectionLinks.forEach((link) => {
  link.addEventListener('click', () => {
    mostrarSeccion(link.dataset.section);
    if (link.dataset.section === 'cuenta') poblarSeccionCuenta();
    if (link.dataset.section === 'ia') { cargarMisAnalisis(); cargarCupoAnalisis(); }
    topbarMenu.classList.remove('open');
    bottombarMasMenu.classList.remove('open');
  });
});

// --- Menú de identidad del top bar (mobile) ---
const topbarMenuBtn = document.getElementById('topbarMenuBtn');
const topbarMenu = document.getElementById('topbarMenu');

topbarMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  topbarMenu.classList.toggle('open');
});

// --- Menú de identidad del sidebar (escritorio) — mismo patrón que el del
// top bar de mobile, pero se abre hacia arriba porque el disparador está
// pegado al fondo del sidebar (ver .sidebar-menu en dashboard.css).
const sidebarMenuBtn = document.getElementById('sidebarMenuBtn');
const sidebarMenu = document.getElementById('sidebarMenu');
const sidebarNav = document.getElementById('sidebarNav');

function setSidebarMenuOpen(abrir) {
  sidebarMenu.classList.toggle('open', abrir);
  sidebarNav.style.visibility = abrir ? 'hidden' : 'visible';
}

sidebarMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setSidebarMenuOpen(!sidebarMenu.classList.contains('open'));
});

// --- Hoja "Más" del bottom bar (mobile) ---
const bottombarMasMenu = document.getElementById('bottombarMasMenu');

bottombarMasBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  bottombarMasMenu.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!topbarMenu.contains(e.target) && e.target !== topbarMenuBtn) {
    topbarMenu.classList.remove('open');
  }
  if (!sidebarMenu.contains(e.target) && !sidebarMenuBtn.contains(e.target)) {
    setSidebarMenuOpen(false);
  }
  if (!bottombarMasMenu.contains(e.target) && e.target !== bottombarMasBtn) {
    bottombarMasMenu.classList.remove('open');
  }
});

// --- Modal de nueva alerta ---
const newAlertModal = document.getElementById('newAlertModal');

document.getElementById('inicioOnboardingCrearAlertaBtn').addEventListener('click', () => {
  mostrarSeccion('alertas');
  // Reusa el mismo botón/flujo de siempre (con toda su validación de cupo ya
  // resuelta ahí) en vez de duplicar esa lógica acá.
  document.getElementById('abrirNuevaAlertaBtn').click();
});

document.getElementById('abrirNuevaAlertaBtn').addEventListener('click', () => {
  // Chequeo previo en el cliente (el backend igual lo valida) para no dejar
  // abrir el formulario si ya no hay cupo — mejor feedback inmediato.
  const limites = obtenerLimitesPlanActual();
  const activasActuales = configsData.filter((c) => c.activo).length;
  if (limites && activasActuales >= limites.limiteAlertas) {
    showErrorAlertas(`Tu plan (${window.usuarioActual?.plan}) permite hasta ${limites.limiteAlertas} alerta${limites.limiteAlertas === 1 ? '' : 's'} activa${limites.limiteAlertas === 1 ? '' : 's'}. Pausa o elimina alguna antes de crear una nueva.`);
    return;
  }

  categoriasSeleccionadas = [];
  renderCategoriasChips();
  resetRegionDropdown();
  resetCategoriaSelector();
  document.getElementById('newAlertForm').reset();
  resetTramoDropdown();
  resetTipoProceso();
  resetOrganismos();
  // El <details> de "Opciones avanzadas" queda como DOM real entre una
  // apertura y otra del modal (no se recrea) — sin esto, se acordaría solo
  // de haber quedado abierto la vez anterior.
  document.querySelector('#newAlertModal .filter-toggle')?.removeAttribute('open');
  newAlertModal.classList.add('open');
});
document.getElementById('cerrarNuevaAlertaBtn').addEventListener('click', () => {
  newAlertModal.classList.remove('open');
});
newAlertModal.addEventListener('click', (e) => {
  if (e.target === newAlertModal) newAlertModal.classList.remove('open');
});

// --- Análisis de datos ---
const PLANES_CON_ANALISIS = ['full','basico'];

function renderAnalisis(usuario) {
  const card = document.getElementById('analisisCard');
  const buscador = document.getElementById('analisisBuscar').closest('.field');

  if (!PLANES_CON_ANALISIS.includes(usuario.plan)) {
    buscador.style.display = 'none';
    card.innerHTML = `
      <div class="analisis-locked">
        <div class="lock-icon">🔒</div>
        <p><strong>Disponible en los planes Basic y Full</strong></p>
        <p style="font-size:13px; margin-top:6px;">Actualiza tu plan para acceder al análisis de precios de Mercado Público.</p>
      </div>
    `;
  }
}

// --- Buscador de categoría/producto para el análisis ---
const analisisBuscarInput = document.getElementById('analisisBuscar');
const analisisResultadosEl = document.getElementById('analisisResultados');
let analisisBuscarTimeout = null;

if (analisisBuscarInput) {
  analisisBuscarInput.addEventListener('input', () => {
    clearTimeout(analisisBuscarTimeout);
    const texto = analisisBuscarInput.value.trim();

    if (texto.length < 2) {
      analisisResultadosEl.classList.remove('open');
      return;
    }

    analisisBuscarTimeout = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/alerts/categorias/buscar?q=${encodeURIComponent(texto)}`);
        if (data.resultados.length === 0) {
          analisisResultadosEl.innerHTML = '<div class="categoria-resultado-vacio">Sin resultados</div>';
        } else {
          analisisResultadosEl.innerHTML = data.resultados.map((r) => `
            <div class="categoria-resultado-item" data-codigo="${r.codigo}" data-titulo="${r.titulo.replace(/"/g, '&quot;')}">
              <span>${escapeHtml(r.titulo)} <span class="nivel-badge ${r.nivel}">${r.nivel === 'categoria' ? 'Rubro' : r.nivel === 'obra' ? 'Obra' : 'Producto'}</span></span>
              <span class="cod">${r.codigo}</span>
            </div>
          `).join('');

          analisisResultadosEl.querySelectorAll('[data-codigo]').forEach((el) => {
            el.addEventListener('click', () => {
              analisisBuscarInput.value = el.dataset.titulo;
              analisisResultadosEl.classList.remove('open');
              codigoSeleccionadoAnalisis = el.dataset.codigo;
              tituloSeleccionadoAnalisis = el.dataset.titulo;
              renderSubTabAnalisisActiva();
            });
          });
        }
        analisisResultadosEl.classList.add('open');
      } catch (err) {
        console.warn('Error buscando rubros:', err.message);
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!analisisBuscarInput.contains(e.target) && !analisisResultadosEl.contains(e.target)) {
      analisisResultadosEl.classList.remove('open');
    }
  });
}

// --- Sub-pestañas de Análisis (Precios / Proveedores / Razones de rechazo) ---
let codigoSeleccionadoAnalisis = null;
let tituloSeleccionadoAnalisis = null;
let subTabAnalisisActiva = 'precios';

document.querySelectorAll('#analisisSubTabs .tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#analisisSubTabs .tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    subTabAnalisisActiva = btn.dataset.subtab;
    renderSubTabAnalisisActiva();
  });
});

/**
 * Marca con 🔒 los sub-tabs de detalle "completo" (Proveedores, Organismos,
 * Razones de rechazo) cuando el plan del usuario es 'resumen' (Basic) — para
 * que no gasten un clic en algo que ya sabemos que les va a mostrar la nota
 * de upgrade. Se llama una vez desde cargarUsuario(), cuando ya está
 * disponible window.usuarioActual.plan.
 */
async function marcarSubtabsAnalisisBloqueados() {
  if (await detalleAnalisisPreciosEsCompleto()) return; // Full: nada que marcar
  document.querySelectorAll('#analisisSubTabs .tab-btn[data-subtab="proveedores"], #analisisSubTabs .tab-btn[data-subtab="organismos"], #analisisSubTabs .tab-btn[data-subtab="rechazos"]').forEach((btn) => {
    btn.textContent = `🔒 ${btn.textContent}`;
  });
}

// Chequeo genérico de acceso a una feature booleana del plan (ej.
// 'accesoAnalisisPrecios', 'portafolio') — consulta /api/planes (cacheado
// en obtenerPlanesData) contra el plan actual del usuario, en vez de
// hardcodear nombres de plan acá. Si por lo que sea no se puede confirmar
// (fetch falló), se asume SIN acceso — más seguro mostrar de más un mensaje
// de upgrade que dejar pasar a alguien que no debería.
async function tieneAcceso(feature) {
  try {
    const planes = await obtenerPlanesData();
    return Boolean(planes?.[window.usuarioActual?.plan]?.[feature]);
  } catch (err) {
    return false;
  }
}

async function renderSubTabAnalisisActiva() {
  if (!codigoSeleccionadoAnalisis) return;
  if (!(await tieneAcceso('accesoAnalisisPrecios'))) {
    document.getElementById('analisisCard').innerHTML = '<div class="empty-state">El Análisis de Precios de Mercado Público está disponible en los planes Basic y Full. <a href="#" onclick="mostrarSeccion(\'cuenta\'); poblarSeccionCuenta(); return false;" style="color: var(--gold);">Elige un plan →</a></div>';
    return;
  }

  // Proveedores/Organismos/Rechazos son el detalle "completo" (exclusivo
  // Full, ver planes.js) — se corta ANTES de pegarle al backend para no
  // mostrar un error de red, directo la nota de upgrade.
  const esSubtabProfundo = ['proveedores', 'organismos', 'rechazos'].includes(subTabAnalisisActiva);
  if (esSubtabProfundo && !(await detalleAnalisisPreciosEsCompleto())) {
    document.getElementById('analisisCard').innerHTML = '<div class="empty-state">Este nivel de detalle del Análisis de Precios está disponible en el plan Full. <a href="#" onclick="mostrarSeccion(\'cuenta\'); poblarSeccionCuenta(); return false;" style="color: var(--gold);">Elige un plan →</a></div>';
    return;
  }

  if (subTabAnalisisActiva === 'precios') buscarPrecios(codigoSeleccionadoAnalisis, tituloSeleccionadoAnalisis);
  else if (subTabAnalisisActiva === 'proveedores') buscarProveedores(codigoSeleccionadoAnalisis, tituloSeleccionadoAnalisis);
  else if (subTabAnalisisActiva === 'organismos') buscarOrganismos(codigoSeleccionadoAnalisis, tituloSeleccionadoAnalisis);
  else if (subTabAnalisisActiva === 'rechazos') buscarRechazos(codigoSeleccionadoAnalisis, tituloSeleccionadoAnalisis);
}

async function detalleAnalisisPreciosEsCompleto() {
  try {
    const planes = await obtenerPlanesData();
    return planes?.[window.usuarioActual?.plan]?.detalleAnalisisPrecios === 'completo';
  } catch (err) {
    return false;
  }
}

let datosPreciosActuales = null; // { resumen, registros } sin filtrar, tal como llegó del backend

async function buscarPrecios(codigo, titulo) {
  const card = document.getElementById('analisisCard');
  buscandoModal.classList.add('open');

  try {
    const data = await apiFetch(`/api/analisis/precios?codigo=${codigo}`);
    datosPreciosActuales = data;

    if (!data.resumen) {
      card.innerHTML = `<div class="empty-state">Todavía no hay historial de precios para "${titulo}". A medida que se resuelvan licitaciones y Compras Ágiles de esta categoría, van a ir apareciendo acá.</div>`;
      return;
    }

    // Nivel 'resumen' (Basic): el backend no manda `registros` a propósito
    // (ver analisis.routes.js) — se muestra solo el rango de precios, sin
    // la tabla filtrable de detalle por proveedor/organismo.
    if (!data.registros) {
      construirVistaResumenPrecios(data.resumen);
      return;
    }

    construirVistaPrecios();
  } catch (err) {
    card.innerHTML = `<div class="empty-state">Error al buscar: ${err.message}</div>`;
  } finally {
    buscandoModal.classList.remove('open');
  }
}

function construirVistaResumenPrecios(resumen) {
  const card = document.getElementById('analisisCard');
  card.innerHTML = `
    <div class="card" style="padding: 20px;">
      <p class="section-sub" style="margin-bottom: 14px;">Rango de precios adjudicados (${resumen.cantidadRegistros} registro${resumen.cantidadRegistros === 1 ? '' : 's'})</p>
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        <div><div class="section-sub">Mínimo</div><div style="font-size: 20px; font-family: var(--font-mono);">$${resumen.precioMinimo.toLocaleString('es-CL')}</div></div>
        <div><div class="section-sub">Promedio</div><div style="font-size: 20px; font-family: var(--font-mono); color: var(--gold);">$${resumen.precioPromedio.toLocaleString('es-CL')}</div></div>
        <div><div class="section-sub">Máximo</div><div style="font-size: 20px; font-family: var(--font-mono);">$${resumen.precioMaximo.toLocaleString('es-CL')}</div></div>
      </div>
      <p class="form-note" style="margin-top: 16px;">El detalle por proveedor, organismo y contrato individual está disponible en el plan Full. <a href="#" onclick="mostrarSeccion('cuenta'); poblarSeccionCuenta(); return false;" style="color: var(--gold);">Elige un plan →</a></p>
    </div>
  `;
}

function aplicarFiltrosPrecios(registros) {
  const fuente = document.getElementById('filtroPrecioFuente')?.value || '';
  const resultado = document.getElementById('filtroPrecioResultado')?.value || '';
  const producto = (document.getElementById('filtroPrecioProducto')?.value || '').trim().toLowerCase();
  const organismo = (document.getElementById('filtroPrecioOrganismo')?.value || '').trim().toLowerCase();
  const proveedor = (document.getElementById('filtroPrecioProveedor')?.value || '').trim().toLowerCase();
  const fechaDesde = document.getElementById('filtroPrecioFechaDesde')?.value || '';
  const fechaHasta = document.getElementById('filtroPrecioFechaHasta')?.value || '';

  return registros.filter((r) => {
    if (fuente && r.fuente !== fuente) return false;
    // Las licitaciones siempre son "ganadas" por definición (no exponen perdedores).
    const gano = r.fuente === 'licitacion' ? true : !!r.gano;
    if (resultado === 'gano' && !gano) return false;
    if (resultado === 'nogano' && gano) return false;
    if (producto && !(r.nombre_producto || '').toLowerCase().includes(producto)) return false;
    if (organismo && !(r.organismo || '').toLowerCase().includes(organismo)) return false;
    if (proveedor && !(r.proveedor || '').toLowerCase().includes(proveedor)) return false;
    if (fechaDesde && (!r.fecha_adjudicacion || fechaLocalISO(r.fecha_adjudicacion) < fechaDesde)) return false;
    if (fechaHasta && (!r.fecha_adjudicacion || fechaLocalISO(r.fecha_adjudicacion) > fechaHasta)) return false;
    return true;
  });
}

// Se llama UNA vez por búsqueda: arma la barra de filtros + el contenedor de
// resultados, y engancha los listeners. Los inputs de filtro NUNCA se vuelven
// a reconstruir después de esto — si se reconstruyeran en cada tecla, perderían
// lo que el usuario ya escribió (justo el bug que estábamos viendo).
function construirVistaPrecios() {
  const card = document.getElementById('analisisCard');

  card.innerHTML = `
    <details class="analisis-filtros-toggle">
      <summary>Filtros</summary>
      <div class="analisis-filtros">
        <div class="field">
          <label for="filtroPrecioFuente">Fuente</label>
          <select id="filtroPrecioFuente">
            <option value="">Todas</option>
            <option value="licitacion">Licitación</option>
            <option value="compra_agil">Compra Ágil</option>
          </select>
        </div>
        <div class="field">
          <label for="filtroPrecioResultado">Resultado</label>
          <select id="filtroPrecioResultado">
            <option value="">Todos</option>
            <option value="gano">Ganó</option>
            <option value="nogano">No ganó</option>
          </select>
        </div>
        <div class="field">
          <label for="filtroPrecioProducto">Producto</label>
          <input type="text" id="filtroPrecioProducto" placeholder="Buscar...">
        </div>
        <div class="field">
          <label for="filtroPrecioOrganismo">Organismo</label>
          <input type="text" id="filtroPrecioOrganismo" placeholder="Buscar...">
        </div>
        <div class="field">
          <label for="filtroPrecioProveedor">Proveedor</label>
          <input type="text" id="filtroPrecioProveedor" placeholder="Buscar...">
        </div>
        <div class="field">
          <label for="filtroPrecioFechaDesde">Fecha desde</label>
          <input type="date" id="filtroPrecioFechaDesde">
        </div>
        <div class="field">
          <label for="filtroPrecioFechaHasta">Fecha hasta</label>
          <input type="date" id="filtroPrecioFechaHasta">
        </div>
        <div class="field field-btn">
          <button type="button" class="btn btn-ghost" id="limpiarFiltroPrecioBtn">✖ Limpiar filtros</button>
        </div>
      </div>
    </details>
    <div id="preciosResultados"></div>
  `;

  ['filtroPrecioFuente', 'filtroPrecioResultado', 'filtroPrecioProducto', 'filtroPrecioOrganismo', 'filtroPrecioProveedor', 'filtroPrecioFechaDesde', 'filtroPrecioFechaHasta'].forEach((id) => {
    document.getElementById(id).addEventListener('input', actualizarResultadosPrecios);
  });

  document.getElementById('limpiarFiltroPrecioBtn').addEventListener('click', () => {
    ['filtroPrecioFuente', 'filtroPrecioResultado', 'filtroPrecioProducto', 'filtroPrecioOrganismo', 'filtroPrecioProveedor', 'filtroPrecioFechaDesde', 'filtroPrecioFechaHasta'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    actualizarResultadosPrecios();
  });

  actualizarResultadosPrecios();
}

// Esta sí se llama en cada cambio de filtro — solo toca #preciosResultados,
// nunca la barra de filtros, así que los inputs conservan el foco y lo escrito.
function actualizarResultadosPrecios() {
  const contenedor = document.getElementById('preciosResultados');
  const registrosFiltrados = aplicarFiltrosPrecios(datosPreciosActuales.registros);

  const precios = registrosFiltrados
    .map((r) => r.precio_unitario)
    .filter((p) => p !== null && p !== undefined)
    .map((p) => Number(p))
    .filter((p) => !Number.isNaN(p));
  const resumen = precios.length > 0 ? {
    cantidadRegistros: precios.length,
    precioMinimo: Math.min(...precios),
    precioMaximo: Math.max(...precios),
    precioPromedio: Math.round(precios.reduce((a, b) => a + b, 0) / precios.length),
  } : null;

  const filasHtml = registrosFiltrados.map((r) => {
    const resultadoHtml = r.fuente === 'licitacion'
      ? `🏆 Adjudicado${r.numero_oferentes ? ` <span class="row-meta">(${r.numero_oferentes} oferentes)</span>` : ''}`
      : r.gano
        ? '🟢 Ganó'
        // title = tooltip nativo del navegador — a diferencia de uno hecho con
        // CSS, no lo recorta el overflow-x:auto de la tabla ni depende de z-index.
        : `<span title="${(r.motivo_rechazo || 'Sin especificar').replace(/"/g, '&quot;')}" style="border-bottom: 1px dotted var(--text-muted); cursor: help;">⚪ No ganó</span>`;

    return `
      <tr>
        <td>${r.fuente === 'licitacion'
          ? (r.url_acta ? `<a href="${escapeHtml(r.url_acta)}" target="_blank" rel="noopener">📋 Licitación</a>` : '📋 Licitación')
          : '⚡ Compra Ágil'}</td>
        <td>${r.fuente === 'licitacion'
          ? `<a href="${urlFichaLicitacion(r.codigo_externo)}" target="_blank" rel="noopener">${escapeHtml(r.codigo_externo) || '—'}</a>`
          : `<a href="${urlFichaCompraAgil(r.codigo_externo)}" target="_blank" rel="noopener">${escapeHtml(r.codigo_externo) || '—'}</a>`}</td>
        <td>${escapeHtml(r.nombre_producto) || '—'}</td>
        <td>${escapeHtml(r.organismo) || '—'}</td>
        <td>${escapeHtml(r.proveedor) || '—'}</td>
        <td>${formatMoney(r.precio_unitario)}</td>
        <td>${resultadoHtml}</td>
        <td>${r.fecha_adjudicacion ? new Date(r.fecha_adjudicacion).toLocaleDateString('es-CL') : '—'}</td>
      </tr>
    `;
  }).join('');

  contenedor.innerHTML = `
    <div style="padding: 20px; display: flex; gap: 24px; flex-wrap: wrap; border-bottom: 1px solid var(--border);">
      <div><div class="row-meta">Registros</div><strong style="font-size: 20px;">${resumen ? resumen.cantidadRegistros : 0}</strong></div>
      <div><div class="row-meta">Precio mínimo</div><strong style="font-size: 20px; color: var(--down);">${resumen ? formatMoney(resumen.precioMinimo) : '—'}</strong></div>
      <div><div class="row-meta">Precio promedio</div><strong style="font-size: 20px;">${resumen ? formatMoney(resumen.precioPromedio) : '—'}</strong></div>
      <div><div class="row-meta">Precio máximo</div><strong style="font-size: 20px; color: var(--danger);">${resumen ? formatMoney(resumen.precioMaximo) : '—'}</strong></div>
    </div>
    <div class="analisis-table-wrap">
      <table class="analisis-table">
        <thead>
          <tr>
            <th>Fuente</th>
            <th>Código</th>
            <th>Producto</th>
            <th>Organismo</th>
            <th>Proveedor</th>
            <th>Precio unit.</th>
            <th>Resultado</th>
            <th>Fecha Adjudicación</th>
          </tr>
        </thead>
        <tbody>${filasHtml || '<tr><td colspan="8" class="empty-state">Sin resultados para estos filtros.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

let datosProveedoresActuales = null;

async function buscarProveedores(codigo, titulo) {
  const card = document.getElementById('analisisCard');
  buscandoModal.classList.add('open');

  try {
    const data = await apiFetch(`/api/analisis/proveedores?codigo=${codigo}`);
    datosProveedoresActuales = data;

    if (data.ranking.length === 0) {
      card.innerHTML = `<div class="empty-state">Todavía no hay ganadores registrados para "${titulo}".</div>`;
      return;
    }

    construirVistaProveedores();
  } catch (err) {
    card.innerHTML = `<div class="empty-state">Error al buscar: ${err.message}</div>`;
  } finally {
    buscandoModal.classList.remove('open');
  }
}

function construirVistaProveedores() {
  const card = document.getElementById('analisisCard');

  card.innerHTML = `
    <details class="analisis-filtros-toggle">
      <summary>Filtros</summary>
      <div class="analisis-filtros">
        <div class="field">
          <label for="filtroProveedorBuscar">Proveedor (nombre o RUT)</label>
          <input type="text" id="filtroProveedorBuscar" placeholder="Buscar...">
        </div>
        <div class="field">
          <label for="filtroProveedorMinVeces">Mínimo veces ganadas</label>
          <input type="number" id="filtroProveedorMinVeces" min="0" placeholder="0">
        </div>
        <div class="field field-btn">
          <button type="button" class="btn btn-ghost" id="limpiarFiltroProveedorBtn">✖ Limpiar filtros</button>
        </div>
      </div>
    </details>
    <div id="proveedoresResultados"></div>
  `;

  ['filtroProveedorBuscar', 'filtroProveedorMinVeces'].forEach((id) => {
    document.getElementById(id).addEventListener('input', actualizarResultadosProveedores);
  });

  document.getElementById('limpiarFiltroProveedorBtn').addEventListener('click', () => {
    ['filtroProveedorBuscar', 'filtroProveedorMinVeces'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    actualizarResultadosProveedores();
  });

  actualizarResultadosProveedores();
}

function actualizarResultadosProveedores() {
  const contenedor = document.getElementById('proveedoresResultados');
  const buscar = (document.getElementById('filtroProveedorBuscar')?.value || '').trim().toLowerCase();
  const minVeces = Number(document.getElementById('filtroProveedorMinVeces')?.value || 0);

  const filtrados = datosProveedoresActuales.ranking.filter((p) => {
    if (buscar && !((p.nombreProveedor || '').toLowerCase().includes(buscar) || (p.rutProveedor || '').toLowerCase().includes(buscar))) return false;
    if (minVeces && p.vecesGanadas < minVeces) return false;
    return true;
  });

  const filasHtml = filtrados.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <a href="${urlFichaProveedor(p.rutProveedor)}" target="_blank" rel="noopener">${escapeHtml(p.nombreProveedor) || '—'}</a>
        <span class="row-meta">(${p.rutProveedor || '—'})</span>
      </td>
      <td>${p.vecesGanadas}</td>
      <td>${p.licitaciones} Licitacion${p.licitaciones === 1 ? '' : 'es'} · ${p.compraAgil} Compra${p.compraAgil === 1 ? '' : 's'} Ágil</td>
      <td>${formatMoney(p.precioPromedio)}</td>
    </tr>
  `).join('');

  contenedor.innerHTML = `
    <div class="analisis-table-wrap">
      <table class="analisis-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Proveedor</th>
            <th>Veces ganadas</th>
            <th>Detalle</th>
            <th>Precio promedio</th>
          </tr>
        </thead>
        <tbody>${filasHtml || '<tr><td colspan="5" class="empty-state">Sin resultados para estos filtros.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

let datosOrganismosActuales = null;

async function buscarOrganismos(codigo, titulo) {
  const card = document.getElementById('analisisCard');
  buscandoModal.classList.add('open');

  try {
    const data = await apiFetch(`/api/analisis/organismos?codigo=${codigo}`);
    datosOrganismosActuales = data;

    if (data.ranking.length === 0) {
      card.innerHTML = `<div class="empty-state">Todavía no hay compras resueltas registradas para "${titulo}".</div>`;
      return;
    }

    construirVistaOrganismos();
  } catch (err) {
    card.innerHTML = `<div class="empty-state">Error al buscar: ${err.message}</div>`;
  } finally {
    buscandoModal.classList.remove('open');
  }
}

function construirVistaOrganismos() {
  const card = document.getElementById('analisisCard');

  card.innerHTML = `
    <details class="analisis-filtros-toggle">
      <summary>Filtros</summary>
      <div class="analisis-filtros">
        <div class="field">
          <label for="filtroOrganismoBuscar">Organismo</label>
          <input type="text" id="filtroOrganismoBuscar" placeholder="Buscar...">
        </div>
        <div class="field">
          <label for="filtroOrganismoMinVeces">Mínimo veces comprado</label>
          <input type="number" id="filtroOrganismoMinVeces" min="0" placeholder="0">
        </div>
        <div class="field field-btn">
          <button type="button" class="btn btn-ghost" id="limpiarFiltroOrganismoBtn">✖ Limpiar filtros</button>
        </div>
      </div>
    </details>
    <div id="organismosResultados"></div>
  `;

  ['filtroOrganismoBuscar', 'filtroOrganismoMinVeces'].forEach((id) => {
    document.getElementById(id).addEventListener('input', actualizarResultadosOrganismos);
  });

  document.getElementById('limpiarFiltroOrganismoBtn').addEventListener('click', () => {
    ['filtroOrganismoBuscar', 'filtroOrganismoMinVeces'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    actualizarResultadosOrganismos();
  });

  actualizarResultadosOrganismos();
}

function actualizarResultadosOrganismos() {
  const contenedor = document.getElementById('organismosResultados');
  const buscar = (document.getElementById('filtroOrganismoBuscar')?.value || '').trim().toLowerCase();
  const minVeces = Number(document.getElementById('filtroOrganismoMinVeces')?.value || 0);

  const filtrados = datosOrganismosActuales.ranking.filter((o) => {
    if (buscar && !(o.organismo || '').toLowerCase().includes(buscar)) return false;
    if (minVeces && o.vecesComprado < minVeces) return false;
    return true;
  });

  const filasHtml = filtrados.map((o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(o.organismo)}</td>
      <td>${o.vecesComprado}</td>
      <td>${o.licitaciones} Licitacion${o.licitaciones === 1 ? '' : 'es'} · ${o.compraAgil} Compra${o.compraAgil === 1 ? '' : 's'} Ágil</td>
      <td>${formatMoney(o.montoPromedio)}</td>
    </tr>
  `).join('');

  contenedor.innerHTML = `
    <div class="analisis-table-wrap">
      <table class="analisis-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Organismo</th>
            <th>Veces comprado</th>
            <th>Detalle</th>
            <th>Monto promedio</th>
          </tr>
        </thead>
        <tbody>${filasHtml || '<tr><td colspan="5" class="empty-state">Sin resultados para estos filtros.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

let datosRechazosActuales = null;

async function buscarRechazos(codigo, titulo) {
  const card = document.getElementById('analisisCard');
  buscandoModal.classList.add('open');

  try {
    const data = await apiFetch(`/api/analisis/rechazos?codigo=${codigo}`);
    datosRechazosActuales = data;

    if (data.totalRechazadas === 0) {
      card.innerHTML = `<div class="empty-state">Todavía no hay cotizaciones rechazadas registradas para "${titulo}".</div>`;
      return;
    }

    construirVistaRechazos();
  } catch (err) {
    card.innerHTML = `<div class="empty-state">Error al buscar: ${err.message}</div>`;
  } finally {
    buscandoModal.classList.remove('open');
  }
}

function construirVistaRechazos() {
  const card = document.getElementById('analisisCard');

  card.innerHTML = `
    <details class="analisis-filtros-toggle">
      <summary>Filtros</summary>
      <div class="analisis-filtros">
        <div class="field">
          <label for="filtroRechazoBuscar">Buscar en la razón</label>
          <input type="text" id="filtroRechazoBuscar" placeholder="Ej. monto, plazo...">
        </div>
        <div class="field field-btn">
          <button type="button" class="btn btn-ghost" id="limpiarFiltroRechazoBtn">✖ Limpiar filtros</button>
        </div>
      </div>
    </details>
    <div id="rechazosResultados"></div>
  `;

  document.getElementById('filtroRechazoBuscar').addEventListener('input', actualizarResultadosRechazos);

  document.getElementById('limpiarFiltroRechazoBtn').addEventListener('click', () => {
    document.getElementById('filtroRechazoBuscar').value = '';
    actualizarResultadosRechazos();
  });

  actualizarResultadosRechazos();
}

function actualizarResultadosRechazos() {
  const contenedor = document.getElementById('rechazosResultados');
  const buscar = (document.getElementById('filtroRechazoBuscar')?.value || '').trim().toLowerCase();

  const razonesFiltradas = datosRechazosActuales.razones.filter((r) => !buscar || r.razon.toLowerCase().includes(buscar));

  const filasHtml = razonesFiltradas.map((r) => {
    const porcentaje = Math.round((r.cantidad / datosRechazosActuales.totalRechazadas) * 100);
    return `
      <tr>
        <td>${r.razon}</td>
        <td>${r.cantidad} <span class="row-meta">(${porcentaje}%)</span></td>
      </tr>
    `;
  }).join('');

  const mostrarSinRazon = !buscar && datosRechazosActuales.sinRazonEspecificada > 0;
  const filaSinRazon = mostrarSinRazon
    ? `<tr><td>Sin razón especificada</td><td>${datosRechazosActuales.sinRazonEspecificada}</td></tr>`
    : '';

  contenedor.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid var(--border);">
      <div class="row-meta">Total de cotizaciones rechazadas (solo Compra Ágil — licitaciones no exponen a quienes pierden)</div>
      <strong style="font-size: 20px;">${datosRechazosActuales.totalRechazadas}</strong>
    </div>
    <div class="analisis-table-wrap">
      <table class="analisis-table">
        <thead>
          <tr>
            <th>Razón</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>${filasHtml}${filaSinRazon || (filasHtml ? '' : '<tr><td colspan="2" class="empty-state">Sin resultados para este filtro.</td></tr>')}</tbody>
      </table>
    </div>
  `;
}

// --- Sección: Mi cuenta ---
const profileForm = document.getElementById('profileForm');
const passwordForm = document.getElementById('passwordForm');
const profileInfoMsg = document.getElementById('profileInfoMsg');
const passwordInfoMsg = document.getElementById('passwordInfoMsg');

function mostrarMensajeForm(el, mensaje, esExito) {
  el.textContent = mensaje;
  el.className = esExito ? 'form-note success' : 'form-note';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

document.querySelectorAll('.toggle-password').forEach((toggleBtn) => {
  const targetInput = document.getElementById(toggleBtn.dataset.target);
  const iconEye = toggleBtn.querySelector('.icon-eye');
  const iconEyeOff = toggleBtn.querySelector('.icon-eye-off');

  toggleBtn.addEventListener('click', () => {
    const isHidden = targetInput.type === 'password';
    targetInput.type = isHidden ? 'text' : 'password';
    iconEye.style.display = isHidden ? 'none' : '';
    iconEyeOff.style.display = isHidden ? '' : 'none';
    toggleBtn.setAttribute('aria-pressed', String(isHidden));
    toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
});

// ============================================================
// --- Sección: Análisis de Procesos (IA) ---
// ============================================================

let analisisActual = null; // { analisis, tipoProceso, codigo }
let forzarContinuarPendiente = false;

let misAnalisisData = [];
const ANALISIS_MIOS_POR_PAGINA = 5;
let analisisMiosPaginaActual = 1;

async function cargarMisAnalisis() {
  const contenedor = document.getElementById('analisisMisAnalisisLista');
  try {
    const data = await apiFetch('/api/analisis-ia/mios');
    misAnalisisData = data.analisis || [];
    analisisMiosPaginaActual = 1;
    renderMisAnalisis();
  } catch (err) {
    contenedor.innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
  }
}

// Se muestra apenas se entra a la sección, no recién después de intentar un
// análisis — antes, alguien en trial (1 análisis por ciclo) podía gastar su
// único análisis sin saber que era el último que le quedaba.
async function cargarCupoAnalisis() {
  try {
    const data = await apiFetch('/api/analisis-ia/cupo');
    document.getElementById('analisisCupoInfo').textContent = `Te quedan ${data.restante} de ${data.limite} análisis de procesos con IA en tu ciclo actual.`;
  } catch (err) {
    // No es crítico — si falla, simplemente no se muestra el cupo por
    // adelantado, pero el flujo de análisis lo sigue validando igual.
    document.getElementById('analisisCupoInfo').textContent = '';
  }
}

function renderMisAnalisis() {
  const contenedor = document.getElementById('analisisMisAnalisisLista');
  if (!misAnalisisData || misAnalisisData.length === 0) {
    contenedor.innerHTML = '<div class="empty-state">Todavía no analizaste ningún proceso. Usá el buscador de abajo para empezar.</div>';
    return;
  }

  const totalPaginas = Math.ceil(misAnalisisData.length / ANALISIS_MIOS_POR_PAGINA);
  if (analisisMiosPaginaActual > totalPaginas) analisisMiosPaginaActual = totalPaginas;
  const inicio = (analisisMiosPaginaActual - 1) * ANALISIS_MIOS_POR_PAGINA;
  const pagina = misAnalisisData.slice(inicio, inicio + ANALISIS_MIOS_POR_PAGINA);

  const filasHtml = pagina.map((a) => `
    <div class="row">
      <div class="row-info">
        <div class="row-title">${escapeHtml(a.nombre) || escapeHtml(a.codigo_externo)}</div>
        <div class="row-meta">
          <span>${a.tipo_proceso === 'compra_agil' ? '⚡ Compra Ágil' : '📋 Licitación'}</span>
          <br><span>Código: ${escapeHtml(a.codigo_externo)}</span>
          <br><span>${a.sin_adjuntos ? '⚠️ Sin adjuntos' : '📄 Con bases'}</span>
          <br><span>Analizado: ${formatDate(a.updated_at)}</span>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn btn-ghost" data-ver-analisis="${a.id}">Ver →</button>
        <button type="button" class="btn btn-danger" data-eliminar-analisis="${a.id}">✖ Eliminar</button>
      </div>
    </div>
  `).join('');

  const mostrarPaginador = misAnalisisData.length > ANALISIS_MIOS_POR_PAGINA;
  const paginadorHtml = mostrarPaginador ? `
    <div class="paginador">
      <button type="button" class="btn btn-ghost" id="analisisMiosPrev" ${analisisMiosPaginaActual === 1 ? 'disabled' : ''}>‹ Anterior</button>
      <span class="paginador-info">Página ${analisisMiosPaginaActual} de ${totalPaginas}</span>
      <button type="button" class="btn btn-ghost" id="analisisMiosNext" ${analisisMiosPaginaActual === totalPaginas ? 'disabled' : ''}>Siguiente ›</button>
    </div>
  ` : '';

  contenedor.innerHTML = filasHtml + paginadorHtml;

  if (mostrarPaginador) {
    document.getElementById('analisisMiosPrev').addEventListener('click', () => {
      analisisMiosPaginaActual--;
      renderMisAnalisis();
    });
    document.getElementById('analisisMiosNext').addEventListener('click', () => {
      analisisMiosPaginaActual++;
      renderMisAnalisis();
    });
  }

  contenedor.querySelectorAll('[data-ver-analisis]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = misAnalisisData.find((x) => String(x.id) === btn.dataset.verAnalisis);
      if (!a) return;
      document.getElementById('analisisCodigo').value = a.codigo_externo;
      document.querySelector(`input[name="analisisTipo"][value="${a.tipo_proceso}"]`).checked = true;
      document.getElementById('analisisUploadCard').style.display = 'none';
      mostrarResultadoAnalisis(a, a.tipo_proceso, a.codigo_externo, false);
    });
  });

  contenedor.querySelectorAll('[data-eliminar-analisis]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.eliminarAnalisis;
      const confirmado = await confirmDialog('¿Eliminar este análisis de tu listado? Esta acción no se puede deshacer.');
      if (!confirmado) return;
      mostrarProcesando('Eliminando...');
      try {
        await apiFetch(`/api/analisis-ia/${id}`, { method: 'DELETE' });
        misAnalisisData = misAnalisisData.filter((x) => String(x.id) !== id);
        renderMisAnalisis();
      } catch (err) {
        showError('No se pudo eliminar el análisis: ' + err.message);
      } finally {
        ocultarProcesando();
      }
    });
  });
}

function mostrarCupoInfoNuevo(cupoRestante) {
  document.getElementById('analisisCupoInfo').textContent = `Te quedan ${cupoRestante} análisis de IA este mes.`;
}

// Mismas 4 categorías y mismo orden que el backend (checklist-categorias.js)
// — se repite acá porque frontend/backend no comparten módulos. Cubre
// también análisis guardados ANTES de este cambio (sin "categoria" en su
// checklist): esos documentos caen en "Otros" en vez de romper el render.
const CATEGORIAS_CHECKLIST = [
  { valor: 'anexos', etiqueta: 'Anexos' },
  { valor: 'certificados', etiqueta: 'Certificados' },
  { valor: 'legal_societario', etiqueta: 'Documentos legales y societarios' },
  { valor: 'otros', etiqueta: 'Otros' },
];

function agruparChecklist(checklistDocumentos) {
  const valoresValidos = CATEGORIAS_CHECKLIST.map((c) => c.valor);
  const normalizado = (checklistDocumentos || []).map((d) => ({
    ...d,
    categoria: valoresValidos.includes(d.categoria) ? d.categoria : 'otros',
  }));

  return CATEGORIAS_CHECKLIST
    .map((cat) => ({
      categoria: cat.valor,
      etiqueta: cat.etiqueta,
      documentos: normalizado
        .filter((d) => d.categoria === cat.valor)
        .sort((a, b) => (b.obligatorio ? 1 : 0) - (a.obligatorio ? 1 : 0)),
    }))
    .filter((grupo) => grupo.documentos.length > 0);
}

function mostrarResultadoAnalisis(analisis, tipoProceso, codigo, posiblementeDesactualizado) {
  analisisActual = { analisis, tipoProceso, codigo };
  const wrap = document.getElementById('analisisResultadoWrap');
  const c = analisis.contenido;

  document.getElementById('analisisResultadoTitulo').textContent = analisis.nombre? codigo +' - '+ analisis.nombre : codigo;

  const avisoDesact = document.getElementById('analisisAvisoDesactualizado');
  if (posiblementeDesactualizado) {
    avisoDesact.textContent = '⚠️ La fecha de cierre de este proceso cambió desde que se hizo este análisis — es señal de que las bases pueden haber sido modificadas. Te recomendamos rehacer el análisis.';
    avisoDesact.style.display = 'block';
  } else {
    avisoDesact.style.display = 'none';
  }

  const sinAdjuntosHtml = analisis.sin_adjuntos
    ? '<div class="warning-box-inline">⚠️ Este análisis se hizo sin las bases completas — puede faltar información relevante.</div>'
    : '';

  const fechasHtml = (c.fechasClave || []).map((f) => `
    <div class="analisis-fecha-fila"><span>${escapeHtml(f.nombre)}</span><strong>${escapeHtml(f.fecha)}</strong></div>
  `).join('') || '<p class="section-sub">No se identificaron fechas.</p>';

  const gruposChecklist = agruparChecklist(c.checklistDocumentos);
  const checklistHtml = gruposChecklist.map((grupo) => `
    <p style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 14px 0 6px 0;">${grupo.etiqueta}</p>
    ${grupo.documentos.map((d) => `
      <div class="analisis-checklist-item">
        <span class="${d.obligatorio ? 'badge-obligatorio' : 'badge-opcional'}">${d.obligatorio ? '● OBLIGATORIO' : '○ opcional'}</span>
        <div>
          <div>${escapeHtml(d.documento)}</div>
          ${d.notas ? `<div class="section-sub" style="font-size:12px; margin-top:2px;">${escapeHtml(d.notas)}</div>` : ''}
        </div>
      </div>
    `).join('')}
  `).join('') || '<p class="section-sub">No se identificaron documentos exigidos.</p>';

  const criteriosHtml = (c.criteriosEvaluacion || []).map((cr) => `
    <div class="analisis-criterio-fila"><span>${escapeHtml(cr.criterio)}</span><strong>${escapeHtml(cr.ponderacion) || ''}</strong></div>
    ${cr.detalle ? `<p class="section-sub" style="font-size:12px; margin: 2px 0 8px 0;">${escapeHtml(cr.detalle)}</p>` : ''}
  `).join('') || '<p class="section-sub">No se identificaron criterios de evaluación.</p>';

  const puntosHtml = (c.puntosDeAtencion || []).map((p) => `<div class="analisis-punto-atencion">⚠️ ${escapeHtml(p)}</div>`).join('')
    || '<p class="section-sub">Sin puntos de atención identificados.</p>';

  document.getElementById('analisisContenido').innerHTML = `
    ${sinAdjuntosHtml}
    <p style="white-space:pre-line; line-height:1.7;">${escapeHtml(c.resumen) || ''}</p>

    <div class="analisis-seccion">
      <h4>Fechas clave</h4>
      ${fechasHtml}
    </div>

    <div class="analisis-seccion">
      <h4>Checklist de documentos</h4>
      ${checklistHtml}
    </div>

    <div class="analisis-seccion">
      <h4>Criterios de evaluación</h4>
      ${criteriosHtml}
    </div>

    <div class="analisis-seccion">
      <h4>Puntos de atención</h4>
      ${puntosHtml}
    </div>
  `;

  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function mostrarCardSubida(tipoProceso, codigo) {
  const urlFicha = tipoProceso === 'compra_agil' ? urlFichaCompraAgil(codigo) : urlFichaLicitacion(codigo);
  document.getElementById('analisisLinkFicha').href = urlFicha;
  document.getElementById('analisisArchivo').value = '';
  document.getElementById('analisisSinAdjuntos').checked = false;
  document.getElementById('analisisUploadCard').style.display = 'block';
  document.getElementById('analisisUploadCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('analisisBuscarBtn').addEventListener('click', async () => {
  const codigo = document.getElementById('analisisCodigo').value.trim();
  const tipoProceso = document.querySelector('input[name="analisisTipo"]:checked').value;
  const errorEl = document.getElementById('errorAnalisis');
  errorEl.style.display = 'none';

  if (!codigo) {
    errorEl.textContent = 'Ingresa un código.';
    errorEl.style.display = 'block';
    return;
  }

  document.getElementById('analisisUploadCard').style.display = 'none';
  document.getElementById('analisisResultadoWrap').style.display = 'none';

  const btn = document.getElementById('analisisBuscarBtn');
  btn.disabled = true;
  btn.textContent = 'Buscando...';
  mostrarProcesando('Buscando análisis existente...');

  try {
    const data = await apiFetch(`/api/analisis-ia/buscar?tipoProceso=${tipoProceso}&codigo=${encodeURIComponent(codigo)}`);
    if (data.encontrado) {
      mostrarResultadoAnalisis(data.analisis, tipoProceso, codigo, data.posiblementeDesactualizado);
    } else {
      mostrarCardSubida(tipoProceso, codigo);
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Buscar / Analizar';
    ocultarProcesando();
  }
});

async function ejecutarAnalisis() {
  const codigo = document.getElementById('analisisCodigo').value.trim();
  const tipoProceso = document.querySelector('input[name="analisisTipo"]:checked').value;
  const archivo = document.getElementById('analisisArchivo').files[0];
  const sinAdjuntos = document.getElementById('analisisSinAdjuntos').checked;
  const errorEl = document.getElementById('errorAnalisis');
  errorEl.style.display = 'none';

  if (!archivo && !sinAdjuntos) {
    errorEl.textContent = 'Sube un archivo, o marca "No tengo o no existen archivos".';
    errorEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('analisisEjecutarBtn');
  btn.disabled = true;
  btn.textContent = 'Analizando...';
  mostrarProcesando('Analizando con IA... puede tardar unos segundos');

  const formData = new FormData();
  formData.append('tipoProceso', tipoProceso);
  formData.append('codigo', codigo);
  if (archivo) formData.append('archivo', archivo);
  formData.append('sinAdjuntos', sinAdjuntos ? 'true' : 'false');
  if (forzarContinuarPendiente) formData.append('forzarContinuar', 'true');

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/analisis-ia`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // sin Content-Type — FormData lo arma solo con el boundary
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al analizar');

    if (data.requiereConfirmacion) {
      document.getElementById('analisisMismatchRazon').textContent =
        data.razonNoCoincide || 'El documento no parece corresponder al código ingresado.';
      document.getElementById('analisisMismatchModal').classList.add('open');
      return;
    }

    forzarContinuarPendiente = false;
    document.getElementById('analisisUploadCard').style.display = 'none';
    mostrarResultadoAnalisis(data.analisis, tipoProceso, codigo, false);
    mostrarCupoInfoNuevo(data.cupoRestante);
    cargarMisAnalisis();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Analizar con IA';
    ocultarProcesando();
  }
}
document.getElementById('analisisEjecutarBtn').addEventListener('click', ejecutarAnalisis);

document.getElementById('analisisRehacerBtn').addEventListener('click', () => {
  if (!analisisActual) return;
  mostrarCardSubida(analisisActual.tipoProceso, analisisActual.codigo);
});

// --- Modal: documento no corresponde ---
const analisisMismatchModal = document.getElementById('analisisMismatchModal');
document.getElementById('analisisMismatchCancelar').addEventListener('click', () => {
  analisisMismatchModal.classList.remove('open');
  forzarContinuarPendiente = false;
});
document.getElementById('analisisMismatchContinuar').addEventListener('click', () => {
  analisisMismatchModal.classList.remove('open');
  forzarContinuarPendiente = true;
  ejecutarAnalisis(); // el <input type="file"> conserva el archivo elegido, no hace falta pedirlo de nuevo
});
analisisMismatchModal.addEventListener('click', (e) => {
  if (e.target === analisisMismatchModal) {
    analisisMismatchModal.classList.remove('open');
    forzarContinuarPendiente = false;
  }
});

// --- Descargar PDF (mismo patrón que Búsquedas: jsPDF + autotable, cliente) ---
document.getElementById('analisisDescargarPdfBtn').addEventListener('click', () => {
  if (!analisisActual) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt' });
  const { analisis, codigo } = analisisActual;
  const c = analisis.contenido;
  const nombreProceso = analisis.nombre ? `${codigo} - ${escapeHtml(analisis.nombre)}` : codigo;
  const anchoUtil = doc.internal.pageSize.getWidth() - 80; // 40pt de margen a cada lado

  doc.setFontSize(14);
  const tituloLineas = doc.splitTextToSize(`Análisis: ${nombreProceso}`, anchoUtil);
  doc.text(tituloLineas, 40, 40);

  let y = 40 + tituloLineas.length * 16 + 6;

  doc.setFontSize(9);
  doc.text(`Generado el ${new Date().toLocaleString('es-CL')}`, 40, y);
  y += 24;

  doc.setFontSize(10);
  const resumenLineas = doc.splitTextToSize(c.resumen || '', anchoUtil);
  doc.text(resumenLineas, 40, y);

  y = y + resumenLineas.length * 12 + 20;

  // Fechas clave — mismo lugar que en pantalla (justo después del resumen,
  // antes del checklist). Antes esta sección no se incluía en el PDF aunque
  // la IA sí la devuelve (c.fechasClave) y sí se muestra en el dashboard.
  if ((c.fechasClave || []).length > 0) {
    doc.setFontSize(11);
    doc.text('Fechas clave', 40, y);
    y += 6;
    doc.autoTable({
      startY: y,
      head: [['Evento', 'Fecha']],
      body: c.fechasClave.map((f) => [f.nombre, f.fecha]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 30, 40] },
      margin: { left: 40, right: 40 },
    });
    y = doc.lastAutoTable.finalY + 16;
  }

  // Se agrupa por categoría — cada grupo se agrega como su propia tabla con
  // el nombre de la categoría de subtítulo, en vez de una tabla única con
  // todos los documentos mezclados sin orden.
  const gruposChecklist = agruparChecklist(c.checklistDocumentos);
  if (gruposChecklist.length === 0) {
    doc.setFontSize(11);
    doc.text('Checklist de documentos: no se identificaron documentos exigidos.', 40, y);
    y += 24;
  } else {
    gruposChecklist.forEach((grupo) => {
      doc.setFontSize(11);
      doc.text(grupo.etiqueta, 40, y);
      y += 6;
      doc.autoTable({
        startY: y,
        head: [['Documento exigido', 'Obligatorio', 'Notas']],
        body: grupo.documentos.map((d) => [d.documento, d.obligatorio ? 'Sí' : 'No', d.notas || '']),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [30, 30, 40] },
        margin: { left: 40, right: 40 },
      });
      y = doc.lastAutoTable.finalY + 16;
    });
  }

  doc.autoTable({
    startY: y,
    head: [['Puntos de atención']],
    body: (c.puntosDeAtencion || []).map((p) => [p]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 30, 40] },
    margin: { left: 40, right: 40 },
  });

  const nombreArchivo = `Analisis-${nombreProceso.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}.pdf`;
  doc.save(nombreArchivo);
});

// --- Enviar por correo ---
const analisisCorreoModal = document.getElementById('analisisCorreoModal');
document.getElementById('analisisEnviarCorreoBtn').addEventListener('click', () => {
  if (!analisisActual) return;
  document.getElementById('analisisCorreoInput').value = window.usuarioActual?.email || '';
  document.getElementById('errorAnalisisCorreo').style.display = 'none';
  analisisCorreoModal.classList.add('open');
});
document.getElementById('analisisCorreoCancelar').addEventListener('click', () => {
  analisisCorreoModal.classList.remove('open');
});
analisisCorreoModal.addEventListener('click', (e) => {
  if (e.target === analisisCorreoModal) analisisCorreoModal.classList.remove('open');
});
document.getElementById('analisisCorreoConfirmar').addEventListener('click', async () => {
  const email = document.getElementById('analisisCorreoInput').value.trim();
  const errorEl = document.getElementById('errorAnalisisCorreo');
  if (!email) {
    errorEl.textContent = 'Ingresa un correo.';
    errorEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('analisisCorreoConfirmar');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  try {
    await apiFetch(`/api/analisis-ia/${analisisActual.analisis.id}/enviar-correo`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    analisisCorreoModal.classList.remove('open');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar';
  }
});

// --- Ayuda: formulario de contacto ---
document.getElementById('ayudaContactoForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const asunto = document.getElementById('ayudaAsunto').value.trim();
  const mensaje = document.getElementById('ayudaMensaje').value.trim();
  const errorEl = document.getElementById('errorAyudaContacto');
  const noticeEl = document.getElementById('ayudaContactoMsg');
  const btn = document.getElementById('ayudaContactoBtn');

  errorEl.style.display = 'none';
  noticeEl.style.display = 'none';

  if (!asunto || !mensaje) {
    errorEl.textContent = 'Completa el asunto y el mensaje.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';
  mostrarProcesando('Enviando tu mensaje...');

  try {
    await apiFetch('/api/soporte/contacto', {
      method: 'POST',
      body: JSON.stringify({ asunto, mensaje }),
    });
    noticeEl.textContent = '✅ Mensaje enviado — te responderemos a tu correo a la brevedad.';
    noticeEl.style.display = 'block';
    document.getElementById('ayudaContactoForm').reset();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar mensaje';
    ocultarProcesando();
  }
});

function poblarSeccionCuenta() {
  const u = window.usuarioActual;
  if (!u) return;
  document.getElementById('profileEmail').value = u.email || '';
  document.getElementById('profileNombre').value = u.nombre || '';
  document.getElementById('profileApellido').value = u.apellido || '';
  document.getElementById('profileTelefono').value = u.telefono || '';
  document.getElementById('profileNombreEmpresa').value = u.nombre_empresa || '';
  document.getElementById('profileRutEmpresa').value = formatearRut(u.rut_empresa);
  profileInfoMsg.style.display = 'none';
  passwordInfoMsg.style.display = 'none';
  passwordForm.reset();
  cargarSuscripcion();
  cargarEstadoTelegram();
  actualizarVisibilidadWhatsapp();
}

/**
 * Decide si mostrar el bloque de WhatsApp según si el plan actual del
 * usuario lo incluye en su mensajería (planes.js, campo "mensajeria" es un
 * string libre, se detecta por si menciona "WhatsApp" en vez de tener un
 * array estructurado — así lo definió el backend).
 */
async function actualizarVisibilidadWhatsapp() {
  const seccion = document.getElementById('whatsappSeccion');
  try {
    const planes = await obtenerPlanesData();
    const mensajeriaDelPlan = planes?.[window.usuarioActual?.plan]?.mensajeria || '';
    const visible = mensajeriaDelPlan.includes('WhatsApp');
    seccion.style.display = visible ? '' : 'none';
    if (visible) cargarEstadoWhatsapp();
  } catch (err) {
    seccion.style.display = 'none';
  }
}

// --- Notificaciones por WhatsApp (dentro de Mi Perfil) — a diferencia de
// Telegram, acá la vinculación es por código de verificación en 2 pasos
// (número -> código), no por deep-link, porque WhatsApp Business es quien
// inicia el contacto con una plantilla, no el usuario escribiéndole primero.
let whatsappPollingInterval = null;

async function cargarEstadoWhatsapp() {
  try {
    const data = await apiFetch('/api/whatsapp/estado');
    renderWhatsapp(data.vinculado);
  } catch (err) {
    document.getElementById('whatsappContenido').innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
  }
}

function renderWhatsapp(vinculado) {
  const contenedor = document.getElementById('whatsappContenido');

  if (vinculado) {
    contenedor.innerHTML = `
      <p style="color: var(--down); margin-bottom: 12px;">✅ Vinculado — ya recibes tus alertas por WhatsApp.</p>
      <div id="whatsappCuotaContenido" style="margin-bottom: 14px;"><div class="loading">Cargando cupo del mes...</div></div>
      <button type="button" class="btn btn-ghost" id="whatsappDesvincularBtn">Desvincular</button>
    `;
    cargarCuotaWhatsapp();
    document.getElementById('whatsappDesvincularBtn').addEventListener('click', async () => {
      const confirmado = await confirmDialog('¿Desvincular tu WhatsApp? Vas a dejar de recibir alertas por acá — sigues recibiéndolas por correo igual.');
      if (!confirmado) return;
      mostrarProcesando('Desvinculando...');
      try {
        await apiFetch('/api/whatsapp/vincular', { method: 'DELETE' });
        renderWhatsapp(false);
      } catch (err) {
        showError('No se pudo desvincular: ' + err.message);
      } finally {
        ocultarProcesando();
      }
    });
    return;
  }

  contenedor.innerHTML = `
    <button type="button" class="btn" id="whatsappVincularBtn">Vincular WhatsApp</button>
    <p class="form-note" id="whatsappEsperandoMsg" style="display:none; margin-top: 10px;">Se abrió WhatsApp con un mensaje ya escrito — solo tienes que tocar enviar. Esto se actualiza solo apenas confirmes.</p>
  `;

  document.getElementById('whatsappVincularBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Generando...';
    try {
      const data = await apiFetch('/api/whatsapp/generar-codigo', { method: 'POST' });
      window.open(data.link, '_blank', 'noopener');
      btn.textContent = 'Esperando confirmación...';
      document.getElementById('whatsappEsperandoMsg').style.display = '';
      iniciarPollingWhatsapp();
    } catch (err) {
      showError('No se pudo generar el link: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Vincular WhatsApp';
    }
  });
}

/**
 * Barra de cupo mensual de WhatsApp — GET /api/whatsapp/cuota (ver
 * whatsapp.routes.js). El backend puede estar en modo "solo medir"
 * (enforzado: false): en ese caso se cuenta y se muestra igual, pero se
 * aclara que todavía no se corta nada, para no generar alarma antes de
 * tiempo.
 */
async function cargarCuotaWhatsapp() {
  const contenedor = document.getElementById('whatsappCuotaContenido');
  if (!contenedor) return;
  try {
    const data = await apiFetch('/api/whatsapp/cuota');
    if (!data.disponible || !data.limite) {
      contenedor.innerHTML = '';
      return;
    }

    const porcentaje = Math.min(100, Math.round((data.usados / data.limite) * 100));
    const cercaDelTope = porcentaje >= 80;
    const colorBarra = cercaDelTope ? 'var(--gold)' : 'var(--down)';

    const notaModo = !data.enforzado
      ? `<p class="form-note" style="margin-top: 6px; color: var(--gold);">Estamos afinando este límite según el uso real — este mes no se corta nada.</p>`
      : cercaDelTope
        ? `<p class="form-note" style="margin-top: 6px; color: var(--gold);">Si llegas al tope, sigues recibiendo todo por Email sin cortes — solo se pausa WhatsApp hasta el próximo ciclo.</p>`
        : '';

    contenedor.innerHTML = `
      <p class="form-note" style="margin-bottom: 6px;">${data.usados}/${data.limite} mensajes de WhatsApp este mes</p>
      <div style="background: var(--border); border-radius: 4px; height: 6px; overflow: hidden;">
        <div style="background: ${colorBarra}; width: ${porcentaje}%; height: 100%;"></div>
      </div>
      ${notaModo}
    `;
  } catch (err) {
    contenedor.innerHTML = '';
  }
}

/**
 * La vinculación la completa WhatsApp llamando a nuestro webhook cuando
 * mandas el mensaje (no el navegador) — así que el único jeito de que la UI
 * se entere de que ya quedó vinculado es preguntarle al backend cada tanto,
 * hasta que cambie o se cumpla el mismo TTL de 15 min que tiene el código.
 */
function iniciarPollingWhatsapp() {
  if (whatsappPollingInterval) clearInterval(whatsappPollingInterval);
  let intentos = 0;
  const maxIntentos = 90; // 90 * 10s = 15 min, igual al TTL del código
  whatsappPollingInterval = setInterval(async () => {
    intentos++;
    try {
      const data = await apiFetch('/api/whatsapp/estado');
      if (data.vinculado) {
        clearInterval(whatsappPollingInterval);
        whatsappPollingInterval = null;
        renderWhatsapp(true);
        return;
      }
    } catch (err) {
      // Un error puntual de red no debería cortar el polling — reintenta igual.
    }
    if (intentos >= maxIntentos) {
      clearInterval(whatsappPollingInterval);
      whatsappPollingInterval = null;
      renderWhatsapp(false);
    }
  }, 10000);
}

// --- Mi Suscripción (dentro de Mi Perfil) ---
// Trial no tiene nada que mostrar acá (no hay suscripción real todavía) —
// la tarjeta completa se oculta en ese caso.
// --- Notificaciones por Telegram (dentro de Mi Perfil) ---
let telegramPollingInterval = null;

async function cargarEstadoTelegram() {
  try {
    const data = await apiFetch('/api/telegram/estado');
    renderTelegram(data.vinculado);
  } catch (err) {
    document.getElementById('telegramContenido').innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
  }
}

function renderTelegram(vinculado) {
  const contenedor = document.getElementById('telegramContenido');

  if (vinculado) {
    contenedor.innerHTML = `
      <p style="color: var(--down); margin-bottom: 12px;">✅ Vinculado — ya recibes tus alertas por Telegram.</p>
      <button type="button" class="btn btn-ghost" id="telegramDesvincularBtn">Desvincular</button>
    `;
    document.getElementById('telegramDesvincularBtn').addEventListener('click', async () => {
      const confirmado = await confirmDialog('¿Desvincular tu Telegram? Vas a dejar de recibir alertas por acá — sigues recibiéndolas por correo igual.');
      if (!confirmado) return;
      mostrarProcesando('Desvinculando...');
      try {
        await apiFetch('/api/telegram/vincular', { method: 'DELETE' });
        renderTelegram(false);
      } catch (err) {
        showError('No se pudo desvincular: ' + err.message);
      } finally {
        ocultarProcesando();
      }
    });
    return;
  }

  contenedor.innerHTML = `
    <button type="button" class="btn" id="telegramVincularBtn">Vincular Telegram</button>
    <p class="form-note" id="telegramEsperandoMsg" style="display:none; margin-top: 10px;">Abrí el link, tocá "Iniciar" en Telegram, y volvé acá — esto se actualiza solo apenas confirmes.</p>
  `;

  document.getElementById('telegramVincularBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Generando link...';
    try {
      const data = await apiFetch('/api/telegram/generar-link', { method: 'POST' });
      window.open(data.link, '_blank', 'noopener');
      btn.textContent = 'Esperando confirmación...';
      document.getElementById('telegramEsperandoMsg').style.display = '';
      iniciarPollingTelegram();
    } catch (err) {
      showError('No se pudo generar el link: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Vincular Telegram';
    }
  });
}

/**
 * La vinculación la completa Telegram llamando a nuestro webhook (no el
 * navegador del usuario) — así que el único jeito de que la UI se entere de
 * que ya quedó vinculado es preguntarle al backend cada tanto, hasta que
 * cambie o se cumpla el mismo TTL de 15 min que tiene el link (después de
 * eso, si el usuario no confirmó, no tiene sentido seguir preguntando).
 */
function iniciarPollingTelegram() {
  if (telegramPollingInterval) clearInterval(telegramPollingInterval);
  let intentos = 0;
  const maxIntentos = 90; // 90 * 10s = 15 min, igual al TTL del link
  telegramPollingInterval = setInterval(async () => {
    intentos++;
    try {
      const data = await apiFetch('/api/telegram/estado');
      if (data.vinculado) {
        clearInterval(telegramPollingInterval);
        telegramPollingInterval = null;
        renderTelegram(true);
        return;
      }
    } catch (err) {
      // Un error puntual de red no debería cortar el polling — reintenta igual.
    }
    if (intentos >= maxIntentos) {
      clearInterval(telegramPollingInterval);
      telegramPollingInterval = null;
      renderTelegram(false);
    }
  }, 10000);
}

async function cargarSuscripcion() {
  const card = document.getElementById('suscripcionCard');
  const contenedor = document.getElementById('suscripcionContenido');

  card.style.display = '';

  if (window.usuarioActual?.plan === 'trial') {
    renderSuscripcionTrial(window.usuarioActual);
    return;
  }

  contenedor.innerHTML = '<div class="loading">Cargando...</div>';

  try {
    const data = await apiFetch('/api/pagos/mi-suscripcion');
    renderSuscripcion(data);
  } catch (err) {
    contenedor.innerHTML = `<div class="empty-state">Error al cargar: ${err.message}</div>`;
  }
}

// Cache simple — los precios no cambian mientras dura la sesión, no hace
// falta pedirlos de nuevo cada vez que se visita Mi Perfil.
let planesDataCache = null;
async function obtenerPlanesData() {
  if (!planesDataCache) {
    const data = await apiFetch('/api/planes');
    planesDataCache = data.planes;
  }
  return planesDataCache;
}

// Antes, con plan='trial' la tarjeta entera se ocultaba — no había forma de
// ver desde Mi Perfil cuándo terminaba la prueba sin ir a buscarlo en otro
// lado. No pide nada a /api/pagos/mi-suscripcion (esa ruta es para
// suscripciones reales de MercadoPago) — la fecha del trial ya viene en
// /api/auth/me, no hace falta una llamada aparte.
async function renderSuscripcionTrial(usuario) {
  const contenedor = document.getElementById('suscripcionContenido');
  const fechaExp = usuario.fecha_expiracion_trial ? new Date(usuario.fecha_expiracion_trial) : null;

  let diasTexto = '';
  if (fechaExp) {
    const diasRestantes = Math.ceil((fechaExp - new Date()) / (1000 * 60 * 60 * 24));
    diasTexto = diasRestantes > 0
      ? ` (${diasRestantes} día${diasRestantes === 1 ? '' : 's'} restante${diasRestantes === 1 ? '' : 's'})`
      : ' (venció)';
  }

  // Precios desde el backend — así nunca hay que volver a tocar este
  // archivo cuando cambien un valor en planes.js.
  let textoBotonBasico = '✅ Elegir Básico';
  let textoBotonFull = '🌟 Elegir Full';
  try {
    const planes = await obtenerPlanesData();
    textoBotonBasico = `✅ Elegir Básico — $${planes.basico.monto.toLocaleString('es-CL')}/mes`;
    textoBotonFull = `🌟 Elegir Full — $${planes.full.monto.toLocaleString('es-CL')}/mes`;
  } catch (err) {
    // Si falla el fetch de precios, igual se muestran los botones sin el
    // precio en el texto — mejor eso que dejar la pantalla rota.
  }

  contenedor.innerHTML = `
    <div style="font-size: 14px; line-height: 1.9;">
      <span>Plan: <strong>Trial</strong></span><br>
      <span>Finaliza el: ${formatDate(usuario.fecha_expiracion_trial)}${diasTexto}</span>
    </div>
    <p style="color: var(--text-muted); font-size: 13px; margin: 10px 0 0 0;">Elige un plan antes de esa fecha para no perder el acceso a tus alertas — todo lo que configuraste durante la prueba se mantiene guardado.</p>
    <div class="modal-actions" style="justify-content: flex-start; margin-top:20px;">
      <button type="button" class="btn" id="btn-plan-basico" onclick="iniciarUpgrade('${usuario.empresa_id}', 'basico', 'btn-plan-basico')">${textoBotonBasico}</button>
      <button type="button" class="btn" id="btn-plan-full" onclick="iniciarUpgrade('${usuario.empresa_id}', 'full', 'btn-plan-full')">${textoBotonFull}</button>
    </div>
  `;
}

function renderSuscripcion(data) {
  const contenedor = document.getElementById('suscripcionContenido');
  const nombrePlan = data.plan === 'full' ? 'Full' : 'Básico';
  const montoTexto = data.monto != null ? `${formatMoney(data.monto)} / mes` : 'No especificado';

  let estadoHtml;
  if (data.canceladaEn) {
    estadoHtml = `<p style="color: var(--danger); font-size: 13px; margin: 10px 0 0 0;">Cancelada el ${formatDate(data.canceladaEn)} — mantienes acceso hasta que termine el período que ya pagaste. No se te va a volver a cobrar después de eso.</p>`;
  } else if (data.estadoPago === 'activo') {
    estadoHtml = `<p style="color: var(--down); font-size: 13px; margin: 10px 0 0 0;">✅ Activa</p>`;
  } else {
    estadoHtml = `<p style="color: var(--text-muted); font-size: 13px; margin: 10px 0 0 0;">Pendiente de confirmación de pago.</p>`;
  }

  const tarjetaTexto = data.tarjeta?.ultimosDigitos
    ? `Tarjeta terminada en ${escapeHtml(data.tarjeta.ultimosDigitos)}${data.tarjeta.marca ? ` (${escapeHtml(data.tarjeta.marca)})` : ''}`
    : 'No disponible';

  const historialHtml = (data.historialPagos && data.historialPagos.length > 0)
    ? `
      <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse: collapse; margin-top: 8px; font-size: 13px;">
        <thead>
          <tr style="text-align:left; border-bottom: 1px solid var(--border); color: var(--text-muted);">
            <th style="padding: 6px 4px; font-weight: 500;">Fecha</th>
            <th style="padding: 6px 4px; font-weight: 500;">Monto</th>
            <th style="padding: 6px 4px; font-weight: 500;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${data.historialPagos.map((p) => `
            <tr style="border-bottom: 1px solid var(--border);">
              <td style="padding: 6px 4px;">${formatDate(p.fecha)}</td>
              <td style="padding: 6px 4px;">${p.monto != null ? formatMoney(p.monto) : '—'}</td>
              <td style="padding: 6px 4px;">${escapeHtml(p.estado) || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
    `
    : '<p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">Todavía no hay cobros registrados.</p>';

  contenedor.innerHTML = `
    <div style="font-size: 14px; line-height: 1.9;">
      <span>Plan: <strong>${nombrePlan}</strong></span><br>
      <span>Valor: ${montoTexto}</span><br>
      <span>Forma de pago: ${tarjetaTexto}</span>
    </div>
    ${estadoHtml}
    <h4 style="margin: 20px 0 6px 0; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-family: var(--font-mono);">Historial de pagos</h4>
    ${historialHtml}
    ${!data.canceladaEn ? '<div class="modal-actions" style="justify-content: flex-start; margin-top:20px;"><button type="button" class="btn btn-danger" id="btnCancelarSuscripcion">Cancelar suscripción</button></div>' : ''}
  `;

  const btnCancelar = document.getElementById('btnCancelarSuscripcion');
  if (!btnCancelar) return;

  btnCancelar.addEventListener('click', async () => {
    const confirmado = await confirmDialog('¿Cancelar tu suscripción? Vas a mantener el acceso hasta que termine el período que ya pagaste — no se te va a volver a cobrar después de eso.');
    if (!confirmado) return;

    btnCancelar.disabled = true;
    btnCancelar.textContent = 'Cancelando...';
    try {
      await apiFetch('/api/pagos/cancelar', { method: 'POST' });
      cargarSuscripcion();
    } catch (err) {
      mostrarMensajeForm(document.getElementById('suscripcionMsg'), '❌ ' + err.message, false);
      btnCancelar.disabled = false;
      btnCancelar.textContent = 'Cancelar suscripción';
    }
  });
}

// Celular chileno: +56 9 seguido de 8 dígitos (el "56" es opcional para
// aceptar también el número sin código de país, ej. "912345678").
const TELEFONO_REGEX = /^\+?56?9\d{8}$/;

function validarTelefono(telefonoCrudo) {
  const limpio = String(telefonoCrudo || '').replace(/[\s-]/g, '');
  return TELEFONO_REGEX.test(limpio);
}

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('profileNombre').value.trim();
  const apellido = document.getElementById('profileApellido').value.trim();
  const telefonoInput = document.getElementById('profileTelefono');
  const telefono = telefonoInput.value.trim();

  if (telefono && !validarTelefono(telefono)) {
    mostrarMensajeForm(profileInfoMsg, 'El teléfono ingresado no es válido. Verifica el formato (ej. +56 9 1234 5678).', false);
    telefonoInput.focus();
    return;
  }

  try {
    const data = await apiFetch('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ nombre, apellido, telefono }),
    });
    window.usuarioActual = { ...window.usuarioActual, ...data.usuario };
    //document.getElementById('userInfo').textContent =
    //  `${nombre} ${apellido} · ${window.usuarioActual.nombre_empresa || window.usuarioActual.rut_empresa}`;
    mostrarMensajeForm(profileInfoMsg, 'Perfil actualizado correctamente.', true);
  } catch (err) {
    mostrarMensajeForm(profileInfoMsg, err.message, false);
  }
});

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const passwordActual = document.getElementById('passwordActual').value;
  const passwordNueva = document.getElementById('passwordNueva').value;
  const passwordNuevaConfirmar = document.getElementById('passwordNuevaConfirmar').value;

  if (passwordNueva !== passwordNuevaConfirmar) {
    mostrarMensajeForm(passwordInfoMsg, 'Las contraseñas nuevas no coinciden.', false);
    return;
  }

  try {
    await apiFetch('/api/auth/me/password', {
      method: 'PUT',
      body: JSON.stringify({ passwordActual, passwordNueva }),
    });
    mostrarMensajeForm(passwordInfoMsg, 'Contraseña actualizada correctamente.', true);
    passwordForm.reset();
  } catch (err) {
    mostrarMensajeForm(passwordInfoMsg, err.message, false);
  }
});

/**
 * Tema claro/oscuro — el <html> ya puede traer data-theme="light" puesto
 * por el script inline en el <head> (evita el parpadeo del tema oscuro por
 * default antes de que esto corra). Acá solo hace falta: reflejar ese
 * estado en los botones, y manejar el cambio cuando el usuario elige otro.
 *
 * Guardado en localStorage (preferencia solo del navegador, no del backend)
 * — es una elección de UI de bajo impacto, no algo que valga la pena
 * sincronizar entre dispositivos con una columna nueva en la base de datos.
 */
function aplicarTema(tema) {
  const esClaro = tema === 'light';
  document.documentElement.setAttribute('data-theme', esClaro ? 'light' : 'dark');
  localStorage.setItem('tema', esClaro ? 'light' : 'dark');

  const temaMeta = document.getElementById('theme-meta');
  if (temaMeta) temaMeta.setAttribute('content', esClaro ? '#F4F5FA' : '#12172B');

  document.querySelectorAll('.tema-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tema === (esClaro ? 'light' : 'dark'));
  });
}

document.querySelectorAll('.tema-btn').forEach((btn) => {
  btn.addEventListener('click', () => aplicarTema(btn.dataset.tema));
});

aplicarTema(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

/**
 * Acordeón exclusivo de Mi Perfil — abrir un bloque cierra los demás,
 * como un grupo de radio buttons. Usa el evento nativo 'toggle' de
 * <details> (dispara tanto al abrir como al cerrar) en vez del atributo
 * `name` compartido entre <details> — ese atributo da el mismo
 * comportamiento sin JS, pero todavía no lo soportan todos los navegadores
 * relevantes, así que se prefiere esta versión explícita.
 */
document.querySelectorAll('#secCuenta .perfil-acordeon').forEach((detalle) => {
  detalle.addEventListener('toggle', () => {
    if (!detalle.open) return;
    document.querySelectorAll('#secCuenta .perfil-acordeon').forEach((otro) => {
      if (otro !== detalle) otro.open = false;
    });
  });
});

/**
 * Avatar de perfil — se guarda en el backend como data-URI base64 (ver
 * auth.routes.js, POST/DELETE /api/auth/me/avatar). Mismo patrón de subida
 * (fetch + FormData + solo header Authorization) que ya usa el análisis IA
 * para subir bases de licitación, para no inventar uno nuevo.
 *
 * inicialesUsuarioActual se guarda como variable de módulo porque
 * aplicarAvatar() necesita el fallback a iniciales tanto al cargar la
 * página como al borrar el avatar — sin guardarla, habría que
 * recalcularla en dos lugares distintos.
 */
let inicialesUsuarioActual = '';

function aplicarAvatar(avatarData) {
  const topbarBtn = document.getElementById('topbarMenuBtn');
  const sidebarBtn = document.getElementById('sidebarAvatarBtn');
  const preview = document.getElementById('avatarPreview');
  const quitarBtn = document.getElementById('avatarQuitarBtn');

  if (avatarData) {
    topbarBtn.innerHTML = `<img src="${avatarData}" alt="">`;
    if (sidebarBtn) sidebarBtn.innerHTML = `<img src="${avatarData}" alt="">`;
    if (preview) preview.innerHTML = `<img src="${avatarData}" alt="">`;
  } else {
    topbarBtn.textContent = inicialesUsuarioActual;
    if (sidebarBtn) sidebarBtn.textContent = inicialesUsuarioActual;
    if (preview) preview.textContent = '👤';
  }
  if (quitarBtn) quitarBtn.style.display = avatarData ? '' : 'none';
}

/**
 * Redimensiona/comprime la imagen en el navegador ANTES de subirla —
 * así una foto de 12MB de celular no infla el data-URI que se guarda en la
 * base de datos (ver migración 048: se eligió TEXT en vez de un bucket
 * externo, justo para mantenerlo liviano). Devuelve un Blob JPEG.
 */
function redimensionarAvatar(file, maxLado = 256, calidad = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', calidad);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = URL.createObjectURL(file);
  });
}

function mostrarMensajeAvatar(texto, ok) {
  const avatarMsg = document.getElementById('avatarMsg');
  avatarMsg.textContent = texto;
  avatarMsg.className = ok ? 'form-note success' : 'form-note';
  avatarMsg.style.display = 'block';
}

document.getElementById('avatarSubirBtn').addEventListener('click', () => {
  document.getElementById('avatarInput').click();
});

document.getElementById('avatarInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = ''; // permite volver a elegir el mismo archivo después
  if (!file) return;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    mostrarMensajeAvatar('Solo se aceptan imágenes JPG, PNG o WEBP.', false);
    return;
  }

  const btn = document.getElementById('avatarSubirBtn');
  btn.disabled = true;
  btn.textContent = 'Subiendo...';
  document.getElementById('avatarMsg').style.display = 'none';

  try {
    const blob = await redimensionarAvatar(file);
    const formData = new FormData();
    formData.append('avatar', blob, 'avatar.jpg');

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/auth/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // sin Content-Type — FormData arma el boundary solo
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al subir la imagen');

    if (window.usuarioActual) window.usuarioActual.avatar_data = data.avatar_data;
    aplicarAvatar(data.avatar_data);
    mostrarMensajeAvatar('Foto de perfil actualizada.', true);
  } catch (err) {
    mostrarMensajeAvatar(err.message, false);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Subir foto';
  }
});

document.getElementById('avatarQuitarBtn').addEventListener('click', async () => {
  const btn = document.getElementById('avatarQuitarBtn');
  btn.disabled = true;
  document.getElementById('avatarMsg').style.display = 'none';

  try {
    await apiFetch('/api/auth/me/avatar', { method: 'DELETE' });
    if (window.usuarioActual) window.usuarioActual.avatar_data = null;
    aplicarAvatar(null);
    mostrarMensajeAvatar('Foto de perfil eliminada.', true);
  } catch (err) {
    mostrarMensajeAvatar(err.message, false);
  } finally {
    btn.disabled = false;
  }
});

cargarUsuario();
cargarRegiones();
cargarTramos();
cargarConfigs();
cargarHistorial();
cargarBusquedas();
cargarOportunidades();
