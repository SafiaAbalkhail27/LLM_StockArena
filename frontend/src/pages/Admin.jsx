import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../lib/constants.js';

const CRON_PRESETS = {
  '0 * * * *': 'Every hour',
  '0 */2 * * *': 'Every 2 hours',
  '0 */4 * * *': 'Every 4 hours',
  '30 9,15 * * 1-5': 'Market open + close (9:30am & 3pm ET, weekdays)',
};

const inp = {
  background: '#0d0d17',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#e0e0e0',
  padding: '6px 10px',
  fontSize: 13,
  width: '100%',
};

const btn = (color = '#10b981') => ({
  background: color + '22',
  color,
  border: `1px solid ${color}55`,
  borderRadius: 4,
  padding: '7px 16px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 700,
});

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [mode, setMode] = useState('live');
  const [theory, setTheory] = useState('theory1');
  const [startDate, setStartDate] = useState('2024-01-02');
  const [endDate, setEndDate] = useState('2024-01-31');
  const [customCron, setCustomCron] = useState('0 */4 * * *');
  const [log, setLog] = useState([]);
  const [cycles, setCycles] = useState([]);

  function addLog(msg, type = 'info') {
    setLog((prev) => [{ msg, type, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  }

  async function apiFetch(path, body) {
    const res = await fetch(`${BACKEND_URL}/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function loadCycles() {
    const res = await fetch(`${BACKEND_URL}/api/cycles`, {
      headers: { 'x-admin-password': password },
    });
    const data = await res.json();
    setCycles(Array.isArray(data) ? data : []);
  }

  function handleAuth(e) {
    e.preventDefault();
    if (password.trim()) {
      setAuthed(true);
      loadCycles();
    }
  }

  async function runCycle() {
    addLog('Starting cycle...');
    const data = await apiFetch('/run-cycle', { mode, theoryKey: theory });
    addLog(data.message || JSON.stringify(data), data.error ? 'error' : 'ok');
    setTimeout(loadCycles, 2000);
  }

  async function runBacktest() {
    addLog(`Starting backtest ${startDate} → ${endDate}...`);
    const data = await apiFetch('/run-backtest', { theoryKey: theory, startDate, endDate });
    addLog(data.message || JSON.stringify(data), data.error ? 'error' : 'ok');
  }

  async function setSchedule() {
    const data = await apiFetch('/schedule', { cronExpression: customCron, theoryKey: theory });
    addLog(data.message || JSON.stringify(data), data.error ? 'error' : 'ok');
  }

  async function killSwitch() {
    const data = await apiFetch('/kill', {});
    addLog(data.message || JSON.stringify(data), 'warn');
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleAuth} style={{ background: '#111118', padding: 32, borderRadius: 8, width: 300 }}>
          <h2 style={{ color: '#e0e0e0', marginBottom: 16, fontSize: 16, letterSpacing: 2, textTransform: 'uppercase' }}>Admin</h2>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inp, marginBottom: 12 }}
            autoFocus
          />
          <button type="submit" style={{ ...btn(), width: '100%' }}>Enter</button>
        </form>
      </div>
    );
  }

  const statusColor = { running: '#f59e0b', complete: '#10b981', error: '#ef4444' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #1e1e2e', paddingBottom: 12 }}>
        <h1 style={{ color: '#e0e0e0', fontSize: 16, letterSpacing: 3, textTransform: 'uppercase' }}>Admin Panel</h1>
        <a href="/" style={{ color: '#555', fontSize: 12 }}>← Public dashboard</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Mode + Theory */}
        <div style={{ background: '#111118', borderRadius: 8, padding: 16 }}>
          <h3 style={{ color: '#aaa', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Settings</h3>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ ...inp, marginBottom: 12 }}>
            <option value="live">Live</option>
            <option value="backtest">Backtest</option>
          </select>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Theory basket</label>
          <select value={theory} onChange={(e) => setTheory(e.target.value)} style={{ ...inp, marginBottom: 16 }}>
            <option value="theory1">Theory 1 — Tech over-indexing</option>
            <option value="theory2">Theory 2 — Partnership bias</option>
            <option value="theory3">Theory 3 — Safe play</option>
          </select>
          <button onClick={runCycle} style={btn()}>
            ▶ Run cycle now
          </button>
        </div>

        {/* Backtest */}
        <div style={{ background: '#111118', borderRadius: 8, padding: 16 }}>
          <h3 style={{ color: '#aaa', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Backtest</h3>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...inp, marginBottom: 8 }} />
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ ...inp, marginBottom: 16 }} />
          <button onClick={runBacktest} style={btn('#3b82f6')}>
            ⏩ Run full backtest
          </button>
        </div>

        {/* Scheduling */}
        <div style={{ background: '#111118', borderRadius: 8, padding: 16 }}>
          <h3 style={{ color: '#aaa', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Live Schedule</h3>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Cron preset</label>
          <select
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            style={{ ...inp, marginBottom: 8 }}
          >
            {Object.entries(CRON_PRESETS).map(([expr, label]) => (
              <option key={expr} value={expr}>{label}</option>
            ))}
          </select>
          <input
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="Custom cron expression"
            style={{ ...inp, marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={setSchedule} style={btn('#f59e0b')}>Set schedule</button>
            <button onClick={killSwitch} style={btn('#ef4444')}>Kill switch</button>
          </div>
        </div>

        {/* Status log */}
        <div style={{ background: '#111118', borderRadius: 8, padding: 16 }}>
          <h3 style={{ color: '#aaa', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            Status log
          </h3>
          <div style={{ maxHeight: 180, overflowY: 'auto', fontSize: 12 }}>
            {log.map((l, i) => (
              <div key={i} style={{ marginBottom: 4, color: l.type === 'error' ? '#ef4444' : l.type === 'warn' ? '#f59e0b' : '#aaa' }}>
                <span style={{ color: '#555' }}>[{l.ts}]</span> {l.msg}
              </div>
            ))}
            {log.length === 0 && <span style={{ color: '#555' }}>No activity yet.</span>}
          </div>
        </div>
      </div>

      {/* Recent cycles */}
      <div style={{ background: '#111118', borderRadius: 8, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ color: '#aaa', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Recent cycles</h3>
          <button onClick={loadCycles} style={{ ...btn('#888'), padding: '3px 10px', fontSize: 11 }}>Refresh</button>
        </div>
        {cycles.slice(0, 10).map((c) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1a2e', padding: '6px 0', fontSize: 12 }}>
            <span style={{ color: '#888' }}>{c.triggered_at?.split('T')[0]}</span>
            <span style={{ color: '#aaa' }}>{c.stock_basket} / {c.mode}</span>
            <span style={{ color: statusColor[c.status] ?? '#888', fontWeight: 700 }}>{c.status}</span>
            {c.error_msg && <span style={{ color: '#ef4444', fontSize: 11 }}>{c.error_msg.slice(0, 60)}</span>}
          </div>
        ))}
        {cycles.length === 0 && <span style={{ color: '#555', fontSize: 12 }}>No cycles yet.</span>}
      </div>
    </div>
  );
}
