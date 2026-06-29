'use strict';

const ENDPOINT =
  'https://api.worldbank.org/v2/country/IND/indicator/FP.CPI.TOTL.ZG?format=json&per_page=60';

function stddev(values, mean) {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
}

module.exports = {
  id: 'A3',
  name: 'World Bank — India CPI',
  category: 'public',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'bar',
    title: 'India CPI Inflation (annual %)',
    question: 'trigger',
    description: 'World Bank FP.CPI.TOTL.ZG — last 10 years',
  },

  async fetch(ctx) {
    return ctx.http(ENDPOINT, { parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {

    const rows = Array.isArray(raw) && Array.isArray(raw[1]) ? raw[1] : [];
    const points = rows
      .filter((r) => r && r.value != null)
      .map((r) => ({ year: String(r.date), value: Number(r.value) }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const last10 = points.slice(-10);
    const categories = last10.map((p) => p.year);
    const values = last10.map((p) => Math.round(p.value * 100) / 100);

    const latest = values.length ? values[values.length - 1] : 0;
    const prior = values.slice(0, -1);
    const mean = prior.length
      ? prior.reduce((a, b) => a + b, 0) / prior.length
      : latest;
    const sd = stddev(prior, mean);
    const inflationSd = sd > 0 ? (latest - mean) / sd : 0;

    return {
      categories,
      series: [{ name: 'CPI %', values }],
      stacked: false,
      metrics: {
        inflationSd: Math.round(inflationSd * 100) / 100,
        latestInflation: latest,
        meanInflation: Math.round(mean * 100) / 100,
      },
    };
  },

  sample() {

    const base = [4.9, 5.1, 4.8, 5.0, 4.7, 5.2, 4.9, 5.0, 5.1];
    const series = base.map((v, i) => ({
      date: String(2015 + i),
      value: v,
    }));
    series.push({ date: '2024', value: 9.8 });
    return this.normalize([{ page: 1, total: series.length }, series]);
  },

  trigger: {
    metric: 'inflationSd',
    comparator: 'gt',
    threshold: 2,
    sopId: 'SOP-A3',
    sopTitle: 'Pricing Review',
    assignee: 'analyst',
    slaHours: 72,
    severity: 'medium',
  },
};
