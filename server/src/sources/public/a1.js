'use strict';

// A1 — CoinGecko crypto spot (BTC/ETH) + 24h change.
// Endpoint: GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true
// Widget: kpi-sparkline. Trigger: abs_gt 10 on changePct (Treasury Reserve Review). Sensitive.

const ENDPOINT =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';

// Synthesize a short intraday-style sparkline from the spot value and 24h change,
// so the kpi-sparkline always has a trend to draw even though the upstream is a
// single point quote.
function buildSeries(value, changePct, points = 12) {
  const start = value / (1 + changePct / 100);
  const series = [];
  for (let i = 0; i < points; i++) {
    const f = i / (points - 1);
    const v = start + (value - start) * f;
    series.push({ t: i, v: Math.round(v * 100) / 100 });
  }
  return series;
}

module.exports = {
  id: 'A1',
  name: 'CoinGecko — crypto',
  category: 'public',
  sensitive: true,
  ttlSeconds: 300,
  refresh: true,
  widget: {
    type: 'kpi-sparkline',
    title: 'Treasury — Crypto',
    question: 'trigger',
    description: 'BTC/ETH spot (USD) + 24h trend',
  },

  async fetch(ctx) {
    return ctx.http(ENDPOINT, { parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {
    const btc = (raw && raw.bitcoin) || {};
    const eth = (raw && raw.ethereum) || {};
    const btcPrice = Number(btc.usd) || 0;
    const btcChange = Number(btc.usd_24h_change) || 0;
    const ethChange = Number(eth.usd_24h_change) || 0;
    // Headline KPI is BTC; the trigger metric is the largest absolute 24h move
    // across the two reserve assets.
    const changePct =
      Math.abs(btcChange) >= Math.abs(ethChange) ? btcChange : ethChange;
    return {
      value: Math.round(btcPrice * 100) / 100,
      unit: 'USD',
      delta: Math.round(btcChange * 100) / 100,
      label: 'BTC spot',
      series: buildSeries(btcPrice, btcChange),
      metrics: {
        changePct: Math.round(changePct * 100) / 100,
        btcChangePct: Math.round(btcChange * 100) / 100,
        ethChangePct: Math.round(ethChange * 100) / 100,
        btcPrice: Math.round(btcPrice * 100) / 100,
      },
    };
  },

  sample() {
    // BTC down ~12.4% on the day -> abs_gt 10 fires the high-severity card.
    return this.normalize({
      bitcoin: { usd: 61240.55, usd_24h_change: -12.42 },
      ethereum: { usd: 3380.12, usd_24h_change: -9.85 },
    });
  },

  trigger: {
    metric: 'changePct',
    comparator: 'abs_gt',
    threshold: 10,
    sopId: 'SOP-A1',
    sopTitle: 'Treasury Reserve Review',
    assignee: 'founder',
    slaHours: 24,
    severity: 'high',
  },
};
