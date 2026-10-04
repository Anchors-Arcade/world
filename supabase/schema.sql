-- Anchors World — schema (Phase 1: profiles). Run in Supabase SQL editor.
-- Later phases add: items, inventory, rooms, room_furniture, friendships,
-- friend_requests, chat_messages, minigame_scores, daily_rewards, reports.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar_data  jsonb not null default '{"color":"#4aa8ff","eyes":0,"hat":"beanie","shirt":"stripe"}',
  coins        integer not null default 500 check (coins >= 0),
  current_room text not null default 'snowy_plaza',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Anyone signed in can read profiles (needed for names/friend search).
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated using (true);

-- Users may update only their own row...
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- ...and only these columns. Coins/username/id can NOT be changed by the client.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, avatar_data, current_room) on public.profiles to authenticated;

-- Profile is created server-side when a user registers.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text := coalesce(new.raw_user_meta_data->>'username', 'player_' || substr(new.id::text, 1, 6));
begin
  if uname !~ '^[A-Za-z0-9_]{3,16}$' then uname := 'player_' || substr(new.id::text, 1, 6); end if;
  begin
    insert into public.profiles (id, username, display_name) values (new.id, uname, uname);
  exception when unique_violation then
    uname := left(uname, 10) || '_' || substr(new.id::text, 1, 5);
    insert into public.profiles (id, username, display_name) values (new.id, uname, uname);
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
