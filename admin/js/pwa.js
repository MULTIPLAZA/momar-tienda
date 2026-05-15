// Registro Service Worker + botón "Instalar app"
(function() {
  // Registro del SW
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          // Si hay update, avisamos
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] Nueva versión disponible — recargá para aplicar.');
              }
            });
          });
        })
        .catch((err) => console.warn('[PWA] SW falló al registrar:', err));
    });
  }

  // Capturar evento beforeinstallprompt
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mostrarBotonInstalar();
  });

  function mostrarBotonInstalar() {
    let btn = document.querySelector('.js-install-pwa');
    if (!btn) {
      // Inyectar botón flotante abajo a la derecha
      btn = document.createElement('button');
      btn.className = 'js-install-pwa pwa-install-btn';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M3 21h18"/>
        </svg>
        Instalar app
      `;
      document.body.appendChild(btn);

      // Estilo inline para evitar tocar el CSS principal (mismo look que .btn-sm--primary)
      Object.assign(btn.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#0F0F0F',
        color: '#F7F5F0',
        border: 'none',
        padding: '10px 16px',
        fontSize: '12px',
        letterSpacing: '0.5px',
        fontWeight: '600',
        cursor: 'pointer',
        zIndex: '999',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'inherit',
        boxShadow: '0 4px 14px rgba(15,15,15,0.25)',
        animation: 'pwa-slide-in 0.4s ease'
      });
    }
    btn.style.display = 'inline-flex';

    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      btn.style.display = 'none';
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log('[PWA] Usuario eligió:', choice.outcome);
      deferredPrompt = null;
    }, { once: true });
  }

  // Detectar si ya está instalado
  window.addEventListener('appinstalled', () => {
    const btn = document.querySelector('.js-install-pwa');
    if (btn) btn.remove();
    console.log('[PWA] App instalada en escritorio');
  });

  // Si la app corre como PWA, agregamos clase al body para personalizar
  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      window.navigator.standalone === true) {
    document.documentElement.classList.add('is-pwa');
  }
})();
