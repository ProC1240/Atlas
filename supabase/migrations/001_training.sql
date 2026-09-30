-- Optional cloud journal. Apply manually to YOUR Supabase project after reviewing.
-- No secrets, hosted resources, or payment providers are created by this file.
begin;

create table public.training_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
alter table public.training_states enable row level security;
revoke all on public.training_states from anon, authenticated;
grant select on public.training_states to authenticated;
create policy "Read own journal" on public.training_states for select to authenticated
  using ((select auth.uid()) = user_id);

-- Optimistic revision prevents silently overwriting changes from another session.
-- No user_id parameter: the verified session is the ONLY source of identity.
create function public.save_training_state(p_payload jsonb, p_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_next bigint;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_revision is null or p_revision < 0 then raise exception 'invalid revision'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or (p_payload->>'version') is distinct from '1'
     or jsonb_typeof(p_payload->'profile') is distinct from 'object'
     or jsonb_typeof(p_payload->'workouts') is distinct from 'array'
     or jsonb_typeof(p_payload->'water') is distinct from 'array'
     or jsonb_typeof(p_payload->'checkins') is distinct from 'array'
     or jsonb_typeof(p_payload->'fedDays') is distinct from 'array'
     or octet_length(p_payload::text) > 2000000
  then raise exception 'invalid journal payload'; end if;
  if jsonb_array_length(p_payload->'workouts') > 10000
     or jsonb_array_length(p_payload->'water') > 30000
     or jsonb_array_length(p_payload->'checkins') > 10000
     or jsonb_array_length(p_payload->'fedDays') > 10000
  then raise exception 'journal limit exceeded'; end if;
  insert into public.training_states(user_id) values(v_user) on conflict do nothing;
  update public.training_states set payload=p_payload, revision=revision+1, updated_at=now()
    where user_id=v_user and revision=p_revision returning revision into v_next;
  if v_next is null then raise exception 'revision conflict'; end if;
  return v_next;
end;
$$;
revoke all on function public.save_training_state(jsonb,bigint) from public, anon;
grant execute on function public.save_training_state(jsonb,bigint) to authenticated;

-- Future paid/unlocked ownership: deliberately outside user-editable journal JSON.
create table public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  source text not null check(source in ('starter','achievement','purchase','promotion')),
  source_reference text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key(user_id,item_id)
);
alter table public.entitlements enable row level security;
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;
create policy "Read own entitlements" on public.entitlements for select to authenticated
  using ((select auth.uid())=user_id);

-- A server-verified webhook will use a unique event ID to make grants idempotent.
create table public.payment_events (
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  primary key(provider,event_id)
);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;
-- Intentionally no client write policies or client-accessible reward-grant RPCs.
commit;
