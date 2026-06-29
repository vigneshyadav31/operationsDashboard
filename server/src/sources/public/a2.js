'use strict';

// A2 — Frankfurter FX rates (USD -> EUR, GBP, INR) with a 30-day history.
// Endpoints:
//   latest : GET https://api.frankfurter.dev/v1/latest?from=USD&to=EUR,GBP,INR
//   series : GET https://api.frankfurter.dev/v1/{start}..{end}?from=USD&to=EUR,GBP,INR
// Widget: multiline. Trigger: abs_gt 2 on wowPct (Cross-border Invoicing).

const BASE = 'https://api.frankfurter.dev/v1';
const SYMBOLS = ['EUR', 'GBP', 'INR'];

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

module.exports = {
  id: 'A2',
  name: 'Frankfurter — FX rates',
  category: 'public',
  sensitive: false,
  ttlSeconds: 3600,
  refresh: true,
  widget: {
    type: 'multiline',
    title: 'FX — USD crosses (30d)',
    question: 'trigger',
    description: 'USD vs EUR / GBP / INR, 30-day trend',
  },

  async fetch(ctx) {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
    const to = SYMBOLS.join(',');
    const seriesUrl = `${BASE}/${isoDay(start)}..${isoDay(end)}?from=USD&to=${to}`;
    const latestUrl = `${BASE}/latest?from=USD&to=${to}`;
    const [series, latest] = await Promise.all([
      ctx.http(seriesUrl, { parse: 'json', timeoutMs: 10000 }),
      ctx.http(latestUrl, { parse: 'json', timeoutMs: 10000 }),
    ]);
    return { series, latest };
  },

  normalize(raw) {
    const ratesByDate = (raw && raw.series && raw.series.rates) || {};
    const dates = Object.keys(ratesByDate).sort();
    const series = SYMBOLS.map((sym) => ({
      name: `USD/${sym}`,
      points: dates.map((d) => ({
        x: d,
        y: Number(ratesByDate[d] && ratesByDate[d][sym]) || 0,
      })),
    }));

    // Week-over-week % change per currency, taken as the largest absolute move.
    const wow = {};
    for (const s of series) {
      const pts = s.points.filter((p) => p.y > 0);
      if (pts.length >= 8) {
        const last = pts[pts.length - 1].y;
        const weekAgo = pts[pts.length - 8].y;
        wow[s.name] = weekAgo ? ((last - weekAgo) / weekAgo) * 100 : 0;
      } else {
        wow[s.name] = 0;
      }
    }
    let wowPct = 0;
    for (const v of Object.values(wow)) {
      if (Math.abs(v) > Math.abs(wowPct)) wowPct = v;
    }

    return {
      series,
      xLabel: 'Date',
      yLabel: 'Units per USD',
      metrics: {
        wowPct: Math.round(wowPct * 100) / 100,
        eurWowPct: Math.round((wow['USD/EUR'] || 0) * 100) / 100,
        gbpWowPct: Math.round((wow['USD/GBP'] || 0) * 100) / 100,
        inrWowPct: Math.round((wow['USD/INR'] || 0) * 100) / 100,
      },
    };
  },

  sample() {
    // 14 daily points; INR drifts ~+2.6% over the last week -> abs_gt 2 fires.
    const rates = {};
    const eur0 = 0.92;
    const gbp0 = 0.79;
    const inr0 = 83.0;
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const k = 13 - i;
      rates[d] = {
        EUR: Math.round((eur0 + Math.sin(k / 3) * 0.004) * 1e4) / 1e4,
        GBP: Math.round((gbp0 + Math.cos(k / 4) * 0.003) * 1e4) / 1e4,
        // INR ramps up roughly linearly so WoW exceeds +2%.
        INR: Math.round((inr0 + k * 0.32) * 1e4) / 1e4,
      };
    }
    const dates = Object.keys(rates).sort();
    const latestDate = dates[dates.length - 1];
    return this.normalize({
      series: { base: 'USD', rates },
      latest: { base: 'USD', date: latestDate, rates: rates[latestDate] },
    });
  },

  trigger: {
    metric: 'wowPct',
    comparator: 'abs_gt',
    threshold: 2,
    sopId: 'SOP-A2',
    sopTitle: 'Cross-border Invoicing',
    assignee: 'analyst',
    slaHours: 48,
    severity: 'medium',
  },
};
