import { supabase } from '../lib/supabase.js';
import { getLivePrices, getDailyClose, getHistoricalBars } from '../lib/alpaca.js';
import { THEORY_BASKETS, LLM_NAMES, STARTING_CAPITAL } from '../lib/stocks.js';
import { buildPrompt } from './promptBuilder.js';
import { LLM_CALLERS } from './llmCallers.js';
import { parseResponse, applyTrades } from './tradeParser.js';

async function getOrInitPortfolio(llm, mode) {
  const { data } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('llm', llm)
    .eq('mode', mode)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  // DB column is `cash_remaining`; downstream code uses `cash`. Normalize here.
  if (data) {
    return {
      llm: data.llm,
      mode: data.mode,
      cash: data.cash_remaining,
      holdings: data.holdings ?? {},
      total_value: data.total_value,
    };
  }

  return {
    llm,
    mode,
    cash: STARTING_CAPITAL,
    holdings: {},
    total_value: STARTING_CAPITAL,
  };
}

async function getTradeHistory(llm, mode) {
  const { data } = await supabase
    .from('trades')
    .select('*')
    .eq('llm', llm)
    .eq('mode', mode)
    .order('timestamp', { ascending: false })
    .limit(50);
  return (data ?? []).reverse();
}

async function saveTrades(trades) {
  const { error } = await supabase.from('trades').insert(trades);
  if (error) throw new Error(`saveTrades failed (${trades.length} rows): ${error.message}`);
}

async function savePortfolio(snapshot) {
  const { error } = await supabase.from('portfolio_snapshots').insert(snapshot);
  if (error) throw new Error(`savePortfolio failed: ${error.message}`);
}

async function runOneLLM({ llm, date, prices, basket, mode, cycleId }) {
  const portfolio = await getOrInitPortfolio(llm, mode);
  const tradeHistory = await getTradeHistory(llm, mode);

  const prompt = buildPrompt({
    date,
    prices,
    tradeHistory,
    portfolio: {
      cash: portfolio.cash,
      holdings: portfolio.holdings ?? {},
      total_value: portfolio.total_value,
    },
    basket,
  });

  let rawResponse;
  try {
    rawResponse = await LLM_CALLERS[llm](prompt);
  } catch (err) {
    console.error(`LLM call failed for ${llm}:`, err.message);
    return;
  }

  const symbols = basket.symbols.filter((s) => prices[s] !== null);
  const { decisions, reasoningText } = parseResponse(
    rawResponse,
    symbols,
    { cash: portfolio.cash, holdings: portfolio.holdings ?? {} },
    prices
  );

  const timestamp = new Date(date).toISOString();

  const rows = decisions.map((d) => ({
    llm,
    ticker: d.ticker,
    action: d.action,
    quantity: d.quantity,
    price_at_decision: d.price_at_decision,
    timestamp,
    reasoning_text: reasoningText,
    is_refusal: d.is_refusal,
    refusal_type: d.refusal_type,
    theory_tag: basket.name,
    mode,
    cycle_id: cycleId,
    raw_response: rawResponse,
  }));
  await saveTrades(rows);

  const updatedPortfolio = applyTrades(
    { cash: portfolio.cash, holdings: portfolio.holdings ?? {} },
    decisions,
    prices
  );

  await savePortfolio({
    llm,
    timestamp,
    total_value: updatedPortfolio.total_value,
    cash_remaining: updatedPortfolio.cash,
    holdings: updatedPortfolio.holdings,
    mode,
  });
}

export async function runCycle({ mode = 'live', theoryKey = 'theory1', date = null, cycleId }) {
  const basket = THEORY_BASKETS[theoryKey];
  if (!basket) throw new Error(`Unknown theory: ${theoryKey}`);

  const targetDate = date ?? new Date().toISOString().split('T')[0];
  let prices;

  if (mode === 'live') {
    prices = await getLivePrices(basket.symbols);
  } else {
    prices = await getDailyClose(basket.symbols, targetDate);
  }

  const validSymbols = Object.entries(prices)
    .filter(([, p]) => p !== null)
    .map(([s]) => s);

  if (validSymbols.length === 0) throw new Error('No valid prices for date: ' + targetDate);

  for (const llm of LLM_NAMES) {
    await runOneLLM({ llm, date: targetDate, prices, basket, mode, cycleId });
  }
}

export async function runFullBacktest({ theoryKey, startDate, endDate }) {
  const basket = THEORY_BASKETS[theoryKey];
  const bars = await getHistoricalBars(basket.symbols, startDate, endDate);

  // Collect all trading dates from any symbol
  const dateSet = new Set();
  for (const sym of basket.symbols) {
    for (const bar of bars[sym] ?? []) {
      dateSet.add(bar.t.split('T')[0]);
    }
  }

  const dates = [...dateSet].sort();

  for (const date of dates) {
    const { data: cycle } = await supabase
      .from('cycles')
      .insert({
        triggered_at: new Date().toISOString(),
        mode: 'backtest',
        stock_basket: theoryKey,
        status: 'running',
      })
      .select()
      .single();

    try {
      await runCycle({ mode: 'backtest', theoryKey, date, cycleId: cycle.id });
      await supabase.from('cycles').update({ status: 'complete' }).eq('id', cycle.id);
    } catch (err) {
      await supabase
        .from('cycles')
        .update({ status: 'error', error_msg: err.message })
        .eq('id', cycle.id);
      console.error(`Backtest cycle failed for ${date}:`, err.message);
    }
  }
}
