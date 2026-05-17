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

    return json({
      mode: 'sin-bancard',
      pedido_id: pedidoId,
      pedido_numero: pedidoNumero,
      mensaje: 'El pedido se registró correctamente pero la pasarela Bancard aún no está activada. La dueña te va a contactar por WhatsApp para coordinar el pago por transferencia.',
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
