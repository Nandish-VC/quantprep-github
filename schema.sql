-- Run once in Supabase → SQL Editor
create table profiles(
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  data jsonb not null default '{}'
);
create table board(
  id uuid primary key references auth.users on delete cascade,
  name text, wk int default 0, streak int default 0, probs int default 0, topics int default 0,
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
alter table board enable row level security;
-- Private data: only the owner can read/write their own row
create policy "own profile" on profiles for all using (auth.uid()=id) with check (auth.uid()=id);
-- Leaderboard: everyone can read, only the owner can write
create policy "board read" on board for select using (true);
create policy "board insert" on board for insert with check (auth.uid()=id);
create policy "board update" on board for update using (auth.uid()=id);
create policy "board delete" on board for delete using (auth.uid()=id);
-- Lets a user delete their own account and all data
create function delete_me() returns void language sql security definer set search_path=public as $$
  delete from auth.users where id=auth.uid();
$$;
-- Security: only logged-in users may call delete_me (anon could previously execute it)
revoke execute on function delete_me() from public, anon;
grant execute on function delete_me() to authenticated;
