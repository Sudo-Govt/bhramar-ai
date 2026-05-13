
create table if not exists public.system_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
alter table public.system_config enable row level security;
create policy "system_config_service_only" on public.system_config for all using (false) with check (false);

insert into public.system_config (key, value) values
  ('prompt_version', 'v1.0'),
  ('rag_similarity_threshold', '0.75'),
  ('rag_top_k', '5'),
  ('emergency_max_results', '3'),
  ('app_maintenance_mode', 'false'),
  ('master_prompt', '')
on conflict (key) do nothing;

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  version_label text not null,
  prompt_text text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.prompt_versions enable row level security;
create policy "prompt_versions_service_only" on public.prompt_versions for all using (false) with check (false);
create index if not exists prompt_versions_created_at_idx on public.prompt_versions (created_at desc);

create table if not exists public.rag_upload_queue (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('corpus', 'kb', 'pipeline')),
  file_path text not null,
  original_filename text not null,
  file_size_bytes bigint,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed', 'deleted')),
  error_message text,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.rag_upload_queue enable row level security;
create policy "rag_upload_queue_service_only" on public.rag_upload_queue for all using (false) with check (false);
create index if not exists rag_upload_queue_source_idx on public.rag_upload_queue (source, uploaded_at desc);

insert into storage.buckets (id, name, public)
values ('rag-corpus', 'rag-corpus', false)
on conflict (id) do nothing;
