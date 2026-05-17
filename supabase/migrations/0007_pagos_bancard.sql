-- Tabla pagos_bancard: tracking de procesos de pago con Bancard vPOS
-- Cada intento de pago crea una fila acá. El pedido tiene varios pagos posibles
-- (1 exitoso + N fallidos, por ejemplo).
--
-- Bancard usa "process_id" como su identificador único del proceso de pago.
-- Lo guardamos para correlacionar con webhooks y reportes de Bancard.

create table if not exists public.pagos_bancard (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos(id) on delete cascade,

  -- Identificador propio (lo que mandamos a Bancard como "shop_process_id")
  shop_process_id text not null,

  -- Identificador de Bancard (lo recibimos en la respuesta de "single_buy")
  bancard_process_id text,

  -- Monto del intento de pago (snapshot al momento de iniciar)
  monto_gs        numeric(15,0) not null check (monto_gs > 0),
  descripcion     text,

  -- Estado interno del flow del pago
  -- iniciado       → llamamos a Bancard, esperamos URL del modal
  -- redirigido     → cliente abrió el modal de Bancard
  -- procesando     → Bancard está procesando (entre confirm y callback)
  -- pagado         → callback confirmado OK
  -- rechazado      → tarjeta rechazada / fondos insuficientes
  -- error          → error técnico / timeout
  -- expirado       → cliente abandonó (>30 min sin completar)
  estado          text not null default 'iniciado',

  -- Respuestas crudas de Bancard para auditoría
  bancard_response_iniciar jsonb,
  bancard_response_callback jsonb,

  -- Si pagó: datos útiles
  authorization_number text,    -- número de autorización del banco
  ticket_number        text,
  card_brand           text,    -- 'visa', 'mastercard', 'cabal'
  card_last4           text,
  card_country         text,
  pago_metodo_detalle  text,    -- '1_pago', '3_cuotas_sin_interes', etc.

  -- Si falló: por qué
  error_code     text,
  error_message  text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint pagos_bancard_shop_process_unique unique (shop_process_id)
);

create index if not exists pagos_bancard_pedido_idx
  on public.pagos_bancard (pedido_id);

create index if not exists pagos_bancard_bancard_process_idx
  on public.pagos_bancard (bancard_process_id);

create index if not exists pagos_bancard_estado_idx
  on public.pagos_bancard (estado);

-- RLS: solo admin puede leer/modificar. Las Cloudflare Functions usan service_role.
alter table public.pagos_bancard enable row level security;

drop policy if exists "admin read pagos" on public.pagos_bancard;
create policy "admin read pagos"
  on public.pagos_bancard for select to authenticated
  using (auth_is_admin());

drop policy if exists "admin all pagos" on public.pagos_bancard;
create policy "admin all pagos"
  on public.pagos_bancard for all to authenticated
  using (auth_is_admin())
  with check (auth_is_admin());

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pagos_bancard_set_updated_at on public.pagos_bancard;
create trigger pagos_bancard_set_updated_at
  before update on public.pagos_bancard
  for each row execute function public.set_updated_at();

comment on table public.pagos_bancard is
  'Tracking de procesos de pago con Bancard vPOS. Una fila por intento de pago.';
