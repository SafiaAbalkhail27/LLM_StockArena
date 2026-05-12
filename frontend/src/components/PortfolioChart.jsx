import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { LLM_COLORS, LLM_LABELS } from '../lib/constants.js';

function buildChartData(snapshots) {
  const byTime = {};
  for (const s of snapshots) {
    const ts = s.timestamp.split('T')[0];
    if (!byTime[ts]) byTime[ts] = { date: ts };
    byTime[ts][s.llm] = Number(s.total_value).toFixed(4);
  }
  return Object.values(byTime).sort((a, b) => a.date.localeCompare(b.date));
}

export default function PortfolioChart({ snapshots }) {
  const data = buildChartData(snapshots);
  const llms = [...new Set(snapshots.map((s) => s.llm))];

  return (
    <div style={{ background: '#111118', borderRadius: 8, padding: 16 }}>
      <h2 style={{ color: '#e0e0e0', marginBottom: 12, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>
        Portfolio Value Over Time
      </h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
          <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
          <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 4 }}
            labelStyle={{ color: '#ccc' }}
            formatter={(v, name) => [`$${Number(v).toFixed(4)}`, LLM_LABELS[name] ?? name]}
          />
          <Legend
            formatter={(v) => (
              <span style={{ color: LLM_COLORS[v] ?? '#fff', fontSize: 12 }}>
                {LLM_LABELS[v] ?? v}
              </span>
            )}
          />
          {llms.map((llm) => (
            <Line
              key={llm}
              type="monotone"
              dataKey={llm}
              stroke={LLM_COLORS[llm] ?? '#888'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
