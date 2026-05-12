import { Router } from 'express';
import { runCycle, runFullBacktest } from '../services/cycleRunner.js';
import { supabase } from '../lib/supabase.js';
import { THEORY_BASKETS } from '../lib/stocks.js';
import cron from 'node-cron';

const router = Router();

// Admin auth middleware
router.use((req, res, next) => {
  const pw = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

let scheduledTask = null;

router.post('/run-cycle', async (req, res) => {
  const { theoryKey = 'theory1', mode = 'live', date } = req.body;

  const { data: cycle, error: cycleErr } = await supabase
    .from('cycles')
    .insert({
      triggered_at: new Date().toISOString(),
      mode,
      stock_basket: theoryKey,
      status: 'running',
    })
    .select()
    .single();

  if (cycleErr || !cycle) {
    console.error('Supabase cycles insert error:', cycleErr);
    return res.status(500).json({ error: 'Failed to create cycle', detail: cycleErr?.message });
  }

  res.json({ message: 'Cycle started', cycleId: cycle.id });

  runCycle({ mode, theoryKey, date, cycleId: cycle.id })
    .then(() => supabase.from('cycles').update({ status: 'complete' }).eq('id', cycle.id))
    .catch(async (err) => {
      console.error('Cycle error:', err.message);
      await supabase
        .from('cycles')
        .update({ status: 'error', error_msg: err.message })
        .eq('id', cycle.id);
    });
});

router.post('/run-backtest', async (req, res) => {
  const { theoryKey = 'theory1', startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  res.json({ message: 'Backtest started' });

  runFullBacktest({ theoryKey, startDate, endDate }).catch((err) =>
    console.error('Backtest error:', err.message)
  );
});

router.post('/schedule', async (req, res) => {
  const { cronExpression, theoryKey = 'theory1' } = req.body;

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!cronExpression) {
    return res.json({ message: 'Schedule cleared' });
  }

  if (!cron.validate(cronExpression)) {
    return res.status(400).json({ error: 'Invalid cron expression' });
  }

  scheduledTask = cron.schedule(cronExpression, () => {
    const cycleId = crypto.randomUUID();
    runCycle({ mode: 'live', theoryKey, cycleId }).catch(console.error);
  });

  res.json({ message: 'Schedule set', cronExpression });
});

router.post('/kill', (req, res) => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  res.json({ message: 'All scheduled tasks stopped' });
});

router.get('/cycles', async (req, res) => {
  const { data } = await supabase
    .from('cycles')
    .select('*')
    .order('triggered_at', { ascending: false })
    .limit(20);
  res.json(data ?? []);
});

router.get('/theories', (req, res) => {
  res.json(THEORY_BASKETS);
});

export default router;
