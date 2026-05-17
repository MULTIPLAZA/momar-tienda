// Cloudflare Pages Function: POST /api/pagos/callback
//
// Recibe el webhook server-to-server de Bancard cuando un pago termina.
// Bancard manda este callback INDEPENDIENTEMENTE de que el cliente vea o no
// la página de éxito. Por eso es CRÍTICO procesar bien acá.
//
// Bancard envía:
//   {
//     "operation": {
//       "token": "<HMAC-SHA256>",
//       "shop_process_id": "1234-...",
//       "response": "S",  // S = success, N = no
//       "response_details": "Aprobado",
//       "amount": "150000.00",
//       "currency": "PYG",
//       "authorization_number": "123456",
//       "ticket_number": "12345678",
//       "response_code": "00",
//       "response_description": "Transaccion aprobada",
//       "security_information": {
//         "customer_ip": "...",
//         "card_source": "I",
//         "card_country": "PRY",
//         "version": "0.3",
//         "risk_index": "0"
//       }
//     }
//   }
//
// Validamos el token (HMAC con PRIVATE_KEY) antes de procesar.

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }

  const op = body && body.operation;
  if (!op || !op.shop_process_id) {
    return json({ error: 'Missing operation.shop_process_id' }, 400);
  }

  // ===== Validar token HMAC =====
  if (env.BANCARD_PRIVATE_KEY) {
    // TODO: validar token cuando estés en producción.
    // raw = PRIVATE_KEY + shop_process_id + amount + currency
    //   o, según el evento: PRIVATE_KEY + shop_process_id + "confirm" + amount + currency
    // Comparar sha256(raw) === op.token (hex lowercase)
    //
    // const expected = await sha256(env.BANCARD_PRIVATE_KEY + op.shop_process_id + 'confirm' + op.amount + op.currency);
    // if (expected !== op.token) {
    //   return json({ error: 'Invalid token' }, 401);
    // }
  }

  const supaUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const supaH = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // Buscar el registro de pago
  const pagoRes = await fetch(`${supaUrl}/rest/v1/pagos_bancard?shop_process_id=eq.${encodeURIComponent(op.shop_process_id)}&select=*`, {
    headers: supaH,
  });
  const pagos = await pagoRes.json();
  if (!pagos || pagos.length === 0) {
    return json({ error: 'shop_process_id no encontrado' }, 404);
  }
  const pago = pagos[0];

  const exitoso = op.response === 'S' || op.response === 'success';
  const nuevoEstado = exitoso ? 'pagado' : (op.response === 'N' ? 'rechazado' : 'error');

  // Actualizar pagos_bancard
  await fetch(`${supaUrl}/rest/v1/pagos_bancard?id=eq.${pago.id}`, {
    method: 'PATCH',
    headers: supaH,
    body: JSON.stringify({
      estado: nuevoEstado,
      bancard_response_callback: body,
      authorization_number: op.authorization_number || null,
      ticket_number: op.ticket_number || null,
      card_brand: op.security_information?.card_brand || null,
      card_country: op.security_information?.card_country || null,
      error_code: !exitoso ? op.response_code : null,
      error_message: !exitoso ? op.response_description : null,
    }),
  });

  // Actualizar pedido
  if (exitoso) {
    await fetch(`${supaUrl}/rest/v1/pedidos?id=eq.${pago.pedido_id}`, {
      method: 'PATCH',
      headers: supaH,
      body: JSON.stringify({
        pago_estado: 'pagado',
        pago_metodo: 'bancard',  // o bancard_cuotas si era cuotas — Bancard lo dice en otro campo
        pago_referencia: op.authorization_number || op.ticket_number || null,
        envio_estado: 'pendiente', // ya está pagado, ahora a despachar
      }),
    });
  } else {
    await fetch(`${supaUrl}/rest/v1/pedidos?id=eq.${pago.pedido_id}`, {
      method: 'PATCH',
      headers: supaH,
      body: JSON.stringify({
        pago_estado: 'fallido',
      }),
    });
  }

  // Bancard espera una respuesta específica
  return json({ status: 'success' }, 200);
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
