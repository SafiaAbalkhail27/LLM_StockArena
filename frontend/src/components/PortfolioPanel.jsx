import React from 'react';
import { LLM_COLORS, LLM_LABELS } from '../lib/constants.js';

function PortfolioCard({ llm, snapshot }) {
  const pnl = snapshot ? Number(snapshot.total_value) - 10 : 0;
  const pct = ((pnl / 10) * 100).toFixed(2);
  const color = LLM_COLORS[llm] ?? '#888';

  return (
    <div style={{
      background: '#111118',
      border: `1px solid ${color}33`,
      borderRadius: 8,
      padding: 12,
    }}>
      <div style={{ color, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
        {LLM_LABELS[llm] ?? llm}
      </div>
      {snapshot ? (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, color: pnl >= 0 ? '#10b981' : '#ef4444' }}>
            ${Number(snapshot.total_value).toFixed(4)}
          </div>
          <div style={{ fontSize: 12, color: pnl >= 0 ? '#10b981' : '#ef4444', marginBottom: 8 }}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} ({pct}%)
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>
            Cash: ${Number(snapshot.cash_remaining).toFixed(4)}
          </div>
          <div style={{ marginTop: 6 }}>
            {Object.entries(snapshot.holdings ?? {}).length > 0 ? (
              Object.entries(snapshot.holdings).map(([sym, qty]) => (
                <div key={sym} style={{ fontSize: 11, color: '#aaa' }}>
                  {sym}: {qty} shares
                </div>
              ))
            ) : (
              <div style={{ fontSize: 11, color: '#555' }}>No holdings</div>
            )}
          </div>
        </>
      ) : (
        <div style={{ color: '#555', fontSize: 12 }}>No data yet</div>
      )}
    </div>
  );
}

export default function PortfolioPanel({ snapshots }) {
  const llms = ['gpt4o', 'claude', 'grok'];

  const latest = {};
  for (const s of snapshots) {
    if (!latest[s.llm] || new Date(s.timestamp) > new Date(latest[s.llm].timestamp)) {
      latest[s.llm] = s;
    }
  }

  return (
    <div>
      <h2 style={{ color: '#e0e0e0', marginBottom: 12, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>
        Current Portfolios
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {llms.map((llm) => (
          <PortfolioCard key={llm} llm={llm} snapshot={latest[llm]} />
        ))}
      </div>
    </div>
  );
}
