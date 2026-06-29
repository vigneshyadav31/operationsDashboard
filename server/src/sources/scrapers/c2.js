'use strict';

const { loadScraperConfig } = require('../../config/sources');

const ID = 'C2';

module.exports = {
  id: ID,
  name: 'HN Who-is-hiring — hiring signal',
  category: 'scraper',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'bar',
    title: 'Hiring Signal — Who is Hiring',
    question: 'trigger',
    description: 'Comment volume on recent HN "Who is hiring?" threads',
  },

  async fetch(ctx) {
    const cfg = loadScraperConfig(ID) || {};
    if (cfg.enabled === false) return null;

    const endpoint =
      cfg.endpoint ||
      'https://hn.algolia.com/api/v1/search?query=who%20is%20hiring&tags=story';
    const userAgent =
      (cfg.userAgent && String(cfg.userAgent)) ||
      "Operations Dashboard (Founder's Office) contact: ops-dashboard@example.com";

    const raw = await ctx.http(endpoint, {
      method: 'GET',
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      parse: 'json',
      timeoutMs: 10000,
    });

    return raw;
  },

  normalize(raw) {
    const hits = raw && Array.isArray(raw.hits) ? raw.hits : null;
    if (!hits) return this.sample();

    const threads = hits
      .filter((h) => /who\s+is\s+hiring/i.test(h.title || ''))
      .map((h) => ({
        title: (h.title || '').replace(/^Ask HN:\s*/i, '').trim(),
        comments: Number(h.num_comments) || 0,
        date: h.created_at ? String(h.created_at).slice(0, 10) : '',
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 6);

    if (threads.length === 0) return this.sample();

    const categories = threads.map((t) => t.date || t.title.slice(0, 10)).reverse();
    const values = threads.map((t) => t.comments).reverse();

    const clientHiring = threads.filter((t) => t.comments > 0).length;

    return {
      categories,
      series: [{ name: 'Comments (hiring posts)', values }],
      stacked: false,
      metrics: { clientHiring, latestComments: values[values.length - 1] || 0 },
    };
  },

  sample() {
    return {
      categories: ['2024-08', '2024-09', '2024-10', '2024-11', '2024-12', '2025-01'],
      series: [
        { name: 'Comments (hiring posts)', values: [612, 588, 644, 701, 559, 673] },
      ],
      stacked: false,
      metrics: { clientHiring: 6, latestComments: 673 },
    };
  },

  trigger: {
    metric: 'clientHiring',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-C2',
    sopTitle: 'Org Design Refresh',
    assignee: 'analyst',
    slaHours: 168,
    severity: 'low',
  },
};
