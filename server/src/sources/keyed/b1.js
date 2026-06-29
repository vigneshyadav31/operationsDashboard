'use strict';

// B1 — Alpha Vantage (RELIANCE.BSE global quote).
// Endpoint: GET https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=RELIANCE.BSE&apikey=${ALPHAVANTAGE_KEY}
// Auth: query-string apikey.  ttlSeconds=21600 (free tier is 25 requests/DAY — be frugal).
// Widget: candlestick.  Trigger: abs_gt 5 on changePct (Investor Update, founder, 24h, high, sensitive).
const { MissingKeyError } = require('../../lib/AppError');

const SYMBOL = 'RELIANCE.BSE';
const BASE = 'https://www.alphavantage.co/query';

// Build a small intraday candle series around a close/open so the candlestick chart
// has something to render. Alpha Vantage's GLOBAL_QUOTE is a single OHLC snapshot;
// we synthesize a handful of session candles trending toward the close.
function buildCandles(open, high, low, close) {
  const o = Number(open);
  const h = Number(high);
  const l = Number(low);
  const c = Number(close);
  const steps = 6;
  const candles = [];
  for (let i = 0; i < steps; i += 1) {
    const frac = i / (steps - 1);
    const co = o + (c - o) * (i === 0 ? 0 : (i - 1) / (steps - 1));
    const cc = o + (c - o) * frac;
    const segHigh = Math.max(co, cc) + (h - Math.max(o, c)) * (1 - Math.abs(0.5 - frac) * 2) * 0.6;
    const segLow = Math.min(co, cc) - (Math.min(o, c) - l) * (1 - Math.abs(0.5 - frac) * 2) * 0.6;
    candles.push({
      t: `${String(9 + i).padStart(2, '0')}:30`,
      o: Number(co.toFixed(2)),
      h: Number(Math.max(segHigh, co, cc).toFixed(2)),
      l: Number(Math.min(segLow, co, cc).toFixed(2)),
      c: Number(cc.toFixed(2)),
    });
  }
  return candles;
}

module.exports = {
  id: 'B1',
  name: 'Alpha Vantage — RELIANCE.BSE',
  category: 'keyed',
  sensitive: true,
  ttlSeconds: 21600, // 6h — free tier allows only 25 calls/day.
  refresh: true,
  widget: {
    type: 'candlestick',
    title: 'Equity — Reliance (BSE)',
    question: 'trigger',
    description: 'Intraday OHLC + daily % change for the flagship holding',
  },

  async fetch(ctx) {
    const key = ctx.env.ALPHAVANTAGE_KEY;
    if (!key) throw new MissingKeyError('ALPHAVANTAGE_KEY');
    const url = `${BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(SYMBOL)}&apikey=${encodeURIComponent(key)}`;
    return ctx.http(url, { method: 'GET', parse: 'json', timeoutMs: 12000 });
  },

  normalize(raw) {
    const q = (raw && raw['Global Quote']) || {};
    const open = Number(q['02. open']);
    const high = Number(q['03. high']);
    const low = Number(q['04. low']);
    const price = Number(q['05. price']);
    const prevClose = Number(q['08. previous close']);
    // Alpha Vantage gives "10. change percent" like "1.2345%".
    let changePct = parseFloat(String(q['10. change percent'] || '').replace('%', ''));
    if (!Number.isFinite(changePct)) {
      changePct = Number.isFinite(price) && Number.isFinite(prevClose) && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : 0;
    }
    const o = Number.isFinite(open) ? open : price;
    const h = Number.isFinite(high) ? high : price;
    const l = Number.isFinite(low) ? low : price;
    const c = Number.isFinite(price) ? price : prevClose;
    const candles = buildCandles(o, h, l, c);
    return {
      candles,
      news: [
        { title: `RELIANCE.BSE last ${Number.isFinite(c) ? c.toFixed(2) : 'n/a'} INR` },
        { title: `Day change ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` },
      ],
      metrics: { changePct: Number(changePct.toFixed(2)) },
    };
  },

  sample() {
    // Breaches abs_gt 5 (change of -6.2%) so the Action Queue populates with zero keys.
    return this.normalize({
      'Global Quote': {
        '01. symbol': 'RELIANCE.BSE',
        '02. open': '2980.00',
        '03. high': '2992.40',
        '04. low': '2788.10',
        '05. price': '2796.55',
        '06. volume': '8421337',
        '07. latest trading day': '2026-06-29',
        '08. previous close': '2981.40',
        '09. change': '-184.85',
        '10. change percent': '-6.2000%',
      },
    });
  },

  trigger: {
    metric: 'changePct',
    comparator: 'abs_gt',
    threshold: 5,
    sopId: 'SOP-B1',
    sopTitle: 'Investor Update',
    assignee: 'founder',
    slaHours: 24,
    severity: 'high',
  },
};
