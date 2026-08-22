create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 30),
  balance bigint not null default 500000 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.providers (
  id text primary key,
  name text not null,
  integration_type text not null check (integration_type in ('INTERNAL','IFRAME','EXTERNAL','OPEN_SOURCE')),
  status text not null default 'disabled' check (status in ('active','disabled','credentials_required')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  provider_id text not null references public.providers(id),
  category text not null,
  thumbnail text not null default '',
  game_url text not null default '',
  integration_type text not null check (integration_type in ('INTERNAL','IFRAME','EXTERNAL','OPEN_SOURCE')),
  is_demo boolean not null default true check (is_demo = true),
  is_active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 100 check (sort_order >= 0),
  min_bet bigint not null default 1000 check (min_bet > 0),
  max_bet bigint not null default 250000 check (max_bet >= min_bet),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id),
  provider text not null,
  request_key uuid not null,
  bet bigint not null check (bet > 0),
  payout bigint check (payout is null or payout >= 0),
  status text not null default 'open' check (status in ('open','settled','cancelled')),
  public_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (user_id, request_key)
);

create table if not exists public.game_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.game_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id),
  provider text not null,
  bet bigint not null check (bet > 0),
  payout bigint not null check (payout >= 0),
  profit bigint generated always as (payout - bet) stored,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.game_sessions(id) on delete set null,
  type text not null check (type in ('WELCOME','BET','PAYOUT','DEMO_CREDIT','REVERSAL')),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key, type)
);

create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists game_history_user_created_idx on public.game_history(user_id, created_at desc);
create index if not exists game_sessions_user_created_idx on public.game_sessions(user_id, created_at desc);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions(user_id, created_at desc);
create index if not exists games_lobby_idx on public.games(is_active, category, sort_order);

create or replace function public.noir_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'noir_admin', false)
$$;

create or replace function public.noir_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, username)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'username',''), split_part(new.email,'@',1), 'miembro'));
  insert into public.wallet_transactions(user_id, type, amount, balance_after, idempotency_key)
  values (new.id, 'WELCOME', 500000, 500000, gen_random_uuid());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.noir_handle_new_user();

create or replace function public.noir_get_balance()
returns bigint language sql stable security definer set search_path = '' as $$
  select balance from public.profiles where id = auth.uid()
$$;

create or replace function public.noir_place_bet(p_game_id uuid, p_amount bigint, p_request_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_game public.games%rowtype;
  v_balance bigint;
  v_session uuid;
begin
  if v_user is null then raise exception 'Autenticación requerida'; end if;
  if p_request_key is null then raise exception 'Idempotency key requerida'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'La apuesta debe ser positiva'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));
  select id into v_session from public.game_sessions where user_id = v_user and request_key = p_request_key;
  if v_session is not null then
    select balance into v_balance from public.profiles where id = v_user;
    return jsonb_build_object('session_id', v_session, 'balance', v_balance, 'idempotent', true);
  end if;

  select * into v_game from public.games where id = p_game_id and is_active and is_demo;
  if not found then raise exception 'Juego demo no disponible'; end if;
  if p_amount < v_game.min_bet or p_amount > v_game.max_bet then raise exception 'Apuesta fuera de límites'; end if;

  select balance into v_balance from public.profiles where id = v_user for update;
  if v_balance < p_amount then raise exception 'Saldo virtual insuficiente'; end if;
  v_balance := v_balance - p_amount;
  update public.profiles set balance = v_balance, updated_at = now() where id = v_user;
  insert into public.game_sessions(user_id, game_id, provider, request_key, bet)
  values (v_user, v_game.id, v_game.provider_id, p_request_key, p_amount) returning id into v_session;
  insert into public.wallet_transactions(user_id, session_id, type, amount, balance_after, idempotency_key)
  values (v_user, v_session, 'BET', -p_amount, v_balance, p_request_key);
  return jsonb_build_object('session_id', v_session, 'balance', v_balance, 'idempotent', false);
end;
$$;

