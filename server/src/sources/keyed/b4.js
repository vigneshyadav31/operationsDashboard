'use strict';

// B4 — FRED (CPIAUCSL — US CPI, all urban consumers).
// Endpoint: GET https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${FRED_KEY}&file_type=json
// Auth: query-string api_key.  Widget: line.
// Trigger: gt 0.3 on `cpiMoM` (Pricing Review, analyst, 72h, medium).
const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://api.stlouisfed.org/fred/series/observations';

module.exports = {
  id: 'B4',
  name: 'FRED — US CPI (CPIAUCSL)',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'line',
    title: 'US CPI Index',
    question: 'trigger',
    description: 'Consumer Price Index trend + month-over-month change for pricing reviews',
  },

  async fetch(ctx) {
    const key = ctx.env.FRED_KEY;
    if (!key) throw new MissingKeyError('FRED_KEY');
    const url = `${BASE}?series_id=CPIAUCSL&api_key=${encodeURIComponent(key)}&file_type=json&sort_order=desc&limit=24`;
    return ctx.http(url, { method: 'GET', parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {
    const obs = (raw && Array.isArray(raw.observations) ? raw.observations : [])
      .filter((o) => o && o.value !== '.' && Number.isFinite(Number(o.value)))
      .map((o) => ({ date: o.date, value: Number(o.value) }))
      // FRED can return desc; ensure ascending by date for the line chart.
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const points = obs.map((o) => ({ x: o.date, y: o.value }));
    let cpiMoM = 0;
    if (obs.length >= 2) {
      const last = obs[obs.length - 1].value;
      const prev = obs[obs.length - 2].value;
      if (prev !== 0) cpiMoM = ((last - prev) / prev) * 100;
    }
    return {
      series: [{ name: 'CPIAUCSL', points }],
      xLabel: 'Month',
      yLabel: 'Index (1982-84=100)',
      metrics: { cpiMoM: Number(cpiMoM.toFixed(3)), latest: obs.length ? obs[obs.length - 1].value : 0 },
    };
  },

  sample() {
    // Last MoM jump ~0.55% breaches gt 0.3 (pricing review).
    return this.normalize({
      observations: [
        { date: '2026-01-01', value: '309.50' },
        { date: '2026-02-01', value: '310.40' },
        { date: '2026-03-01', value: '311.20' },
        { date: '2026-04-01', value: '311.95' },
        { date: '2026-05-01', value: '312.60' },
        { date: '2026-06-01', value: '314.32' },
      ],
    });
  },

  trigger: {
    metric: 'cpiMoM',
    comparator: 'gt',
    threshold: 0.3,
    sopId: 'SOP-B4',
    sopTitle: 'Pricing Review',
    assignee: 'analyst',
    slaHours: 72,
    severity: 'medium',
  },
};
