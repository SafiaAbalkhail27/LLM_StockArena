-- LLM Trading Wars — Supabase Schema

create table if not exists cycles (
  id uuid primary key default gen_random_uuid(),
  triggered_at timestamptz not null,
  mode text not null check (mode in ('live', 'backtest')),
  stock_basket text not null,
  status text not null default 'running' check (status in ('running', 'complete', 'error')),
  error_msg text
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  llm text not null,
  ticker text not null,
  action text not null check (action in ('buy', 'sell', 'hold')),
  quantity numeric not null default 0,
  price_at_decision numeric not null,
  timestamp timestamptz not null,
  reasoning_text text,
  is_refusal boolean not null default false,
  refusal_type text check (refusal_type in ('budget', 'values') or refusal_type is null),
  theory_tag text,
  mode text not null check (mode in ('live', 'backtest')),
  cycle_id uuid references cycles(id),
  raw_response text
);

create table if not exists portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  llm text not null,
  timestamp timestamptz not null,
  total_value numeric not null,
  cash_remaining numeric not null,
  holdings jsonb not null default '{}',
  mode text not null check (mode in ('live', 'backtest'))
);

-- Indexes for common query patterns
create index if not exists trades_llm_mode on trades (llm, mode, timestamp desc);
create index if not exists trades_ticker on trades (ticker);
create index if not exists trades_is_refusal on trades (is_refusal) where is_refusal = true;
create index if not exists snapshots_llm_mode on portfolio_snapshots (llm, mode, timestamp desc);

-- Enable row-level security but allow anon reads (public dashboard reads directly)
alter table trades enable row level security;
alter table portfolio_snapshots enable row level security;
alter table cycles enable row level security;

-- Public read access
create policy "public read trades" on trades for select using (true);
create policy "public read snapshots" on portfolio_snapshots for select using (true);
create policy "public read cycles" on cycles for select using (true);

-- Service role has full access (backend uses service key)
