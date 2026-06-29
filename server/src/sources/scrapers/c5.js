'use strict';

const { loadScraperConfig } = require('../../config/sources');

const ID = 'C5';

function pct(open, close) {
  if (!open) return 0;
  return ((close - open) / open) * 100;
}

module.exports = {
  id: ID,
  name: 'Yahoo Finance — intraday (AAPL)',
  category: 'scraper',
  sensitive: false,
  ttlSeconds: 1800,
  refresh: true,
  widget: {
    type: 'candlestick',
    title: 'Market — AAPL Intraday',
    question: 'trigger',
    description: 'Intraday OHLC; flags large intraday moves (training-only source)',
  },

  async fetch(ctx) {
    const cfg = loadScraperConfig(ID) || {};
    if (cfg.enabled === false) return null;

    const endpoint =
      cfg.endpoint ||
      'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=5m';
    const userAgent =
      (cfg.userAgent && String(cfg.userAgent)) ||
      "Operations Dashboard (Founder's Office) contact: ops-dashboard@example.com";

    try {
      const raw = await ctx.http(endpoint, {
        method: 'GET',
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        parse: 'json',
        timeoutMs: 8000,
      });
      const result =
        raw && raw.chart && Array.isArray(raw.chart.result) ? raw.chart.result[0] : null;
      if (!result) return null;
      const ts = result.timestamp || [];
      const q =
        result.indicators && result.indicators.quote && result.indicators.quote[0]
          ? result.indicators.quote[0]
          : {};
      return { ts, open: q.open, high: q.high, low: q.low, close: q.close };
    } catch (_e) {

      return null;
    }
  },

  normalize(raw) {
    if (!raw || !Array.isArray(raw.ts) || !Array.isArray(raw.close)) return this.sample();

    const candles = [];
    for (let i = 0; i < raw.ts.length; i++) {
      const o = raw.open[i];
      const h = raw.high[i];
      const l = raw.low[i];
      const c = raw.close[i];
      if ([o, h, l, c].some((v) => v == null || Number.isNaN(v))) continue;
      candles.push({
        t: new Date(raw.ts[i] * 1000).toISOString(),
        o: Number(o.toFixed(2)),
        h: Number(h.toFixed(2)),
        l: Number(l.toFixed(2)),
        c: Number(c.toFixed(2)),
      });
    }
    if (candles.length === 0) return this.sample();

    const first = candles[0];
    const last = candles[candles.length - 1];
    const changePct = Number(pct(first.o, last.c).toFixed(2));

    return {
      candles,
      news: [{ title: 'AAPL intraday (Yahoo Finance, best-effort)' }],
      metrics: { changePct, lastClose: last.c },
    };
  },

  sample() {

    const base = new Date();
    base.setUTCHours(13, 30, 0, 0);
    const series = [
      [191.2, 191.9, 190.8, 191.6],
      [191.6, 192.4, 191.3, 192.1],
      [192.1, 192.3, 191.0, 191.2],
      [191.2, 191.5, 190.2, 190.6],
      [190.6, 190.9, 189.4, 189.7],
      [189.7, 190.1, 188.9, 189.2],
      [189.2, 189.4, 187.8, 188.0],
      [188.0, 188.6, 187.5, 188.4],
      [188.4, 189.2, 188.2, 189.0],
      [189.0, 189.3, 188.1, 188.3],
    ];
    const candles = series.map((c, i) => ({
      t: new Date(base.getTime() + i * 5 * 60 * 1000).toISOString(),
      o: c[0],
      h: c[1],
      l: c[2],
      c: c[3],
    }));
    const changePct = Number(pct(candles[0].o, candles[candles.length - 1].c).toFixed(2));
    return {
      candles,
      news: [
        { title: 'Sample intraday (Yahoo Finance is training-only / JS-rendered)' },
      ],
      metrics: { changePct, lastClose: candles[candles.length - 1].c },
    };
  },

  trigger: {
    metric: 'changePct',
    comparator: 'abs_gt',
    threshold: 5,
    sopId: 'SOP-C5',
    sopTitle: 'Market Event Memo',
    assignee: 'founder',
    slaHours: 24,
    severity: 'high',
  },
};
