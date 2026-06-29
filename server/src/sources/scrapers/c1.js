'use strict';

const { loadScraperConfig } = require('../../config/sources');

const ID = 'C1';

function is8K(form) {
  return typeof form === 'string' && form.toUpperCase().startsWith('8-K');
}

function resolveUserAgent(cfg, ctx) {
  const fromEnv = ctx && ctx.env && ctx.env.SEC_EDGAR_UA ? String(ctx.env.SEC_EDGAR_UA).trim() : '';
  if (fromEnv) return fromEnv;
  if (cfg && cfg.userAgent) return String(cfg.userAgent);
  return "Operations Dashboard (Founder's Office) contact: ops-dashboard@example.com";
}

module.exports = {
  id: ID,
  name: 'SEC EDGAR — material filings',
  category: 'scraper',
  sensitive: false,
  ttlSeconds: 3600,
  refresh: true,
  widget: {
    type: 'timeline',
    title: 'SEC Filings — Material Events',
    question: 'trigger',
    description: 'Recent SEC EDGAR filings; flags new 8-K material events',
  },

  async fetch(ctx) {
    const cfg = loadScraperConfig(ID) || {};
    if (cfg.enabled === false) return null;

    const endpoint = cfg.endpoint || 'https://data.sec.gov/submissions/CIK0000320193.json';
    const userAgent = resolveUserAgent(cfg, ctx);

    const raw = await ctx.http(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        Host: 'data.sec.gov',
      },
      parse: 'json',
      timeoutMs: 10000,
    });

    return { company: raw && raw.name, recent: raw && raw.filings && raw.filings.recent };
  },

  normalize(raw) {
    if (!raw || !raw.recent || !Array.isArray(raw.recent.form)) {
      return this.sample();
    }

    const r = raw.recent;
    const company = raw.company || 'Issuer';
    const forms = r.form || [];
    const dates = r.filingDate || [];
    const primaryDocs = r.primaryDocDescription || [];
    const accession = r.accessionNumber || [];

    const events = [];
    const limit = Math.min(forms.length, 60);
    for (let i = 0; i < limit; i++) {
      events.push({
        date: dates[i] || '',
        title: `${forms[i]} — ${company}`,
        detail: primaryDocs[i] || accession[i] || 'Filing',
        tag: forms[i] || 'FILING',
      });
    }
    events.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const top = events.slice(0, 12);

    const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    let new8K = 0;
    for (let i = 0; i < limit; i++) {
      if (is8K(forms[i]) && String(dates[i]) >= cutoff) new8K += 1;
    }

    return {
      events: top,
      metrics: { new8K, totalRecent: limit },
    };
  },

  sample() {

    const today = new Date();
    const d = (daysAgo) =>
      new Date(today.getTime() - daysAgo * 24 * 3600 * 1000).toISOString().slice(0, 10);
    return {
      events: [
        { date: d(3), title: '8-K — Apple Inc.', detail: 'Results of Operations and Financial Condition', tag: '8-K' },
        { date: d(11), title: '8-K — Apple Inc.', detail: 'Departure/Election of Directors; Officers', tag: '8-K' },
        { date: d(19), title: '10-Q — Apple Inc.', detail: 'Quarterly Report', tag: '10-Q' },
        { date: d(28), title: '8-K — Apple Inc.', detail: 'Entry into a Material Definitive Agreement', tag: '8-K' },
        { date: d(40), title: '4 — Apple Inc.', detail: 'Statement of Changes in Beneficial Ownership', tag: '4' },
        { date: d(55), title: 'SC 13G/A — Apple Inc.', detail: 'Beneficial Ownership Amendment', tag: 'SC 13G/A' },
        { date: d(72), title: '8-K — Apple Inc.', detail: 'Regulation FD Disclosure', tag: '8-K' },
        { date: d(90), title: '10-K — Apple Inc.', detail: 'Annual Report', tag: '10-K' },
      ],
      metrics: { new8K: 4, totalRecent: 8 },
    };
  },

  trigger: {
    metric: 'new8K',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-C1',
    sopTitle: 'Material Event Memo',
    assignee: 'founder',
    slaHours: 24,
    severity: 'high',
  },
};
