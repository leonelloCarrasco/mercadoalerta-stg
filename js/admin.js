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

/**
 * Escapa HTML antes de insertar texto de origen externo/usuario dentro de un
 * innerHTML — sin esto, un nombre/apellido/email registrado por un usuario
 * (o el nombre de una empresa) podría contener HTML/script que se ejecuta en
 * el navegador del administrador que mire este panel (XSS). Mismo helper que
 * usa dashboard.js — se duplica acá porque son bundles JS independientes.
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

/**
 * Chequeo de acceso BLOQUEANTE, corrido antes que cualquier otra cosa —
 * antes esto se dejaba en manos del primer 403 que devolviera cualquier
 * llamada a /api/admin-panel/*, lo que dejaba una ventana real (mientras esa
 * llamada estaba en vuelo) donde un usuario no-admin veía y podía interactuar
 * con todo el panel: admin.html es HTML estático, el navegador lo renderiza
 * completo antes de que este script siquiera empiece a correr. El <body>
 * arranca con visibility:hidden (ver admin.html) y esta función es la única
 * que lo revela — y solo si /api/auth/me confirma es_admin === true.
 */
async function verificarAccesoAdmin() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders });
    if (res.status === 401) {
      localStorage.removeItem('token'); localStorage.removeItem('lastActivityAt');
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.usuario?.es_admin) {
      document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:#EDEEF5;background:#12172B;min-height:100vh;">No tienes acceso al panel de administrador. <a href="dashboard.html" style="color:#D4A72C;">Volver al dashboard</a></div>';
      document.body.style.visibility = 'visible';
      return;
    }
    document.body.style.visibility = 'visible';
    cargarUsuarios();
  } catch (err) {
    document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:#EDEEF5;background:#12172B;min-height:100vh;">No se pudo verificar tu acceso. <a href="dashboard.html" style="color:#D4A72C;">Volver al dashboard</a></div>';
    document.body.style.visibility = 'visible';
  }
}

function showError(msg) {
  const el = document.getElementById('errorBanner');
  el.textContent = '❌ ' + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

function showNotice(msg) {
  const el = document.getElementById('noticeBanner');
  el.textContent = '✅ ' + msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 6000);
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...authHeaders, ...(options.headers || {}) } });
  if (res.status === 401) {
    localStorage.removeItem('token'); localStorage.removeItem('lastActivityAt');
    window.location.href = 'login.html';
    throw new Error('Sesión inválida');
  }
  if (res.status === 403) {
    document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;color:#EDEEF5;background:#12172B;min-height:100vh;">No tienes acceso al panel de administrador. <a href="dashboard.html" style="color:#D4A72C;">Volver al dashboard</a></div>';
    throw new Error('No autorizado');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// ============================= TABS =============================
document.getElementById('adminTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.admin-tab');
  if (!tab) return;

  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach((s) => { s.style.display = 'none'; });

  tab.classList.add('active');
  document.getElementById(`tab-${tab.dataset.tab}`).style.display = '';
});

// ============================= USUARIOS =============================
let usuariosData = [];

async function cargarUsuarios() {
  try {
    const data = await apiFetch('/api/admin-panel/usuarios');
    usuariosData = data.usuarios;
    renderUsuarios();
  } catch (err) {
    showError('No se pudieron cargar los usuarios: ' + err.message);
  }
}

