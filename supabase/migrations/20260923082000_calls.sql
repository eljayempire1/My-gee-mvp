-- My Gee: call signaling foundation
-- Run this migration in Supabase SQL Editor.

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  call_type text not null check (call_type in ('voice','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','declined','ended','missed')),
  offer jsonb,
  answer jsonb,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

create index if not exists calls_callee_status_idx on public.calls(callee_id,status,created_at desc);
create index if not exists calls_caller_status_idx on public.calls(caller_id,status,created_at desc);

alter table public.calls enable row level security;

drop policy if exists "call participants can read calls" on public.calls;
create policy "call participants can read calls" on public.calls
for select to authenticated
using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "users can start calls" on public.calls;
create policy "users can start calls" on public.calls
for insert to authenticated
with check (auth.uid() = caller_id);

drop policy if exists "call participants can update calls" on public.calls;
create policy "call participants can update calls" on public.calls
for update to authenticated
using (auth.uid() = caller_id or auth.uid() = callee_id)
with check (auth.uid() = caller_id or auth.uid() = callee_id);

-- Enable Supabase Realtime for incoming-call/signaling updates.
alter table public.calls replica identity full;

-- Safe when the table is already present in the publication.
do $$
begin
  begin
    alter publication supabase_realtime add table public.calls;
  exception when duplicate_object then
    null;
  end;
end $$;
