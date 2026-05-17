// Cloudflare Pages Function: /api/newsletter
// Actúa como proxy entre admin/newsletter.html y Supabase.
// La SERVICE_ROLE_KEY queda en el server (env vars de Cloudflare), no en el cliente.
//
// Auth: header "X-Admin-Password" debe coincidir con env.ADMIN_PASSWORD
//
// Endpoints:
//   GET    /api/newsletter         → lista todos los suscriptores
//   DELETE /api/newsletter?id=xxx  → borra un suscriptor por id
//
// Env vars requeridas en Cloudflare Pages (Settings → Environment variables):
//   SUPABASE_URL                = https://tfpnfkigfvpvuhnxwpij.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   = eyJ… (el service_role secret de Supabase)
//   ADMIN_PASSWORD              = el password elegido por el dueño

export async function onRequest(context) {
  const { request, env } = context;

  // CORS (mismo origen pero por las dudas)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  };
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verificar env vars
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.ADMIN_PASSWORD) {
    return json({ error: 'Server misconfigured: faltan env vars en Cloudflare Pages' }, 500, corsHeaders);
  }

  // Verificar password de admin
  const sentPass = request.headers.get('X-Admin-Password');
  if (!sentPass || sentPass !== env.ADMIN_PASSWORD) {
    return json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const supaUrl = env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/newsletter_emails';
  const supaHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // GET → listar
  if (request.method === 'GET') {
    const r = await fetch(
      `${supaUrl}?select=id,email,created_at,origen,user_agent&order=created_at.desc`,
      { headers: supaHeaders }
    );
    if (!r.ok) {
      const txt = await r.text();
      return json({ error: 'Supabase error', detail: txt }, 502, corsHeaders);
    }
    const data = await r.json();
    return json(data, 200, corsHeaders);
  }

  // DELETE → borrar por id
  if (request.method === 'DELETE') {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'Missing id' }, 400, corsHeaders);

    const r = await fetch(`${supaUrl}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: supaHeaders,
    });
    if (!r.ok) {
      const txt = await r.text();
      return json({ error: 'Supabase error', detail: txt }, 502, corsHeaders);
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return json({ error: 'Method not allowed' }, 405, corsHeaders);
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