function renderUsuarios() {
  const tbody = document.getElementById('tablaUsuariosBody');
  tbody.innerHTML = usuariosData.map((u) => `
    <tr>
      <td>${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.nombre_empresa || u.rut_empresa) || '—'}</td>
      <td>${u.plan}</td>
      <td><span class="admin-pill ${u.estado === 'activo' ? 'ok' : 'warn'}">${u.estado}</span></td>
      <td><span class="admin-pill ${u.estado_pago === 'activo' ? 'ok' : 'warn'}">${u.estado_pago}</span></td>
      <td>${u.es_admin ? '✅' : ''}</td>
      <td><button type="button" class="admin-editar-btn" data-id="${u.id}">Editar</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => abrirEditarUsuario(btn.dataset.id));
  });
}

const editarUsuarioModal = document.getElementById('editarUsuarioModal');
const errorBannerEditarUsuario = document.getElementById('errorBannerEditarUsuario');

function abrirEditarUsuario(id) {
  const u = usuariosData.find((x) => String(x.id) === String(id));
  if (!u) return;

  document.getElementById('eu_id').value = u.id;
  document.getElementById('eu_nombre').value = u.nombre || '';
  document.getElementById('eu_apellido').value = u.apellido || '';
  document.getElementById('eu_email').value = u.email || '';
  document.getElementById('eu_telefono').value = u.telefono || '';
  document.getElementById('eu_estado').value = u.estado || 'pendiente_email';
  document.getElementById('eu_rutEmpresa').value = u.rut_empresa || '';
  document.getElementById('eu_nombreEmpresa').value = u.nombre_empresa || '';
  document.getElementById('eu_plan').value = u.plan || 'trial';
  document.getElementById('eu_estadoPago').value = u.estado_pago || 'activo';
  document.getElementById('eu_fechaExpiracionTrial').value = u.fecha_expiracion_trial
    ? new Date(u.fecha_expiracion_trial).toISOString().slice(0, 10) : '';
  document.getElementById('eu_passwordNueva').value = '';
  errorBannerEditarUsuario.style.display = 'none';

  editarUsuarioModal.classList.add('open');
}

document.getElementById('cancelarEditarUsuarioBtn').addEventListener('click', () => {
  editarUsuarioModal.classList.remove('open');
});
editarUsuarioModal.addEventListener('click', (e) => {
  if (e.target === editarUsuarioModal) editarUsuarioModal.classList.remove('open');
});

// ---- Modal de confirmación genérico (usado antes de aplicar la edición) ----
const confirmarModal = document.getElementById('confirmarModal');
let accionConfirmada = null;

function pedirConfirmacion(texto, accion) {
  document.getElementById('confirmarModalTexto').textContent = texto;
  accionConfirmada = accion;
  confirmarModal.classList.add('open');
}
document.getElementById('confirmarModalCancelar').addEventListener('click', () => {
  confirmarModal.classList.remove('open');
  accionConfirmada = null;
});
document.getElementById('confirmarModalAceptar').addEventListener('click', async () => {
  confirmarModal.classList.remove('open');
  if (accionConfirmada) await accionConfirmada();
  accionConfirmada = null;
});

document.getElementById('editarUsuarioForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('eu_id').value;
  const u = usuariosData.find((x) => String(x.id) === String(id));

  pedirConfirmacion(
    `Vas a actualizar la cuenta de ${u.email}. Esto se aplica de inmediato, sin poder deshacerlo automáticamente. ¿Confirmas?`,
    async () => {
      try {
        const body = {
          nombre: document.getElementById('eu_nombre').value.trim(),
          apellido: document.getElementById('eu_apellido').value.trim(),
          email: document.getElementById('eu_email').value.trim(),
          telefono: document.getElementById('eu_telefono').value.trim(),
          estado: document.getElementById('eu_estado').value,
          rutEmpresa: document.getElementById('eu_rutEmpresa').value.trim(),
          nombreEmpresa: document.getElementById('eu_nombreEmpresa').value.trim(),
          rutValidado: document.getElementById('eu_rutValidado').checked,
          aceptaTerminos: document.getElementById('eu_aceptaTerminos').checked,
          plan: document.getElementById('eu_plan').value,
          fechaExpiracionTrial: document.getElementById('eu_fechaExpiracionTrial').value || null,
          estadoPago: document.getElementById('eu_estadoPago').value,
        };
        const passwordNueva = document.getElementById('eu_passwordNueva').value;
        if (passwordNueva) body.passwordNueva = passwordNueva;

        await apiFetch(`/api/admin-panel/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        editarUsuarioModal.classList.remove('open');
        showNotice('Usuario actualizado correctamente.');
        cargarUsuarios();
      } catch (err) {
        errorBannerEditarUsuario.textContent = '❌ ' + err.message;
        errorBannerEditarUsuario.style.display = 'block';
      }
    }
  );
});

