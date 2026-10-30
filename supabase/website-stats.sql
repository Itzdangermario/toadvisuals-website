-- Toad's Visuals website: download counter.
-- Run once in Supabase -> SQL Editor -> New query -> Run. Running it again is safe.
-- Stores only "version + Minecraft version + number of downloads". No IP, no user data.

create table if not exists public.download_stats (
  version   text   not null,
  mc        text   not null,
  downloads bigint not null default 0,
  primary key (version, mc)
);

alter table public.download_stats enable row level security;

drop policy if exists "download stats are public" on public.download_stats;
create policy "download stats are public" on public.download_stats
  for select to anon, authenticated using (true);

revoke insert, update, delete, truncate on public.download_stats from anon, authenticated;
grant select on public.download_stats to anon, authenticated;

-- The website calls this when someone clicks a download button. It can only add 1 to a counter.
create or replace function public.count_download(p_version text, p_mc text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_version !~ '^[0-9]+(\.[0-9]+){1,3}$' or p_mc !~ '^[0-9]+(\.[0-9]+){1,3}$' then
    return;
  end if;
  insert into public.download_stats (version, mc, downloads) values (p_version, p_mc, 1)
  on conflict (version, mc) do update set downloads = public.download_stats.downloads + 1;
end;
$$;

revoke all on function public.count_download(text, text) from public;
grant execute on function public.count_download(text, text) to anon, authenticated;

-- Check:
select * from public.download_stats order by version desc, mc;
