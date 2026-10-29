-- Execute uma vez no SQL Editor de um projeto Supabase novo.
begin;
create table public.user_data (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 constraint valid_payload check (
  jsonb_typeof(payload) = 'object'
  and payload ? 'tasks' and jsonb_typeof(payload->'tasks') = 'array'
  and payload ? 'notes' and jsonb_typeof(payload->'notes') = 'string'
  and octet_length(payload::text) <= 2000000
 )
);
alter table public.user_data enable row level security;
create policy own_read on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.user_data from anon, authenticated;
grant select on public.user_data to authenticated;
-- Uma linha por usuário e revisão evita substituir silenciosamente alterações de outro dispositivo.
create function public.save_my_data(document jsonb, expected_revision integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare next_revision integer; uid uuid := auth.uid();
begin
 if uid is null then raise insufficient_privilege; end if;
 insert into public.user_data(user_id,payload,revision) values(uid,document,1)
 on conflict(user_id) do update set payload=excluded.payload,revision=public.user_data.revision+1,updated_at=now()
 where public.user_data.revision=expected_revision and expected_revision>0
 returning revision into next_revision;
 if next_revision is null or (next_revision=1 and expected_revision<>0) then
  raise sqlstate 'PT409' using message='Conflito de revisão';
 end if;
 return next_revision;
end $$;
revoke all on function public.save_my_data(jsonb,integer) from public,anon;
grant execute on function public.save_my_data(jsonb,integer) to authenticated;
-- Auditoria gerada no banco: sem conteúdo das notas/tarefas, e sem tokens.
create table public.activity_logs (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null,
 revision integer not null,
 created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;
revoke all on public.activity_logs from anon,authenticated;
grant select on public.activity_logs to authenticated;
create policy own_logs on public.activity_logs for select to authenticated using ((select auth.uid())=user_id);
create function public.log_data_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.activity_logs(user_id,action,revision) values(new.user_id,case when TG_OP='INSERT' then 'created' else 'saved' end,new.revision);
 return new;
end $$;
revoke all on function public.log_data_change() from public,anon,authenticated;
create trigger data_change after insert or update on public.user_data for each row execute function public.log_data_change();
commit;
