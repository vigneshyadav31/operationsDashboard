'use strict';

// C6 — Wikimedia Pageviews (daily per-article views for Infosys) as an attention/
// reputation proxy. A day with views well above the period mean (in std-devs) drives
// the Reputation Audit SOP. Wikimedia policy requires a descriptive User-Agent with a
// contact. Rendered as a line chart. Per CONTRACTS §2/§3.

const { loadScraperConfig } = require('../../config/sources');

const ID = 'C6';

function stats(values) {
  const n = values.length || 1;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  return { mean, sd };
}

// "yyyymmdd00" -> "yyyy-mm-dd"
function fmtTs(ts) {
  const s = String(ts || '');
  if (s.length >= 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

module.exports = {
  id: ID,
  name: 'Wikipedia Pageviews — attention',
  category: 'scraper',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'line',
    title: 'Attention — Infosys Pageviews',
    question: 'trigger',
    description: 'Daily Wikipedia pageviews; flags spikes above the period mean',
  },

  async fetch(ctx) {
    const cfg = loadScraperConfig(ID) || {};
    if (cfg.enabled === false) return null;

    const endpoint =
      cfg.endpoint ||
      'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/Infosys/daily/20240101/20240131';
    const userAgent =
      (cfg.userAgent && String(cfg.userAgent)) ||
      "Operations Dashboard (Founder's Office) contact: ops-dashboard@example.com";

    const raw = await ctx.http(endpoint, {
      method: 'GET',
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      parse: 'json',
      timeoutMs: 10000,
    });

    return raw && Array.isArray(raw.items) ? raw.items : null;
  },

  normalize(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return this.sample();

    const points = raw.map((it) => ({
      x: fmtTs(it.timestamp),
      y: Number(it.views) || 0,
    }));
    const values = points.map((p) => p.y);
    const { mean, sd } = stats(values);
    const peak = Math.max(...values);
    // Peak distance from the period mean in std-devs (0 if flat).
    const viewsVsMean = sd > 0 ? Number(((peak - mean) / sd).toFixed(2)) : 0;

    return {
      series: [{ name: 'Daily pageviews', points }],
      xLabel: 'Date',
      yLabel: 'Pageviews',
      metrics: { viewsVsMean, peak, mean: Number(mean.toFixed(0)) },
    };
  },

  sample() {
    // 31 days with a clear spike (~day 20) so viewsVsMean > 2 and the trigger fires.
    const base = new Date(Date.UTC(2024, 0, 1));
    const baseline = [
      1200, 1180, 1240, 1320, 1290, 980, 1010, 1350, 1410, 1380,
      1300, 1260, 1100, 1080, 1330, 1390, 1420, 1370, 1290, 5200,
      4800, 3100, 2100, 1500, 1340, 1280, 1220, 1190, 1310, 1360, 1340,
    ];
    const points = baseline.map((v, i) => ({
      x: new Date(base.getTime() + i * 24 * 3600 * 1000).toISOString().slice(0, 10),
      y: v,
    }));
    const { mean, sd } = stats(baseline);
    const peak = Math.max(...baseline);
    const viewsVsMean = sd > 0 ? Number(((peak - mean) / sd).toFixed(2)) : 0;
    return {
      series: [{ name: 'Daily pageviews', points }],
      xLabel: 'Date',
      yLabel: 'Pageviews',
      metrics: { viewsVsMean, peak, mean: Number(mean.toFixed(0)) },
    };
  },

  trigger: {
    metric: 'viewsVsMean',
    comparator: 'gt',
    threshold: 2,
    sopId: 'SOP-C6',
    sopTitle: 'Reputation Audit',
    assignee: 'analyst',
    slaHours: 72,
    severity: 'low',
  },
};
