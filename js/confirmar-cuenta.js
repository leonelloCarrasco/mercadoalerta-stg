// Detecta automáticamente si estamos en desarrollo local o en producción
const API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'http://localhost:3000'
  // Staging: cualquier hostname que contenga "staging" (ej. el nombre que
  // le pongas al Static Site de Render) apunta al backend de staging,
  // nunca al de producción — así no hace falta acordarse de configurar
  // esto a mano en cada deploy nuevo.
  : window.location.hostname.includes('staging')
  ? 'https://mercadoalertabackend-1.onrender.com'
  : 'https://api.mercadoalerta.cl';

const mensajeEl = document.getElementById('mensaje');
const errorMsg = document.getElementById('errorMsg');
const noticeMsg = document.getElementById('noticeMsg');
const footerLink = document.getElementById('footerLink');

const token = new URLSearchParams(window.location.search).get('token');

async function confirmarCuenta() {
  if (!token) {
    mensajeEl.textContent = 'Falta el token de confirmación.';
    errorMsg.textContent = 'Este link no es válido. Revisa que copiaste la URL completa desde tu correo.';
    errorMsg.style.display = 'block';
    footerLink.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/confirmar-cuenta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'No pudimos confirmar tu cuenta');
    }

    // Plan pago (basic/full): el correo confirmó, pero falta el pago —
    // seguimos directo al checkout de MercadoPago.
    if (data.checkoutUrl) {
      mensajeEl.textContent = 'Tu correo fue confirmado. Te llevamos a completar el pago...';
      noticeMsg.textContent = data.mensaje;
      noticeMsg.style.display = 'block';
      setTimeout(() => {
        window.location.href = data.checkoutUrl;
      }, 5000);
      return;
    }

    // Plan trial: cuenta activada de inmediato, se manda al login.
    mensajeEl.textContent = '¡Listo!';
    noticeMsg.replaceChildren(
      document.createTextNode(data.mensaje),
      document.createElement('br'),
      document.createTextNode('Te llevamos a iniciar sesión...'),
      document.createElement('br'),
      document.createElement('br'),
      document.createTextNode('Si no te redirige automáticamente, haz click en el link de abajo.'),
    );
    noticeMsg.style.display = 'block';
    footerLink.style.display = 'block';
    setTimeout(() => {
      window.location.href = 'login.html?verificado=1';
    }, 5000);
  } catch (err) {
    mensajeEl.textContent = 'No pudimos confirmar tu cuenta.';
    errorMsg.textContent = err.message;
    errorMsg.style.display = 'block';
    footerLink.style.display = 'block';
    // El token no nos dice cuál es el correo (es un valor opaco), así que
    // acá sí hace falta pedirlo — a diferencia de register.js, que ya lo
    // tiene guardado de cuando se llenó el formulario.
    document.getElementById('reenviarConfirmacionBloque').style.display = 'block';
  }
}

document.getElementById('reenviarConfirmacionBtn').addEventListener('click', async () => {
  const btn = document.getElementById('reenviarConfirmacionBtn');
  const emailInput = document.getElementById('reenviarConfirmacionEmail');
  const msgEl = document.getElementById('reenviarConfirmacionMsg');
  const email = emailInput.value.trim();

  if (!email) {
    msgEl.textContent = 'Ingresa tu correo.';
    msgEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';
  try {
    const res = await fetch(`${API_BASE}/api/auth/reenviar-confirmacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    msgEl.textContent = data.mensaje || data.error || 'Listo.';
    msgEl.style.display = 'block';
  } catch (err) {
    msgEl.textContent = 'No pudimos reenviar el correo. Intenta de nuevo en un momento.';
    msgEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reenviar correo de confirmación';
  }
});

confirmarCuenta();
