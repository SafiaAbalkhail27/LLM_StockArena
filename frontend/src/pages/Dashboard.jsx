import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import PortfolioChart from '../components/PortfolioChart.jsx';
import TradeFeed from '../components/TradeFeed.jsx';
import PortfolioPanel from '../components/PortfolioPanel.jsx';

const REFRESH_INTERVAL = 30_000;

const s = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    padding: '16px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottom: '1px solid #1e1e2e',
    paddingBottom: 12,
  },
  title: {
    color: '#e0e0e0',
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  badge: {
    background: '#10b98122',
    color: '#10b981',
    border: '1px solid #10b98144',
    borderRadius: 4,
    padding: '2px 10px',
    fontSize: 11,
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: 16,
    marginTop: 16,
  },
};

export default function Dashboard() {
  const [snapshots, setSnapshots] = useState([]);
  const [trades, setTrades] = useState([]);
  const [modeFilter, setModeFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(null);

  async function fetchData() {
    const modeEq = modeFilter !== 'all' ? modeFilter : null;

    let snapshotQuery = supabase
      .from('portfolio_snapshots')
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(500);
    if (modeEq) snapshotQuery = snapshotQuery.eq('mode', modeEq);

    let tradeQuery = supabase
      .from('trades')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200);
    if (modeEq) tradeQuery = tradeQuery.eq('mode', modeEq);

    const [{ data: snap }, { data: tr }] = await Promise.all([snapshotQuery, tradeQuery]);
    setSnapshots(snap ?? []);
    setTrades(tr ?? []);
    setLastRefresh(new Date().toLocaleTimeString());
  }

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [modeFilter]);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.title}>LLM Trading Wars</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #333', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}
          >
            <option value="all">All modes</option>
            <option value="live">Live only</option>
            <option value="backtest">Backtest only</option>
          </select>
          <span style={s.badge}>LIVE</span>
          {lastRefresh && (
            <span style={{ color: '#555', fontSize: 11 }}>Updated {lastRefresh}</span>
          )}
        </div>
      </div>

      <PortfolioPanel snapshots={snapshots} />

      <div style={{ marginTop: 16 }}>
        <PortfolioChart snapshots={snapshots} />
      </div>

      <div style={{ ...s.grid, marginTop: 16 }}>
        <TradeFeed trades={trades} />
        <div style={{ background: '#111118', borderRadius: 8, padding: 16 }}>
          <h2 style={{ color: '#e0e0e0', marginBottom: 12, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>
            Research Notes
          </h2>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7 }}>
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: '#10b981' }}>Theory 1</strong> — Over-indexing: watch whether GPT-4o allocates disproportionately to tech (NVDA, AAPL, MSFT) vs equivalent non-tech plays.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: '#f59e0b' }}>Theory 2</strong> — Partnership bias: does GPT-4o consistently tilt toward MSFT over GOOGL/AMZN in equivalent cloud contexts?
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: '#ef4444' }}>Theory 3</strong> — Safe play: orange-tagged <span style={{ color: '#f97316' }}>REFUSAL</span> trades are the primary signal. Grok vs GPT-4o divergence on defense/vice/China stocks.
            </p>
            <p style={{ color: '#555', marginTop: 16, fontSize: 11 }}>
              Refreshes every 30s. Click any trade to expand reasoning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
