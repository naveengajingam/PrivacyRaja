
-- =========================================================
-- Privacy Raja — Online Multiplayer Schema
-- =========================================================

-- Helper: updated_at trigger function (reused)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- ROOMS
-- =========================================================
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null,
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  max_players int not null default 4 check (max_players between 2 and 5),
  question_domain text not null default 'mixed' check (question_domain in ('mixed','banking','insurance','general')),
  current_player_index int not null default 0,
  round int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rooms_code on public.rooms(code);

create trigger trg_rooms_updated_at
before update on public.rooms
for each row execute function public.update_updated_at_column();

alter table public.rooms enable row level security;

-- Anyone can read rooms (so /join/:code works pre-auth)
create policy "rooms_select_anyone"
on public.rooms for select
using (true);

-- Authenticated users can create rooms (they become host)
create policy "rooms_insert_authenticated"
on public.rooms for insert
to authenticated
with check (auth.uid() = host_id);

-- Only the host can update their room (status, current player, round)
create policy "rooms_update_host"
on public.rooms for update
to authenticated
using (auth.uid() = host_id);

-- =========================================================
-- PLAYERS
-- =========================================================
create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,                          -- auth.uid() of controlling device
  display_name text not null,
  avatar text check (avatar in ('earth','water','fire','air','ether')),
  seat_index int not null default 0,
  position int not null default 0,
  cash int not null default 1500000,
  in_jail boolean not null default false,
  jail_turns int not null default 0,
  mcq_skip_tokens int not null default 0,
  ready boolean not null default false,
  is_bankrupt boolean not null default false,
  mcqs_correct int not null default 0,
  mcqs_total int not null default 0,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, seat_index)
);
create index idx_players_room on public.players(room_id);
create index idx_players_user on public.players(user_id);

alter table public.players enable row level security;

-- Anyone can read players in any room (needed for lobby preview by code)
create policy "players_select_anyone"
on public.players for select
using (true);

-- A signed-in user can claim a seat for themselves
create policy "players_insert_self"
on public.players for insert
to authenticated
with check (auth.uid() = user_id);

-- A signed-in user can update only their own player row
create policy "players_update_self"
on public.players for update
to authenticated
using (auth.uid() = user_id);

-- A signed-in user can leave (delete their own seat)
create policy "players_delete_self"
on public.players for delete
to authenticated
using (auth.uid() = user_id);

-- =========================================================
-- TILES STATE
-- =========================================================
create table public.tiles_state (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  tile_index int not null,
  owner_id uuid references public.players(id) on delete set null,
  layers int not null default 0 check (layers between 0 and 4),
  unique (room_id, tile_index)
);
create index idx_tiles_state_room on public.tiles_state(room_id);

alter table public.tiles_state enable row level security;

-- Anyone can read tile state
create policy "tiles_state_select_anyone"
on public.tiles_state for select
using (true);

-- No client writes — only edge functions (service role) write here.
-- Service role bypasses RLS, so no INSERT/UPDATE/DELETE policies are needed.

-- =========================================================
-- GAME EVENTS
-- =========================================================
create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_game_events_room_time on public.game_events(room_id, created_at);

alter table public.game_events enable row level security;

-- Anyone can read events
create policy "game_events_select_anyone"
on public.game_events for select
using (true);

-- A signed-in player who is in the room can insert intent_* events for themselves.
-- Authoritative (non-intent) events are inserted only by edge functions (service role).
create policy "game_events_insert_intent_only"
on public.game_events for insert
to authenticated
with check (
  event_type like 'intent_%'
  and exists (
    select 1 from public.players p
    where p.id = game_events.player_id
      and p.user_id = auth.uid()
      and p.room_id = game_events.room_id
  )
);

-- =========================================================
-- MCQ BANK (server-side, includes correct answer)
-- =========================================================
create table public.mcq_bank (
  id text primary key,                              -- matches the JSON ids
  principle text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  question text not null,
  options jsonb not null,
  correct_index int not null,
  domain text not null default 'general'
);
create index idx_mcq_bank_principle_diff on public.mcq_bank(principle, difficulty);

alter table public.mcq_bank enable row level security;

-- Anyone can read questions (needed so client can show prompts);
-- BUT: edge functions never trust the client's "correct" answer — they re-check server-side.
create policy "mcq_bank_select_anyone"
on public.mcq_bank for select
using (true);

-- =========================================================
-- REALTIME
-- =========================================================
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.tiles_state;
alter publication supabase_realtime add table public.game_events;

alter table public.rooms        replica identity full;
alter table public.players      replica identity full;
alter table public.tiles_state  replica identity full;
alter table public.game_events  replica identity full;