document.getElementById('refrescarUsuariosBtn').addEventListener('click', cargarUsuarios);

// ============================= PICKER PRODUCTO/RUBRO (compartido) =============================
// Versión simplificada del picker de alertas (dashboard.js): un solo input de
// búsqueda de texto (mezcla categorías y productos), sin el árbol completo —
// suficiente para uso interno del admin, que ya suele saber qué código busca.
function inicializarPickerProducto(inputId, resultadosId, seleccionadoId, onSeleccionar) {
  const input = document.getElementById(inputId);
  const resultados = document.getElementById(resultadosId);
  const chipSeleccionado = document.getElementById(seleccionadoId);
  let timeoutId;
  let valorSeleccionado = null;

  input.addEventListener('input', () => {
    clearTimeout(timeoutId);
    const texto = input.value.trim();
    if (texto.length < 2) { resultados.classList.remove('open'); return; }

    timeoutId = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/alerts/categorias/buscar?q=${encodeURIComponent(texto)}`);
        resultados.innerHTML = data.resultados.length === 0
          ? '<div class="categoria-resultado-vacio">Sin resultados</div>'
          : data.resultados.map((r) => `
              <div class="categoria-resultado-item" data-codigo="${escapeHtml(r.codigo)}" data-titulo="${escapeHtml(r.titulo)}">
                <span>${escapeHtml(r.titulo)} <span class="nivel-badge ${r.nivel}">${r.nivel === 'categoria' ? 'Rubro' : 'Producto'}</span></span>
                <span class="cod">${escapeHtml(r.codigo)}</span>
              </div>
            `).join('');

        resultados.querySelectorAll('[data-codigo]').forEach((el) => {
          el.addEventListener('click', () => {
            valorSeleccionado = el.dataset.codigo;
            chipSeleccionado.innerHTML = `<span>${escapeHtml(el.dataset.titulo)} (${escapeHtml(el.dataset.codigo)})</span> <button type="button">✕</button>`;
            chipSeleccionado.style.display = 'flex';
            chipSeleccionado.querySelector('button').addEventListener('click', () => {
              valorSeleccionado = null;
              chipSeleccionado.style.display = 'none';
            });
            input.value = '';
            resultados.classList.remove('open');
            if (onSeleccionar) onSeleccionar(valorSeleccionado);
          });
        });
        resultados.classList.add('open');
      } catch (err) {
        console.warn('Error buscando producto/rubro:', err.message);
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultados.contains(e.target)) resultados.classList.remove('open');
  });

  return { obtenerValor: () => valorSeleccionado };
}

const pickerLicitaciones = inicializarPickerProducto('licProductoBuscar', 'licProductoResultados', 'licProductoSeleccionado');
const pickerCompraAgil = inicializarPickerProducto('caProductoBuscar', 'caProductoResultados', 'caProductoSeleccionado');

// ============================= LICITACIONES =============================
let licResultados = [];

document.getElementById('formBuscarLicitaciones').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('licStatus');
  const btn = document.getElementById('licBuscarBtn');
  const fechaInput = document.getElementById('licFecha').value; // yyyy-mm-dd
  const codigo = document.getElementById('licCodigo').value.trim();
  const producto = pickerLicitaciones.obtenerValor();

  const params = new URLSearchParams();
  if (codigo) {
    params.set('codigo', codigo);
  } else {
    if (fechaInput) {
      const [y, m, d] = fechaInput.split('-');
      params.set('fecha', `${d}${m}${y}`); // la API de Mercado Público espera DDMMYYYY
    }
    if (producto) params.set('producto', producto);
  }

  btn.disabled = true;
  btn.textContent = 'Buscando...';
  status.textContent = producto ? 'Esto puede tardar varios minutos (se trae el detalle de cada candidato)...' : 'Buscando...';
  document.getElementById('licResultadosWrap').style.display = 'none';

  try {
    const data = await apiFetch(`/api/admin-panel/buscar/licitaciones?${params}`);
    licResultados = data.resultados;
    status.textContent = `${data.resultados.length} resultado(s)${data.truncado ? ' — se limitó la búsqueda a 30 candidatos, acota más el filtro para ver el resto.' : ''}`;
    renderLicResultados();
  } catch (err) {
    status.textContent = '';
    showError('Error al buscar licitaciones: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buscar';
  }
});

function renderLicResultados() {
  const wrap = document.getElementById('licResultadosWrap');
  const tbody = document.getElementById('licResultadosBody');

  if (licResultados.length === 0) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';

  tbody.innerHTML = licResultados.map((r) => `
    <tr>
      <td><input type="checkbox" class="lic-check" value="${escapeHtml(r.codigoExterno)}" ${r.yaEnBD ? 'disabled' : ''}></td>
      <td>${escapeHtml(r.codigoExterno)}</td>
      <td>${escapeHtml(r.nombre) || '—'}</td>
      <td>${r.fechaCierre ? new Date(r.fechaCierre).toLocaleString('es-CL') : '—'}</td>
      <td>${r.yaEnBD ? '<span class="admin-pill ok">Ya importada</span>' : '<span class="admin-pill warn">Nueva</span>'}</td>
    </tr>
  `).join('');

  actualizarBotonImportarLicitaciones();
  tbody.querySelectorAll('.lic-check').forEach((chk) => chk.addEventListener('change', actualizarBotonImportarLicitaciones));
}

function actualizarBotonImportarLicitaciones() {
  const seleccionados = document.querySelectorAll('.lic-check:checked').length;
  const btn = document.getElementById('licImportarBtn');
  btn.textContent = `Importar seleccionadas (${seleccionados})`;
  btn.disabled = seleccionados === 0;
}

document.getElementById('licSeleccionarTodos').addEventListener('change', (e) => {
  document.querySelectorAll('.lic-check:not(:disabled)').forEach((chk) => { chk.checked = e.target.checked; });
  actualizarBotonImportarLicitaciones();
});

document.getElementById('licImportarBtn').addEventListener('click', () => {
  const codigos = [...document.querySelectorAll('.lic-check:checked')].map((c) => c.value);

  pedirConfirmacion(
    `Vas a importar ${codigos.length} Licitación(es) y disparar el matching de alertas configuradas (se notificará a los usuarios que correspondan). ¿Confirmas?`,
    async () => {
      const btn = document.getElementById('licImportarBtn');
      btn.disabled = true;
      btn.textContent = 'Importando (puede tardar)...';
      try {
        const data = await apiFetch('/api/admin-panel/importar/licitaciones', {
          method: 'POST', body: JSON.stringify({ codigos }),
        });
        showNotice(`${data.importadas} Licitación(es) importada(s) y procesada(s) para alertas.` +
          (data.codigosFallidos.length ? ` (${data.codigosFallidos.length} fallaron)` : ''));
        document.getElementById('formBuscarLicitaciones').dispatchEvent(new Event('submit'));
      } catch (err) {
        showError('Error al importar: ' + err.message);
      } finally {
        actualizarBotonImportarLicitaciones();
      }
    }
  );
});

// ============================= COMPRAS ÁGILES =============================
let caResultados = [];

document.getElementById('formBuscarCompraAgil').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = document.getElementById('caStatus');
  const btn = document.getElementById('caBuscarBtn');
  const ventanaDias = document.getElementById('caVentana').value;
  const codigo = document.getElementById('caCodigo').value.trim();
  const producto = pickerCompraAgil.obtenerValor();

  const params = new URLSearchParams();
  if (codigo) {
    params.set('codigo', codigo);
  } else {
    if (ventanaDias) params.set('ventanaDias', ventanaDias);
    if (producto) params.set('producto', producto);
  }

  btn.disabled = true;
  btn.textContent = 'Buscando...';
  status.textContent = producto ? 'Esto puede tardar (se trae el detalle de cada candidato) y consume cuota diaria de la API...' : 'Buscando...';
  document.getElementById('caResultadosWrap').style.display = 'none';

  try {
    const data = await apiFetch(`/api/admin-panel/buscar/compras-agiles?${params}`);
    caResultados = data.resultados;
    status.textContent = `${data.resultados.length} resultado(s)${data.truncado ? ' — se limitó la búsqueda a 30 candidatos.' : ''}`;
    renderCaResultados();
  } catch (err) {
    status.textContent = '';
    showError('Error al buscar Compras Ágiles: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buscar';
  }
});

function renderCaResultados() {
  const wrap = document.getElementById('caResultadosWrap');
  const tbody = document.getElementById('caResultadosBody');

  if (caResultados.length === 0) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';

  tbody.innerHTML = caResultados.map((r) => `
    <tr>
      <td><input type="checkbox" class="ca-check" value="${escapeHtml(r.codigo)}" ${r.yaEnBD ? 'disabled' : ''}></td>
      <td>${escapeHtml(r.codigo)}</td>
      <td>${escapeHtml(r.nombre) || '—'}</td>
      <td>${r.fechaCierre ? new Date(r.fechaCierre).toLocaleString('es-CL') : '—'}</td>
      <td>${r.yaEnBD ? '<span class="admin-pill ok">Ya importada</span>' : '<span class="admin-pill warn">Nueva</span>'}</td>
    </tr>
  `).join('');

  actualizarBotonImportarCompraAgil();
  tbody.querySelectorAll('.ca-check').forEach((chk) => chk.addEventListener('change', actualizarBotonImportarCompraAgil));
}

function actualizarBotonImportarCompraAgil() {
  const seleccionados = document.querySelectorAll('.ca-check:checked').length;
  const btn = document.getElementById('caImportarBtn');
  btn.textContent = `Importar seleccionadas (${seleccionados})`;
  btn.disabled = seleccionados === 0;
}

document.getElementById('caSeleccionarTodos').addEventListener('change', (e) => {
  document.querySelectorAll('.ca-check:not(:disabled)').forEach((chk) => { chk.checked = e.target.checked; });
  actualizarBotonImportarCompraAgil();
});

document.getElementById('caImportarBtn').addEventListener('click', () => {
  const codigos = [...document.querySelectorAll('.ca-check:checked')].map((c) => c.value);

  pedirConfirmacion(
    `Vas a importar ${codigos.length} Compra(s) Ágil(es) y disparar el matching de alertas configuradas. ¿Confirmas?`,
    async () => {
      const btn = document.getElementById('caImportarBtn');
      btn.disabled = true;
      btn.textContent = 'Importando...';
      try {
        const data = await apiFetch('/api/admin-panel/importar/compras-agiles', {
          method: 'POST', body: JSON.stringify({ codigos }),
        });
        showNotice(`${data.importadas} Compra(s) Ágil(es) importada(s) y procesada(s) para alertas.` +
          (data.codigosFallidos.length ? ` (${data.codigosFallidos.length} fallaron)` : ''));
        document.getElementById('formBuscarCompraAgil').dispatchEvent(new Event('submit'));
      } catch (err) {
        showError('Error al importar: ' + err.message);
      } finally {
        actualizarBotonImportarCompraAgil();
      }
    }
  );
});

// ============================= INIT =============================
verificarAccesoAdmin();
