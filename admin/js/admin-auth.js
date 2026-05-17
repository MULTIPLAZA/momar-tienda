// Auth real para el panel admin de MoMar
// - Verifica que haya sesión Supabase
// - Si no, redirige a login.html
// - Expone window.MOMAR_ADMIN_USER con datos del usuario logueado
// - window.MOMAR_supabase queda como cliente reutilizable
//
// Uso: incluir DESPUÉS del SDK de supabase-js y ANTES del admin-shell:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="js/admin-auth.js"></script>
//   <script src="js/admin-shell-2026-05-15.js"></script>

(function() {
  const SUPABASE_URL  = 'https://tfpnfkigfvpvuhnxwpij.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcG5ma2lnZnZwdnVobnh3cGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTI3MTEsImV4cCI6MjA5NDQyODcxMX0.gIlRtTF9qPrGACI-xmxjzeWUydU-3U2UVMAl-Nwtvgg';

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('[MOMAR-AUTH] supabase-js no cargado');
    return;
  }

  // Cliente con persistencia de sesión activa (usa localStorage)
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
      storageKey: 'momar-admin-auth',
    }
  });
  window.MOMAR_supabase = client;

  // Resolver promesa de auth para que las páginas puedan await
  window.MOMAR_AUTH_READY = client.auth.getSession().then(async ({ data }) => {
    const session = data && data.session;
    if (!session) {
      // No hay sesión: redirigir a login (a menos que ya estemos ahí)
      if (!/login\.html/.test(location.pathname)) {
        sessionStorage.setItem('momar-admin-after-login', location.pathname);
        location.replace('login.html');
      }
      return null;
    }

    const user = session.user;
    const meta = user.user_metadata || {};
    const nombre = meta.nombre || (user.email || '').split('@')[0] || 'Admin';
    const apellido = meta.apellido || '';
    window.MOMAR_ADMIN_USER = {
      id: user.id,
      email: user.email,
      nombre,
      apellido,
      rol: meta.rol === 'owner' ? 'Dueña' : (meta.rol || 'Admin'),
      inicial: ((nombre[0] || 'A') + (apellido[0] || '')).toUpperCase(),
    };

    return session;
  });

  // Logout helper global
  window.MOMAR_logout = async function() {
    await client.auth.signOut();
    location.replace('login.html');
  };

  // Listener: si la sesión expira, refresh automático del SDK.
  // Si vuelve null (logout/expirado), redirigimos a login.
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' && !/login\.html/.test(location.pathname)) {
      location.replace('login.html');
    }
  });
})();
