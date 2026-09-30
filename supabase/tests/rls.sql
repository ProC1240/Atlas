begin;

insert into auth.users (id, email) values
  ('a7100000-0000-4000-8000-000000000001', 'atlas-rls-a@example.invalid'),
  ('a7100000-0000-4000-8000-000000000002', 'atlas-rls-b@example.invalid');

set local role authenticated;
set local request.jwt.claims = '{"sub":"a7100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_training_state(
  '{"version":1,"profile":{},"workouts":[],"water":[],"checkins":[],"fedDays":[]}'::jsonb, 0
);
do $$ begin
  if (select count(*) from public.training_states) <> 1 then
    raise exception 'FAIL: owner cannot read own journal';
  end if;
  begin
    perform public.save_training_state('{"version":1,"profile":{},"workouts":[],"water":[],"checkins":[],"fedDays":[]}'::jsonb, 0);
    raise exception 'FAIL: stale revision accepted';
  exception when raise_exception then
    if sqlerrm <> 'revision conflict' then raise; end if;
  end;
  begin
    insert into public.entitlements(user_id, item_id, source)
      values ('a7100000-0000-4000-8000-000000000001', 'test', 'purchase');
    raise exception 'FAIL: client granted a paid entitlement';
  exception when insufficient_privilege then null;
  end;
end $$;

set local request.jwt.claims = '{"sub":"a7100000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$ begin
  if exists (select 1 from public.training_states) then
    raise exception 'FAIL: another account can read the journal';
  end if;
  begin
    update public.training_states set revision = 999;
    raise exception 'FAIL: direct journal writes are permitted';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
set local request.jwt.claims = '{}';
do $$ begin
  begin
    perform * from public.training_states;
    raise exception 'FAIL: anonymous journal read permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_training_state('{}'::jsonb, 0);
    raise exception 'FAIL: anonymous journal write permitted';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
select 'PASS: owner access, account isolation, revision conflicts, and client restrictions; all fixtures rolled back' as result;
