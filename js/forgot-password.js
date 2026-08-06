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

const form = document.getElementById('forgotForm');
const errorMsg = document.getElementById('errorMsg');
const noticeMsg = document.getElementById('noticeMsg');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.style.display = 'none';
  noticeMsg.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  const email = document.getElementById('email').value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al procesar la solicitud');
    }

    // El backend siempre responde el mismo mensaje genérico exista o no la
    // cuenta, para no filtrar qué emails están registrados.
    noticeMsg.textContent = data.mensaje;
    noticeMsg.style.display = 'block';
    form.reset();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Link enviado';
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar link de recuperación';
  }
});
