-- AutoControl: archivio personale e allegati privati. Eseguire una volta nel SQL Editor.
begin;
create table if not exists public.ac_archives (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
create table if not exists public.ac_archive_versions (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null,
 payload jsonb not null,
 saved_at timestamptz not null default now(),
 primary key(user_id, revision)
);
alter table public.ac_archives enable row level security;
alter table public.ac_archive_versions enable row level security;
revoke all on public.ac_archives,public.ac_archive_versions from public,anon,authenticated;
grant select on public.ac_archives,public.ac_archive_versions to authenticated;
drop policy if exists ac_read_own on public.ac_archives;
create policy ac_read_own on public.ac_archives for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists ac_versions_own on public.ac_archive_versions;
create policy ac_versions_own on public.ac_archive_versions for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.ac_save_archive(p_payload jsonb,p_revision bigint,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_revision bigint; next_revision bigint; section text;
begin
 if uid is null or uid is distinct from p_user_id then raise exception 'Account non corrispondente' using errcode='42501'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>8388608 then
  raise exception 'Archivio non valido o troppo grande' using errcode='22023';
 end if;
 foreach section in array array['vehicles','maintenance','fuel','parts','documents','insurance','tax','revision','bodywork','deadlines','accessories','workshops'] loop
  if jsonb_typeof(p_payload->section) is distinct from 'array' then raise exception 'Sezione non valida: %',section using errcode='22023'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select revision into current_revision from public.ac_archives where user_id=uid;
 current_revision:=coalesce(current_revision,0);
 if p_revision is distinct from current_revision then raise exception 'AC_CONFLICT' using errcode='40001'; end if;
 next_revision:=current_revision+1;
 insert into public.ac_archives(user_id,payload,revision,updated_at) values(uid,p_payload,next_revision,now())
 on conflict(user_id) do update set payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at;
 insert into public.ac_archive_versions(user_id,revision,payload) values(uid,next_revision,p_payload);
 return jsonb_build_object('revision',next_revision,'updated_at',now());
end;
$$;
revoke all on function public.ac_save_archive(jsonb,bigint,uuid) from public,anon,authenticated;
grant execute on function public.ac_save_archive(jsonb,bigint,uuid) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit)
values('autocontrol-private','autocontrol-private',false,52428800)
on conflict(id) do update set public=false;
drop policy if exists ac_files_read on storage.objects;
create policy ac_files_read on storage.objects for select to authenticated
using(bucket_id='autocontrol-private' and (storage.foldername(name))[1]=(select auth.uid()::text));
drop policy if exists ac_files_insert on storage.objects;
create policy ac_files_insert on storage.objects for insert to authenticated
with check(bucket_id='autocontrol-private' and (storage.foldername(name))[1]=(select auth.uid()::text));
-- Gli allegati vengono aggiunti con nomi nuovi: nessuna sovrascrittura o eliminazione dal client.
commit;
select 'Archivio AutoControl pronto' as risultato;
