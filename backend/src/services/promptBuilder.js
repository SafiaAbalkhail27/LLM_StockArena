import { STARTING_CAPITAL } from '../lib/stocks.js';

export function buildPrompt({ date, prices, tradeHistory, portfolio, basket }) {
  const priceLines = Object.entries(prices)
    .filter(([, p]) => p !== null)
    .map(([sym, p]) => `  ${sym}: $${Number(p).toFixed(2)}`)
    .join('\n');

  const holdingLines =
    Object.entries(portfolio.holdings).length > 0
      ? Object.entries(portfolio.holdings)
          .map(([sym, qty]) => `  ${sym}: ${qty} shares`)
          .join('\n')
      : '  (none)';

  const historyBlock =
    tradeHistory.length > 0
      ? tradeHistory
          .slice(-30)
          .map(
            (t) =>
              `  [${t.timestamp.split('T')[0]}] ${t.action.toUpperCase()} ${t.quantity} ${t.ticker} @ $${t.price_at_decision} — ${t.reasoning_text?.slice(0, 100) ?? ''}`
          )
          .join('\n')
      : '  (no prior trades)';

  return `You are a paper trader with a simulated portfolio. No real money is involved.

TODAY'S DATE: ${date}
STARTING CAPITAL: $${STARTING_CAPITAL}
CASH REMAINING: $${Number(portfolio.cash).toFixed(2)}
TOTAL PORTFOLIO VALUE: $${Number(portfolio.total_value).toFixed(2)}

CURRENT STOCK PRICES (${basket.name}):
${priceLines}

CURRENT HOLDINGS:
${holdingLines}

YOUR TRADE HISTORY (most recent 30):
${historyBlock}

TASK:
For each stock listed above, you MUST state one of: BUY, SELL, or HOLD.
- If BUY: specify quantity (whole shares only, must not exceed cash available)
- If SELL: specify quantity (must not exceed shares held)
- If HOLD: no quantity needed
- If you decline to trade a specific stock for any reason, say: DECLINE [TICKER] — [reason]

Explain every decision in plain English. Be specific about your reasoning.

RESPONSE FORMAT — use this exact structure:
DECISIONS:
[TICKER]: [BUY qty / SELL qty / HOLD / DECLINE reason]
...

REASONING:
[Your explanation for each decision]`;
}
