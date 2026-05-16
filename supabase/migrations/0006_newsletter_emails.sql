-- Tabla de suscriptores al newsletter
-- Captura emails desde el form del index. INSERT público vía anon key.
-- SELECT/UPDATE/DELETE solo con service_role (admin lo lee desde el panel después).

create table if not exists public.newsletter_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  origen text default 'web-index',
  constraint newsletter_emails_email_format check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Unique por email (case-insensitive)
create unique index if not exists newsletter_emails_email_unique
  on public.newsletter_emails (lower(email));

create index if not exists newsletter_emails_created_at_idx
  on public.newsletter_emails (created_at desc);

-- RLS: solo INSERT desde anon. Nadie con anon puede leer ni borrar.
alter table public.newsletter_emails enable row level security;

drop policy if exists "anyone can subscribe" on public.newsletter_emails;
create policy "anyone can subscribe"
  on public.newsletter_emails
  for insert
  to anon, authenticated
  with check (true);

-- service_role tiene todos los permisos por default, no necesita policy explícita.

comment on table public.newsletter_emails is 'Suscriptores al newsletter de MoMar. Públicamente insertable, lectura solo con service_role.';
