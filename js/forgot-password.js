const API_BASE = 'https://mercadoalertabackend-1.onrender.com';

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
