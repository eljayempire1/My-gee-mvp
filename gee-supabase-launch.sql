-- GEE Launch Beta — Supabase setup
-- Paste this whole script into Supabase SQL Editor and click RUN.
-- This is a consolidated/fixed schema for the GEE v10 foundation.

create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  gee_personality text default 'bestie',
  bio text,
  city text,
  interests text[] default '{}',
  looking_for text[] default '{}',
  is_discoverable boolean not null default true,
  onboarding_complete boolean not null default false,
  allow_messages boolean not null default true,
  show_city boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- AI conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Human connections
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  unique(requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

-- Human chat
create table if not exists public.connection_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Blocks
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('connection_request','connection_accepted','message')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Safety reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('harassment','spam','scam','sexual_content','threats','other')),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  constraint reports_not_self check (reporter_id <> reported_user_id)
);

-- Billing
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Rate limits
create table if not exists public.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key(user_id,bucket,window_start)
);

-- Indexes
create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists connections_requester_idx on public.connections(requester_id);
create index if not exists connections_recipient_idx on public.connections(recipient_id);
create index if not exists connection_messages_connection_idx on public.connection_messages(connection_id, created_at);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists reports_reported_user_idx on public.reports(reported_user_id, created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.connections enable row level security;
alter table public.connection_messages enable row level security;
alter table public.blocks enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles: own profile plus discoverable public profiles.
drop policy if exists "profiles own" on public.profiles;
create policy "profiles own" on public.profiles
for all using (auth.uid()=id) with check (auth.uid()=id);

drop policy if exists "profiles discoverable read" on public.profiles;
create policy "profiles discoverable read" on public.profiles
for select using (is_discoverable = true and deleted_at is null);

-- AI conversations
drop policy if exists "conversations own" on public.conversations;
create policy "conversations own" on public.conversations
for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists "messages own" on public.messages;
create policy "messages own" on public.messages
for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Connections
drop policy if exists "connections visible to participants" on public.connections;
create policy "connections visible to participants" on public.connections
for select using (auth.uid()=requester_id or auth.uid()=recipient_id);

drop policy if exists "connections create as requester" on public.connections;
create policy "connections create as requester" on public.connections
for insert with check (auth.uid()=requester_id);

drop policy if exists "connections update by participants" on public.connections;
create policy "connections update by participants" on public.connections
for update using (auth.uid()=requester_id or auth.uid()=recipient_id)
with check (auth.uid()=requester_id or auth.uid()=recipient_id);

-- Human messages
drop policy if exists "connection messages readable by accepted participants" on public.connection_messages;
create policy "connection messages readable by accepted participants" on public.connection_messages
for select using (
  exists (
    select 1 from public.connections c
    where c.id=connection_id and c.status='accepted'
      and (auth.uid()=c.requester_id or auth.uid()=c.recipient_id)
  )
);

drop policy if exists "connection messages writable by sender" on public.connection_messages;
create policy "connection messages writable by sender" on public.connection_messages
for insert with check (
  auth.uid()=sender_id and exists (
    select 1 from public.connections c
    where c.id=connection_id and c.status='accepted'
      and (auth.uid()=c.requester_id or auth.uid()=c.recipient_id)
  )
);

drop policy if exists "connection messages deletable by sender" on public.connection_messages;
create policy "connection messages deletable by sender" on public.connection_messages
for delete using (auth.uid()=sender_id);

-- Blocks
drop policy if exists "users manage their own blocks" on public.blocks;
create policy "users manage their own blocks" on public.blocks
for all using (auth.uid()=blocker_id) with check (auth.uid()=blocker_id);

-- Notifications
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
for select using (auth.uid()=user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
for update using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Reports
drop policy if exists "Users create reports" on public.reports;
create policy "Users create reports" on public.reports
for insert with check (auth.uid()=reporter_id);

drop policy if exists "Users read own reports" on public.reports;
create policy "Users read own reports" on public.reports
for select using (auth.uid()=reporter_id);

-- Subscriptions
drop policy if exists "users read own subscription" on public.subscriptions;
create policy "users read own subscription" on public.subscriptions
for select using (auth.uid()=user_id);

-- Rate limits: no direct table access
revoke all on public.rate_limits from public, anon, authenticated;

-- New user profile trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id) values(new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Matching score
create or replace function public.connection_score(a uuid, b uuid)
returns integer language sql stable security definer set search_path=public as $$
  select coalesce((
    select count(*)::int
    from unnest(coalesce(p1.interests, '{}')) i
    join unnest(coalesce(p2.interests, '{}')) j on lower(i)=lower(j)
    where p1.id=a and p2.id=b
  ),0)
  from public.profiles p1, public.profiles p2
  where p1.id=a and p2.id=b;
$$;

-- Discover people; security definer so RLS does not hide the candidate list.
create or replace function public.discover_people(limit_count integer default 20)
returns table (id uuid, display_name text, city text, bio text, interests text[], score integer)
language sql stable security definer set search_path=public
as $$
  select p.id, p.display_name,
         case when p.show_city then p.city else null end,
         p.bio, p.interests,
         public.connection_score(auth.uid(),p.id)
  from public.profiles p
  where p.id <> auth.uid()
    and p.is_discoverable=true
    and p.deleted_at is null
    and not exists (select 1 from public.blocks b where b.blocker_id=auth.uid() and b.blocked_id=p.id)
    and not exists (select 1 from public.blocks b where b.blocker_id=p.id and b.blocked_id=auth.uid())
  order by public.connection_score(auth.uid(),p.id) desc, p.created_at desc
  limit greatest(1,least(limit_count,50));
$$;

-- Accepted connections helper
create or replace function public.accepted_connections()
returns table(id uuid, other_user_id uuid, display_name text, city text, avatar_letter text)
language sql security definer set search_path=public as $$
  select c.id,
    case when c.requester_id=auth.uid() then c.recipient_id else c.requester_id end,
    coalesce(p.display_name,'GEE member'),
    case when p.show_city then p.city else null end,
    left(coalesce(p.display_name,'G'),1)
  from public.connections c
  join public.profiles p on p.id =
    case when c.requester_id=auth.uid() then c.recipient_id else c.requester_id end
  where c.status='accepted'
    and (c.requester_id=auth.uid() or c.recipient_id=auth.uid())
  order by c.created_at desc;
$$;

-- Notification helper
create or replace function public.create_notification(
  p_user_id uuid,p_actor_id uuid,p_type text,p_title text,p_body text,p_data jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,actor_id,type,title,body,data)
  values(p_user_id,p_actor_id,p_type,p_title,p_body,coalesce(p_data,'{}'::jsonb));
end;
$$;

-- Plus check
create or replace function public.is_plus(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.subscriptions s
    where s.user_id=p_user_id
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- Rate limiter
create or replace function public.consume_rate_limit(
  p_bucket text,p_limit integer default 30,p_window_seconds integer default 60
)
returns boolean language plpgsql security definer set search_path=public as $$
declare
  v_start timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_count integer;
begin
  insert into public.rate_limits(user_id,bucket,window_start,request_count)
  values(auth.uid(),p_bucket,v_start,1)
  on conflict(user_id,bucket,window_start)
  do update set request_count=public.rate_limits.request_count+1
  returning request_count into v_count;
  return v_count <= greatest(1,p_limit);
end;
$$;

revoke all on function public.accepted_connections() from public;
grant execute on function public.accepted_connections() to authenticated;
revoke all on function public.create_notification(uuid,uuid,text,text,text,jsonb) from public;
grant execute on function public.create_notification(uuid,uuid,text,text,text,jsonb) to authenticated;
revoke all on function public.is_plus(uuid) from public;
grant execute on function public.is_plus(uuid) to authenticated;
revoke all on function public.consume_rate_limit(text,integer,integer) from public;
grant execute on function public.consume_rate_limit(text,integer,integer) to authenticated;
revoke all on function public.discover_people(integer) from public;
grant execute on function public.discover_people(integer) to authenticated;

-- Realtime human chat
do $$
begin
  alter publication supabase_realtime add table public.connection_messages;
exception when duplicate_object then
  null;
end $$;
