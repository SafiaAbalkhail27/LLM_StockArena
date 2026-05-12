import React, { useState } from 'react';
import { LLM_COLORS, LLM_LABELS, ACTION_COLORS } from '../lib/constants.js';

const pill = (bg, text) => ({
  display: 'inline-block',
  background: bg + '22',
  color: bg,
  border: `1px solid ${bg}55`,
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 11,
  fontWeight: 700,
  marginRight: 4,
});

export default function TradeFeed({ trades }) {
  const [expanded, setExpanded] = useState(null);
  const sorted = [...trades].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div style={{ background: '#111118', borderRadius: 8, padding: 16 }}>
      <h2 style={{ color: '#e0e0e0', marginBottom: 12, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>
        Live Trade Feed
      </h2>
      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {sorted.slice(0, 100).map((t) => (
          <div
            key={t.id}
            style={{
              borderBottom: '1px solid #1e1e2e',
              padding: '8px 0',
              cursor: t.reasoning_text ? 'pointer' : 'default',
              background: t.is_refusal ? '#ef444408' : 'transparent',
            }}
            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <span style={pill(LLM_COLORS[t.llm] ?? '#888', t.llm)}>
                {LLM_LABELS[t.llm] ?? t.llm}
              </span>
              {t.is_refusal && <span style={pill('#f97316', 'refusal')}>REFUSAL</span>}
              <span style={pill(ACTION_COLORS[t.action], t.action)}>
                {t.action.toUpperCase()}
              </span>
              <span style={{ color: '#ccc', fontSize: 12 }}>
                {t.quantity > 0 ? `${t.quantity}x ` : ''}<strong>{t.ticker}</strong>
                {t.price_at_decision ? ` @ $${Number(t.price_at_decision).toFixed(2)}` : ''}
              </span>
              <span style={{ marginLeft: 'auto', color: '#666', fontSize: 11 }}>
                {t.timestamp?.split('T')[0]}
              </span>
            </div>
            {expanded === t.id && t.reasoning_text && (
              <div style={{
                marginTop: 8,
                padding: 8,
                background: '#0d0d17',
                borderRadius: 4,
                fontSize: 12,
                color: '#aaa',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
              }}>
                {t.reasoning_text}
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <p style={{ color: '#555', fontSize: 13 }}>No trades yet.</p>
        )}
      </div>
    </div>
  );
}
