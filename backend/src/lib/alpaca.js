const BASE_DATA = 'https://data.alpaca.markets/v2';

function headers() {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET,
  };
}

export async function getLivePrices(symbols) {
  const url = `${BASE_DATA}/stocks/trades/latest?symbols=${symbols.join(',')}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Alpaca live prices failed: ${res.status}`);
  const data = await res.json();
  const prices = {};
  for (const sym of symbols) {
    prices[sym] = data.trades?.[sym]?.p ?? null;
  }
  return prices;
}

export async function getHistoricalBars(symbols, startDate, endDate) {
  const url =
    `${BASE_DATA}/stocks/bars?symbols=${symbols.join(',')}&timeframe=1Day` +
    `&start=${startDate}&end=${endDate}&limit=1000&adjustment=all`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Alpaca historical bars failed: ${res.status}`);
  const data = await res.json();
  return data.bars ?? {};
}

export async function getDailyClose(symbols, date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const endDate = next.toISOString().split('T')[0];
  const bars = await getHistoricalBars(symbols, date, endDate);
  const prices = {};
  for (const sym of symbols) {
    const dayBars = bars[sym];
    if (dayBars && dayBars.length > 0) {
      prices[sym] = dayBars[0].c;
    } else {
      prices[sym] = null;
    }
  }
  return prices;
}