create or replace function public.noir_settle_round(p_session_id uuid, p_payout bigint, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.game_sessions%rowtype;
  v_balance bigint;
begin
  if p_payout is null or p_payout < 0 then raise exception 'Payout inválido'; end if;
  select * into v_session from public.game_sessions where id = p_session_id for update;
  if not found then raise exception 'Sesión inexistente'; end if;
  if v_session.status = 'settled' then
    select balance into v_balance from public.profiles where id = v_session.user_id;
    return jsonb_build_object('session_id',v_session.id,'balance',v_balance,'payout',v_session.payout,'idempotent',true);
  end if;
  if v_session.status <> 'open' then raise exception 'Sesión no liquidable'; end if;

  select balance into v_balance from public.profiles where id = v_session.user_id for update;
  v_balance := v_balance + p_payout;
  update public.profiles set balance = v_balance, updated_at = now() where id = v_session.user_id;
  update public.game_sessions set payout=p_payout, public_result=coalesce(p_result,'{}'::jsonb), status='settled', settled_at=now() where id=v_session.id;
  insert into public.game_history(session_id,user_id,game_id,provider,bet,payout,result,created_at)
  values(v_session.id,v_session.user_id,v_session.game_id,v_session.provider,v_session.bet,p_payout,coalesce(p_result,'{}'::jsonb),v_session.created_at);
  if p_payout > 0 then
    insert into public.wallet_transactions(user_id,session_id,type,amount,balance_after,idempotency_key)
    values(v_session.user_id,v_session.id,'PAYOUT',p_payout,v_balance,v_session.request_key);
  end if;
  return jsonb_build_object('session_id',v_session.id,'balance',v_balance,'payout',p_payout,'idempotent',false);
end;
$$;

alter table public.profiles enable row level security;
alter table public.providers enable row level security;
alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_history enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.favorites enable row level security;

create policy "profiles own read" on public.profiles for select using (auth.uid() = id or public.noir_is_admin());
create policy "providers public read" on public.providers for select using (true);
create policy "games public active read" on public.games for select using (is_active and is_demo or public.noir_is_admin());
create policy "sessions own read" on public.game_sessions for select using (auth.uid() = user_id or public.noir_is_admin());
create policy "history own read" on public.game_history for select using (auth.uid() = user_id or public.noir_is_admin());
create policy "transactions own read" on public.wallet_transactions for select using (auth.uid() = user_id or public.noir_is_admin());
create policy "favorites own read" on public.favorites for select using (auth.uid() = user_id);
create policy "favorites own insert" on public.favorites for insert with check (auth.uid() = user_id);
create policy "favorites own delete" on public.favorites for delete using (auth.uid() = user_id);
create policy "providers admin write" on public.providers for all using (public.noir_is_admin()) with check (public.noir_is_admin());
create policy "games admin write" on public.games for all using (public.noir_is_admin()) with check (public.noir_is_admin());

revoke all on function public.noir_settle_round(uuid,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.noir_settle_round(uuid,bigint,jsonb) to service_role;
grant execute on function public.noir_get_balance() to authenticated;
grant execute on function public.noir_place_bet(uuid,bigint,uuid) to authenticated;

insert into public.providers(id,name,integration_type,status,metadata) values
  ('noir-originals','NOIR Originals','INTERNAL','active','{"license":"Propietario NOIR","mode":"social"}'),
  ('casino-by-ai','Casino-by-AI','OPEN_SOURCE','disabled','{"license":"MIT","source":"https://github.com/Lemelson/casino-by-ai"}'),
  ('0xplayslots','0xPlaySlots','IFRAME','credentials_required','{"mode":"demo","pricing":"7-day trial then paid"}')
on conflict (id) do update set name=excluded.name,integration_type=excluded.integration_type,status=excluded.status,metadata=excluded.metadata;

insert into public.games(slug,name,provider_id,category,thumbnail,game_url,integration_type,is_demo,is_active,featured,sort_order) values
  ('slot','NOIR 777','noir-originals','slots','','/game/slot','INTERNAL',true,true,true,10),
  ('roulette','Ruleta Imperial','noir-originals','roulette','','/game/roulette','INTERNAL',true,true,true,20),
  ('blackjack','Blackjack Élite','noir-originals','blackjack','','/game/blackjack','INTERNAL',true,true,true,30),
  ('plinko','Plinko Prisma','noir-originals','originals','','/game/plinko','INTERNAL',true,true,true,40),
  ('dice','Dados Eléctricos','noir-originals','originals','','/game/dice','INTERNAL',true,true,false,50),
  ('baccarat','Baccarat Privé','noir-originals','table','','/game/baccarat','INTERNAL',true,true,false,60),
  ('mines','Minas NOIR','noir-originals','originals','','/game/mines','INTERNAL',true,true,false,70),
  ('crash','Crash Volt','noir-originals','crash','','/game/crash','INTERNAL',true,true,true,80)
on conflict (slug) do update set name=excluded.name,provider_id=excluded.provider_id,category=excluded.category,integration_type=excluded.integration_type,is_demo=true;
