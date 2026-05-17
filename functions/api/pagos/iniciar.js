// Cloudflare Pages Function: POST /api/pagos/iniciar
//
// Inicia un proceso de pago con Bancard vPOS.
// Recibe los datos del pedido, lo crea en DB, llama a Bancard API,
// y devuelve el process_id que el frontend usa para abrir el modal.
//
// ESTADO ACTUAL: stub. Devuelve mock hasta que tengas credenciales Bancard.
// Cuando recibas las credenciales:
// 1. Configurá las env vars en Cloudflare Pages:
//      BANCARD_PUBLIC_KEY
//      BANCARD_PRIVATE_KEY
//      BANCARD_ENVIRONMENT ("staging" | "production")
//      BANCARD_URL_BASE     (https://vpos.infonet.com.py:8888/dist o /dist en prod)
//      SUPABASE_URL
//      SUPABASE_SERVICE_ROLE_KEY
// 2. Descomentá los TODO marcados abajo.
// 3. Probá con tarjetas de prueba (Bancard te las da).

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST')    return json({ error: 'Method not allowed' }, 405, corsHeaders);

  // Verificar env vars de Supabase (esto sí lo tenemos)
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server misconfigured: falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' }, 500, corsHeaders);
  }

  // Verificar si Bancard está configurado
  const bancardConfigurado = !!(env.BANCARD_PUBLIC_KEY && env.BANCARD_PRIVATE_KEY && env.BANCARD_URL_BASE);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400, corsHeaders);
  }

  const { items, cliente, envio, total, descuento_gs, envio_gs, cupon, notas, es_regalo } = body;

  // Validaciones básicas
  if (!items || !Array.isArray(items) || items.length === 0) {
    return json({ error: 'Carrito vacío' }, 400, corsHeaders);
  }
  if (!cliente || !cliente.email || !cliente.nombre) {
    return json({ error: 'Faltan datos del cliente' }, 400, corsHeaders);
  }
  if (!total || total <= 0) {
    return json({ error: 'Total inválido' }, 400, corsHeaders);
  }

  const supaUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const supaH = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // ===== 1. Buscar o crear cliente =====
  let clienteId = null;
  try {
    // Intentar buscar por email
    const lookup = await fetch(`${supaUrl}/rest/v1/clientes?email=eq.${encodeURIComponent(cliente.email)}&select=id`, {
      headers: supaH,
    });
    const found = await lookup.json();
    if (found.length > 0) {
      clienteId = found[0].id;
    } else {
      const create = await fetch(`${supaUrl}/rest/v1/clientes`, {
        method: 'POST',
        headers: supaH,
        body: JSON.stringify({
          nombre: cliente.nombre,
          apellido: cliente.apellido || null,
          email: cliente.email,
          whatsapp: cliente.whatsapp || null,
          ci_ruc: cliente.ci_ruc || null,
          dir_calle: envio?.calle || null,
          dir_ciudad: envio?.ciudad || null,
          dir_referencia: envio?.referencia || null,
        }),
      });
      const newC = await create.json();
      if (Array.isArray(newC) && newC[0]) clienteId = newC[0].id;
    }
  } catch (e) {
    return json({ error: 'No se pudo registrar la clienta: ' + e.message }, 500, corsHeaders);
  }

  // ===== 2. Crear pedido en estado "pendiente" =====
  const subtotalCalc = items.reduce((s, it) => s + (it.cantidad || 1) * (it.precio_unit || 0), 0);
  const totalCalc = subtotalCalc - (descuento_gs || 0) + (envio_gs || 0);
  if (Math.abs(totalCalc - total) > 1) {
    return json({ error: 'Total enviado no coincide con cálculo del servidor', server_total: totalCalc }, 400, corsHeaders);
  }

  let pedidoId, pedidoNumero;
  try {
    const pedidoBody = {
      cliente_id: clienteId,
      subtotal_gs: subtotalCalc,
      descuento_gs: descuento_gs || 0,
      envio_gs: envio_gs || 0,
      total_gs: total,
      cupon_codigo: cupon || null,
      pago_metodo: null, // se completa cuando Bancard responda
      pago_estado: 'pendiente',
      envio_tipo: envio?.tipo || 'asuncion',
      envio_estado: 'pendiente_pago',
      envio_direccion_snapshot: {
        nombre_destinatario: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
        whatsapp: cliente.whatsapp || null,
        calle: envio?.calle || null,
        ciudad: envio?.ciudad || null,
        referencia: envio?.referencia || null,
      },
      notas_internas: notas || null,
      es_regalo: !!es_regalo,
    };
    const pedidoRes = await fetch(`${supaUrl}/rest/v1/pedidos`, {
      method: 'POST',
      headers: supaH,
      body: JSON.stringify(pedidoBody),
    });
    if (!pedidoRes.ok) {
      const txt = await pedidoRes.text();
      return json({ error: 'No se pudo crear el pedido', detail: txt }, 500, corsHeaders);
    }
    const pedidoData = await pedidoRes.json();
    pedidoId = pedidoData[0].id;
    pedidoNumero = pedidoData[0].numero;

    // Insertar items
    const itemRows = items.map(it => ({
      pedido_id: pedidoId,
      producto_id: it.producto_id || null,
      nombre_snapshot: it.nombre,
      sku_snapshot: it.sku || null,
      precio_unit_snapshot: it.precio_unit,
      cantidad: it.cantidad || 1,
      subtotal_gs: (it.cantidad || 1) * it.precio_unit,
    }));
    await fetch(`${supaUrl}/rest/v1/pedido_items`, {
      method: 'POST',
      headers: supaH,
      body: JSON.stringify(itemRows),
    });
  } catch (e) {
    return json({ error: 'Error creando pedido: ' + e.message }, 500, corsHeaders);
  }

  // ===== 3. Iniciar pago en Bancard (o devolver mock si no hay credenciales) =====
  const shopProcessId = `${pedidoNumero}-${Date.now()}`;

  if (!bancardConfigurado) {
    // Modo "no configurado": creamos el registro de intento pero no llamamos a Bancard.
    // Devolvemos un mensaje claro al frontend.
    await fetch(`${supaUrl}/rest/v1/pagos_bancard`, {
      method: 'POST',
      headers: supaH,
      body: JSON.stringify({
        pedido_id: pedidoId,
        shop_process_id: shopProcessId,
        monto_gs: total,
        descripcion: `Pedido #${pedidoNumero} MoMar`,
        estado: 'pendiente_credenciales',
      }),
    });

    // Mandar emails de confirmación (al cliente + a la dueña) — no bloquea el flow si falla
    await enviarEmailsPedido({
      env,
      pedidoNumero,
      cliente,
      items,
      total,
      envioConfig: { tipo: envio?.tipo || 'asuncion', gs: envio_gs || 0 },
      notas,
      esRegalo: !!es_regalo,
    }).catch(e => console.warn('[MoMar] Email fail:', e));

    return json({
      mode: 'sin-bancard',
      pedido_id: pedidoId,
      pedido_numero: pedidoNumero,
      mensaje: 'El pedido se registró correctamente pero la pasarela Bancard aún no está activada. Te vamos a contactar por WhatsApp para coordinar el pago por transferencia.',
      whatsapp_url: `https://wa.me/595981353110?text=${encodeURIComponent(`Hola, hice el pedido #${pedidoNumero} en momar.com.py. Espero por las instrucciones de pago. Total: Gs ${total.toLocaleString('es-PY')}.`)}`,
    }, 200, corsHeaders);
  }

  // ===== 4. Llamada real a Bancard (cuando haya credenciales) =====
  // ⚠️ ESTE BLOQUE NECESITA SER COMPLETADO con la firma HMAC SHA256 que Bancard espera.
  // Mientras tanto devolvemos un mock con instrucciones.

  try {
    // Crear registro de pago
    await fetch(`${supaUrl}/rest/v1/pagos_bancard`, {
      method: 'POST',
      headers: supaH,
      body: JSON.stringify({
        pedido_id: pedidoId,
        shop_process_id: shopProcessId,
        monto_gs: total,
        descripcion: `Pedido #${pedidoNumero} MoMar`,
        estado: 'iniciado',
      }),
    });

    // TODO: Llamada real a Bancard `single_buy`
    // Estructura esperada (de la docs Bancard 2026):
    //
    // POST {BANCARD_URL_BASE}/vpos/api/0.3/single_buy
    // Body: {
    //   "public_key": env.BANCARD_PUBLIC_KEY,
    //   "operation": {
    //     "token": <HMAC-SHA256 firmada con PRIVATE_KEY>,
    //     "shop_process_id": shopProcessId,
    //     "currency": "PYG",
    //     "amount": total.toFixed(2),
    //     "additional_data": "",
    //     "description": `Pedido #${pedidoNumero} MoMar`,
    //     "return_url": `https://momar.com.py/checkout?process=${shopProcessId}`,
    //     "cancel_url": `https://momar.com.py/checkout?process=${shopProcessId}&cancel=1`
    //   }
    // }
    //
    // El token se calcula así:
    //   raw = PRIVATE_KEY + shop_process_id + amount + "PYG"
    //   token = sha256(raw)  // hex lowercase
    //
    // En Cloudflare Workers usás:
    //   const encoder = new TextEncoder();
    //   const hash = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
    //   const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');

    return json({
      error: 'TODO: integrar llamada real a Bancard `single_buy`',
      pedido_id: pedidoId,
      pedido_numero: pedidoNumero,
      shop_process_id: shopProcessId,
      hint: 'Las credenciales están configuradas pero falta completar el código de llamada. Avisame cuando lleguen las credenciales reales y completo este bloque.',
    }, 501, corsHeaders);

  } catch (e) {
    return json({ error: 'Error iniciando pago Bancard: ' + e.message }, 500, corsHeaders);
  }
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// ===== Envío de emails post-pedido vía Resend =====
// Env vars opcionales:
//   RESEND_API_KEY   — la API key de https://resend.com (free 100/día)
//   RESEND_FROM      — email "From" verificado en Resend (ej: "MoMar <pedidos@momar.com.py>")
//   ADMIN_NOTIFY_EMAIL — email donde te llegan las notificaciones de pedidos
//
// Si las env vars no están, NO se manda nada y NO se rompe el flow.
async function enviarEmailsPedido({ env, pedidoNumero, cliente, items, total, envioConfig, notas, esRegalo }) {
  if (!env.RESEND_API_KEY) return; // no configurado, salimos silencioso
  const from = env.RESEND_FROM || 'MoMar <onboarding@resend.dev>';
  const adminEmail = env.ADMIN_NOTIFY_EMAIL || 'multitechmulti727@gmail.com';

  const fmtGs = (n) => 'Gs ' + Number(n || 0).toLocaleString('es-PY');
  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(i.nombre)}<br><small style="color:#999;font-family:monospace;">${escapeHtml(i.sku || '')}</small></td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">×${i.cantidad}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${fmtGs(i.precio_unit * i.cantidad)}</td>
    </tr>
  `).join('');

  // Email para la clienta
  const emailClienta = {
    from,
    to: cliente.email,
    subject: `Recibimos tu pedido #${pedidoNumero} · MoMar`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0F0F0F; background: #F7F5F0;">
        <div style="background: #fff; padding: 32px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-family: Georgia, serif; font-style: italic; font-size: 36px; font-weight: 500; color: #0F0F0F;">MoMar</div>
            <div style="font-size: 11px; letter-spacing: 3px; color: #7A736B; margin-top: 4px;">HOGAR &amp; MÁS</div>
          </div>
          <h1 style="font-family: Georgia, serif; font-style: italic; font-size: 28px; margin: 0 0 8px;">¡Recibimos tu pedido!</h1>
          <p style="color: #7A736B; line-height: 1.6;">Hola ${escapeHtml(cliente.nombre)}, gracias por elegir MoMar. Tu pedido <strong style="color:#0F0F0F;font-family:monospace;">#${pedidoNumero}</strong> quedó registrado.</p>
          <p style="color: #7A736B; line-height: 1.6;"><strong style="color:#0F0F0F;">Te escribimos por WhatsApp en las próximas horas</strong> para coordinar el pago (transferencia o tarjeta) y la entrega.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
            <thead><tr><th style="text-align:left;padding:8px 0;border-bottom:2px solid #0F0F0F;">Pieza</th><th style="text-align:center;padding:8px 0;border-bottom:2px solid #0F0F0F;">Cant.</th><th style="text-align:right;padding:8px 0;border-bottom:2px solid #0F0F0F;">Subtotal</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: right; padding-top: 12px; border-top: 1px solid #ddd; font-size: 16px;">
            <strong>Total: ${fmtGs(total)}</strong>
            ${envioConfig.gs > 0 ? `<br><small style="color:#7A736B;font-size:12px;">Incluye envío ${fmtGs(envioConfig.gs)}</small>` : ''}
          </div>
          ${esRegalo ? '<p style="margin-top:24px;padding:12px;background:#FFF7E6;color:#6E5418;font-size:13px;">🎁 Tu pedido es regalo: lo enviamos sin precio en el packaging.</p>' : ''}
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #ddd; text-align: center;">
            <a href="https://wa.me/595981353110?text=${encodeURIComponent('Hola, hice el pedido #' + pedidoNumero + ' en momar.com.py.')}" style="display: inline-block; background: #25D366; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600;">Escribir por WhatsApp</a>
          </div>
          <p style="text-align: center; color: #999; font-size: 11px; margin-top: 32px; letter-spacing: 1px;">MOMAR · HOGAR &amp; MÁS · ASUNCIÓN</p>
        </div>
      </div>
    `,
  };

  // Email para Moni y Marga (admin notify)
  const direccion = [envioConfig.calle, envioConfig.ciudad, envioConfig.referencia].filter(Boolean).join(' · ');
  const emailAdmin = {
    from,
    to: adminEmail,
    subject: `Pedido nuevo #${pedidoNumero} · ${fmtGs(total)}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0F0F0F;">
        <h1 style="font-size: 22px; margin: 0 0 16px;">📦 Pedido nuevo #${pedidoNumero}</h1>
        <table style="width: 100%; font-size: 13px; margin-bottom: 16px;">
          <tr><td style="padding:6px 0;color:#7A736B;width:120px;">Clienta</td><td><strong>${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#7A736B;">Email</td><td>${escapeHtml(cliente.email)}</td></tr>
          <tr><td style="padding:6px 0;color:#7A736B;">WhatsApp</td><td><a href="https://wa.me/${(cliente.whatsapp || '').replace(/[^0-9]/g,'')}" style="color:#25D366;">${escapeHtml(cliente.whatsapp || '—')}</a></td></tr>
          ${cliente.ci_ruc ? `<tr><td style="padding:6px 0;color:#7A736B;">CI/RUC</td><td>${escapeHtml(cliente.ci_ruc)}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#7A736B;">Envío</td><td>${escapeHtml(envioConfig.tipo)} · ${fmtGs(envioConfig.gs)}</td></tr>
          ${direccion ? `<tr><td style="padding:6px 0;color:#7A736B;">Dirección</td><td>${escapeHtml(direccion)}</td></tr>` : ''}
          ${esRegalo ? '<tr><td style="padding:6px 0;color:#7A736B;">🎁</td><td><strong>Es regalo</strong></td></tr>' : ''}
        </table>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead><tr><th style="text-align:left;padding:6px;background:#F7F5F0;">Pieza</th><th style="text-align:center;padding:6px;background:#F7F5F0;">Cant.</th><th style="text-align:right;padding:6px;background:#F7F5F0;">Subtotal</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align: right; margin-top: 16px; font-size: 16px;"><strong>Total: ${fmtGs(total)}</strong></div>
        ${notas ? `<div style="margin-top:16px;padding:12px;background:#F7F5F0;font-size:13px;"><strong>Notas:</strong> ${escapeHtml(notas)}</div>` : ''}
        <p style="margin-top:24px;">
          <a href="https://momar-tienda.pages.dev/admin/pedidos.html" style="background:#0F0F0F;color:#fff;padding:10px 18px;text-decoration:none;font-size:13px;">Abrir en el panel</a>
        </p>
      </div>
    `,
  };

  const sendOne = async (payload) => {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) console.warn('[MoMar] Resend status', r.status, await r.text());
    } catch (e) {
      console.warn('[MoMar] Resend fetch err:', e);
    }
  };

  await Promise.all([sendOne(emailClienta), sendOne(emailAdmin)]);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
