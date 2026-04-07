-- OAuth 2.1 storage for the todolist-mcp-server.
-- Backs the self-hosted authorization server: registered clients,
-- short-lived authorization codes, and refresh tokens.
-- Single-user system — open RLS policy, no per-user scoping.

create table if not exists oauth_clients (
  client_id text primary key,
  client_secret_hash text,
  client_name text,
  redirect_uris text[] not null,
  grant_types text[] not null default array['authorization_code', 'refresh_token'],
  response_types text[] not null default array['code'],
  token_endpoint_auth_method text not null default 'none',
  created_at timestamptz not null default now()
);

create table if not exists oauth_codes (
  code text primary key,
  client_id text not null references oauth_clients(client_id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null check (code_challenge_method = 'S256'),
  scope text,
  resource text,
  subject text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists oauth_refresh_tokens (
  token_id text primary key,
  client_id text not null references oauth_clients(client_id) on delete cascade,
  subject text not null,
  scope text,
  resource text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_oauth_codes_client on oauth_codes(client_id);
create index if not exists idx_oauth_codes_expires on oauth_codes(expires_at);
create index if not exists idx_oauth_refresh_client on oauth_refresh_tokens(client_id);
create index if not exists idx_oauth_refresh_expires on oauth_refresh_tokens(expires_at);

alter table oauth_clients enable row level security;
alter table oauth_codes enable row level security;
alter table oauth_refresh_tokens enable row level security;

create policy "Allow all access to oauth_clients" on oauth_clients for all using (true) with check (true);
create policy "Allow all access to oauth_codes" on oauth_codes for all using (true) with check (true);
create policy "Allow all access to oauth_refresh_tokens" on oauth_refresh_tokens for all using (true) with check (true);
