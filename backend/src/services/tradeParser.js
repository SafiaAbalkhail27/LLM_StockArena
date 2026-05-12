export function parseResponse(rawText, symbols, portfolio, prices) {
  const lines = rawText.split('\n');
  const decisions = [];

  let inDecisions = false;
  let reasoningStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^DECISIONS:/i.test(line)) { inDecisions = true; continue; }
    if (/^REASONING:/i.test(line)) { inDecisions = false; reasoningStart = i + 1; continue; }

    if (inDecisions && line) {
      const match = line.match(/^([A-Z]+):\s*(BUY|SELL|HOLD|DECLINE)\s*(\d+)?\s*(.*)?/i);
      if (match) {
        const ticker = match[1].toUpperCase();
        const action = match[2].toLowerCase();
        const quantity = match[3] ? parseInt(match[3], 10) : 0;
        const extraText = match[4]?.trim() ?? '';

        if (!symbols.includes(ticker)) continue;

        const price = prices[ticker] ?? 0;
        const isRefusal = action === 'decline';
        const isHold = action === 'hold';

        let validQty = quantity;
        if (action === 'buy') {
          const maxShares = Math.floor(portfolio.cash / price);
          validQty = Math.min(quantity, maxShares);
        }
        if (action === 'sell') {
          const held = portfolio.holdings[ticker] ?? 0;
          validQty = Math.min(quantity, held);
        }

        decisions.push({
          ticker,
          action: isRefusal ? 'hold' : action,
          quantity: isHold || isRefusal ? 0 : validQty,
          price_at_decision: price,
          is_refusal: isRefusal,
          decline_reason: isRefusal ? extraText : null,
        });
      }
    }
  }

  const reasoningText =
    reasoningStart >= 0
      ? lines.slice(reasoningStart).join('\n').trim()
      : rawText;

  // Symbols with no explicit decision get HOLD
  for (const sym of symbols) {
    if (!decisions.find((d) => d.ticker === sym)) {
      decisions.push({
        ticker: sym,
        action: 'hold',
        quantity: 0,
        price_at_decision: prices[sym] ?? 0,
        is_refusal: false,
        decline_reason: null,
      });
    }
  }

  return { decisions, reasoningText };
}

export function applyTrades(portfolio, decisions, prices) {
  const holdings = { ...portfolio.holdings };
  let cash = portfolio.cash;

  for (const d of decisions) {
    if (d.action === 'buy' && d.quantity > 0) {
      const cost = d.quantity * (prices[d.ticker] ?? 0);
      if (cost <= cash) {
        cash -= cost;
        holdings[d.ticker] = (holdings[d.ticker] ?? 0) + d.quantity;
      }
    } else if (d.action === 'sell' && d.quantity > 0) {
      const proceeds = d.quantity * (prices[d.ticker] ?? 0);
      const held = holdings[d.ticker] ?? 0;
      const actualSell = Math.min(d.quantity, held);
      if (actualSell > 0) {
        cash += actualSell * (prices[d.ticker] ?? 0);
        holdings[d.ticker] = held - actualSell;
        if (holdings[d.ticker] === 0) delete holdings[d.ticker];
      }
    }
  }

  const holdingsValue = Object.entries(holdings).reduce(
    (sum, [sym, qty]) => sum + qty * (prices[sym] ?? 0),
    0
  );

  return { holdings, cash, total_value: cash + holdingsValue };
}
