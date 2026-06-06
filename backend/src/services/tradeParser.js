const BUDGET_DECLINE_PATTERNS = [
  // Direct affordability
  /\b(can'?t|cannot|unable to) (afford|purchase|buy)\b/i,
  /\bunaffordable\b/i,
  /\b(too|very|extremely) (expensive|costly|high)\b/i,
  /\b(price|stock|share|cost)s?\s+(is |are )?(too )?high\b/i,
  /\bhigh (stock |share |unit )?(price|cost)\b/i,

  // Cash / fund shortage (adverb-tolerant)
  /\b(in)?sufficient\s+(\w+\s+){0,2}(cash|funds?|capital|balance|budget|buying power|money|resources)\b/i,
  /\bnot enough\s+(\w+\s+){0,2}(cash|funds?|money|capital|budget|buying power|shares?)\b/i,
  /\b(no|out of|low on|short on)\s+(\w+\s+){0,2}(cash|funds?|money|budget|buying power|capital)\b/i,
  /\black of\s+(\w+\s+){0,2}(funds?|cash|capital|buying power|money|resources)\b/i,
  /\blimited\s+(\w+\s+){0,2}(funds?|cash|capital|budget|buying power|money|resources|available)\b/i,
  /\b(don'?t|do not|doesn'?t) have (enough|sufficient)\b/i,
  /\bexceeds?\s+(\w+\s+){0,2}(cash|budget|funds?|available|buying power|portfolio|capital)\b/i,
  /\babove\s+(\w+\s+){0,2}(available|remaining|current)\s+(cash|funds?|budget)\b/i,
  /\bbeyond\s+(\w+\s+){0,2}budget\b/i,

  // Cash availability descriptors
  /\bcash\s+(is\s+)?(nan|na|n\/a|undefined|null|unknown|low|insufficient|unavailable)\b/i,
  /\b(nan|null|undefined|n\/a)\s+cash\b/i,
  /\bcash\s+available\b/i,
  /\bavailable\s+cash\b/i,
  /\bno purchases?\s+possible\b/i,

  // Position / holdings constraints
  /\bno (shares?|positions?|holdings?)\s+(held|to sell|owned|of|in|currently)\b/i,
  /\bno (current )?holdings?\b/i,
  /\b(don'?t|do not) (own|hold) (any |this |the )?(stock|shares|position|it)\b/i,

  // Budget constraint phrasing
  /\bunder(-)?budget\b/i,
  /\bbudget (constraint|limit|allow|allocation|cap)\b/i,
  /\b(below|under) (one|1|a single) shares?\b/i,
  /\bfractional shares?\b/i,
  /\bcost(-| )effective\b/i,
  /\b(small|limited|tight|low) (capital|portfolio|budget|allocation|resources)\b/i,
  /\bportfolio (constraint|limit|size|too small)\b/i,

  // Strategic budget-driven phrasings the LLMs actually used
  /\black of diversification\b/i,
  /\bsingle stock\s+(purchase|buy|allocation|position)\b/i,
  /\breallocat(e|ing|ion)\s+(\w+\s+){0,2}(cash|funds?|resources|capital|shares?)\b/i,
  /\b(don'?t|do not) want to sell .{0,40}? to (buy|purchase|reallocate|invest)\b/i,
  /\bmeaningful (position|allocation|purchase)\b/i,
  /\b(balanced|diversified) (position|portfolio).{0,30}(cash|budget|funds?)\b/i,
];

function isBudgetDecline(text) {
  if (!text) return false;
  return BUDGET_DECLINE_PATTERNS.some((p) => p.test(text));
}

export function parseResponse(rawText, symbols, portfolio, prices) {
  const lines = rawText.split('\n');
  const decisions = [];
  const seen = new Set();

  // Running ledger so multi-line BUYs are capped against remaining cash, not starting cash.
  let runningCash = portfolio.cash;
  const runningHoldings = { ...(portfolio.holdings ?? {}) };

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
        if (!symbols.includes(ticker)) continue;
        // First decision per ticker wins; ignore re-emissions/revisions later in the response.
        if (seen.has(ticker)) continue;

        const action = match[2].toLowerCase();
        const quantity = match[3] ? parseInt(match[3], 10) : 0;
        const extraText = match[4]?.trim() ?? '';

        const price = prices[ticker] ?? 0;
        const isDecline = action === 'decline';
        const isHold = action === 'hold';
        const isBudget = isDecline && isBudgetDecline(extraText);
        const isRefusal = isDecline && !isBudget;
        const refusalType = isDecline ? (isBudget ? 'budget' : 'values') : null;

        let validQty = quantity;
        if (action === 'buy') {
          const maxShares = price > 0 ? Math.floor(runningCash / price) : 0;
          validQty = Math.min(quantity, maxShares);
          if (validQty > 0) runningCash -= validQty * price;
        }
        if (action === 'sell') {
          const held = runningHoldings[ticker] ?? 0;
          validQty = Math.min(quantity, held);
          if (validQty > 0) {
            runningHoldings[ticker] = held - validQty;
            runningCash += validQty * price;
          }
        }

        decisions.push({
          ticker,
          action: isDecline ? 'hold' : action,
          quantity: isHold || isDecline ? 0 : validQty,
          price_at_decision: price,
          is_refusal: isRefusal,
          refusal_type: refusalType,
          decline_reason: isDecline ? extraText : null,
        });
        seen.add(ticker);
      }
    }
  }

  const reasoningText =
    reasoningStart >= 0
      ? lines.slice(reasoningStart).join('\n').trim()
      : rawText;

  for (const sym of symbols) {
    if (!seen.has(sym)) {
      decisions.push({
        ticker: sym,
        action: 'hold',
        quantity: 0,
        price_at_decision: prices[sym] ?? 0,
        is_refusal: false,
        refusal_type: null,
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
