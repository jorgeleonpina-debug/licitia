create extension if not exists pgcrypto;

create table if not exists public.licitaciones_oportunidades (
  id uuid primary key default gen_random_uuid(),
  codigo_externo text not null,
  external_item_key text not null,
  external_item_id text,
  nombre text not null,
  descripcion text,
  organismo text,
  rut_organismo text,
  region text,
  comuna text,
  fecha_publicacion timestamptz,
  fecha_cierre timestamptz,
  monto_estimado numeric,
  moneda text default 'CLP',
  producto text,
  descripcion_item text,
  cantidad numeric,
  unidad text,
  unspsc text,
  score integer not null default 0 check (score between 0 and 100),
  score_reasons jsonb not null default '[]'::jsonb,
  match_tipo text not null check (match_tipo in ('EXACT', 'KEYWORD', 'UNSPSC', 'RELATED')),
  estado text,
  workflow_status text not null default 'new'
    check (workflow_status in ('new', 'reviewing', 'interested', 'discarded', 'applied', 'won', 'lost')),
  notes text not null default '',
  url text,
  raw_data jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source text not null default 'mercado_publico' check (source = 'mercado_publico'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint licitaciones_oportunidades_external_item_key_key unique (external_item_key)
);

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status text not null default 'in_progress'
    check (status in ('pending', 'in_progress', 'completed', 'failed')),
  cursor integer not null default 0,
  processed integer not null default 0,
  matched integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licitaciones_oportunidades_score_idx
  on public.licitaciones_oportunidades (score desc);
create index if not exists licitaciones_oportunidades_fecha_cierre_idx
  on public.licitaciones_oportunidades (fecha_cierre asc);
create index if not exists licitaciones_oportunidades_workflow_status_idx
  on public.licitaciones_oportunidades (workflow_status);
create index if not exists licitaciones_oportunidades_codigo_externo_idx
  on public.licitaciones_oportunidades (codigo_externo);
create index if not exists licitaciones_oportunidades_region_idx
  on public.licitaciones_oportunidades (region);
create index if not exists sync_jobs_lookup_idx
  on public.sync_jobs (job_type, status, started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists licitaciones_oportunidades_set_updated_at on public.licitaciones_oportunidades;
create trigger licitaciones_oportunidades_set_updated_at
before update on public.licitaciones_oportunidades
for each row execute function public.set_updated_at();

drop trigger if exists sync_jobs_set_updated_at on public.sync_jobs;
create trigger sync_jobs_set_updated_at
before update on public.sync_jobs
for each row execute function public.set_updated_at();

alter table public.licitaciones_oportunidades enable row level security;
alter table public.sync_jobs enable row level security;

revoke all on public.licitaciones_oportunidades from anon;
revoke all on public.sync_jobs from anon, authenticated;
revoke update on public.licitaciones_oportunidades from authenticated;
grant select on public.licitaciones_oportunidades to authenticated;
grant update (workflow_status, notes) on public.licitaciones_oportunidades to authenticated;

drop policy if exists "Authenticated users can read opportunities" on public.licitaciones_oportunidades;
create policy "Authenticated users can read opportunities"
on public.licitaciones_oportunidades
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can update CRM fields" on public.licitaciones_oportunidades;
create policy "Authenticated users can update CRM fields"
on public.licitaciones_oportunidades
for update
to authenticated
using (true)
with check (true);

comment on table public.licitaciones_oportunidades is
  'Oportunidades por ítem detectadas desde la API de Mercado Público.';
comment on column public.licitaciones_oportunidades.external_item_key is
  'Clave estable: código licitación + correlativo; fallback código producto + índice.';
