document.querySelectorAll('#copyrightYear').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
