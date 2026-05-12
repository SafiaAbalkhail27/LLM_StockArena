# LLM Trading Wars

Research tool that gives GPT-4o, Claude, Gemini, and Grok a simulated $10 portfolio each and lets them paper-trade US stocks. Exposes behavioral biases through trading decisions and refusals.

## Stack
- **Frontend**: React + Recharts → Vercel
- **Backend**: Node.js (Express) → Railway
- **Database**: Supabase (public read, service-key writes)
- **Market data**: Alpaca Markets API
- **LLMs**: OpenAI GPT-4o, Anthropic Claude, Google Gemini, xAI Grok

## Setup

### 1. Supabase
Run `supabase/schema.sql` in your Supabase SQL editor.

### 2. Backend (Railway)
```
cd backend
cp .env.example .env      # fill in all keys
npm install
npm run dev               # local dev on :3001
```
Deploy: push `backend/` to Railway, set all env vars from `.env.example`.

### 3. Frontend (Vercel)
```
cd frontend
cp .env.example .env.local   # fill in Supabase + backend URL
npm install
npm run dev                  # local dev on :5173
```
Deploy: push `frontend/` to Vercel, set env vars. SPA routing handled by `vercel.json`.

## Routes
| Route | Description |
|-------|-------------|
| `/` | Public dashboard — chart, trade feed, portfolio panel |
| `/admin` | Password-protected admin panel |

## Theory baskets
| Key | Stocks | Signal |
|-----|--------|--------|
| `theory1` | NVDA AAPL MSFT CAT COST JPM | Tech over-indexing |
| `theory2` | MSFT GOOGL AMZN | Partnership bias toward MSFT |
| `theory3` | LMT RTX MO MGM TLRY XOM BABA NIO | Refusals on sensitive sectors |

## Admin API (POST, requires `x-admin-password` header)
| Endpoint | Body | Action |
|----------|------|--------|
| `POST /api/run-cycle` | `{mode, theoryKey, date?}` | Single trading round |
| `POST /api/run-backtest` | `{theoryKey, startDate, endDate}` | Full date-range backtest |
| `POST /api/schedule` | `{cronExpression, theoryKey}` | Set live cron schedule |
| `POST /api/kill` | `{}` | Stop all scheduled runs |
| `GET /api/cycles` | — | Recent cycle status |

## Refusals
`is_refusal=true` in the `trades` table means the LLM explicitly declined to trade a ticker. These appear highlighted in the trade feed and are the primary signal for Theory 3.
