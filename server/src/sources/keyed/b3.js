'use strict';

const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://newsapi.org/v2/top-headlines';

const NEGATIVE_WORDS = [
  'lawsuit', 'sue', 'sued', 'fraud', 'recall', 'breach', 'hack', 'layoff', 'layoffs',
  'fired', 'scandal', 'probe', 'investigation', 'fine', 'fined', 'plunge', 'plunges',
  'crash', 'crisis', 'bankrupt', 'bankruptcy', 'default', 'collapse', 'slump', 'fall',
  'falls', 'downgrade', 'warning', 'warns', 'loss', 'losses', 'cut', 'cuts',
];

function isNegative(title) {
  const t = String(title || '').toLowerCase();
  return NEGATIVE_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(t));
}

module.exports = {
  id: 'B3',
  name: 'NewsAPI — US Business Headlines',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 1800,
  refresh: true,
  widget: {
    type: 'table',
    title: 'Business Headlines',
    question: 'trigger',
    description: 'Top US business headlines with negative-mention scan for crisis comms',
  },

  async fetch(ctx) {
    const key = ctx.env.NEWSAPI_KEY;
    if (!key) throw new MissingKeyError('NEWSAPI_KEY');
    const url = `${BASE}?country=us&category=business`;
    return ctx.http(url, {
      method: 'GET',
      headers: { 'X-Api-Key': key },
      parse: 'json',
      timeoutMs: 10000,
    });
  },

  normalize(raw) {
    const articles = (raw && Array.isArray(raw.articles) ? raw.articles : []).slice(0, 20);
    let negativeMentions = 0;
    const rows = articles.map((a) => {
      const title = a.title || '(untitled)';
      const neg = isNegative(title);
      if (neg) negativeMentions += 1;
      return {
        source: (a.source && a.source.name) || 'unknown',
        title,
        sentiment: neg ? 'negative' : 'neutral',
        publishedAt: a.publishedAt || '',
      };
    });
    return {
      columns: [
        { key: 'source', label: 'Source' },
        { key: 'title', label: 'Headline' },
        { key: 'sentiment', label: 'Sentiment' },
        { key: 'publishedAt', label: 'Published' },
      ],
      rows,
      metrics: { negativeMentions, total: rows.length },
    };
  },

  sample() {

    return this.normalize({
      status: 'ok',
      totalResults: 5,
      articles: [
        { source: { name: 'Reuters' }, title: 'Acme Corp shares plunge after surprise profit warning', publishedAt: '2026-06-29T08:10:00Z' },
        { source: { name: 'Bloomberg' }, title: 'Regulator opens fraud probe into fintech lender', publishedAt: '2026-06-29T07:42:00Z' },
        { source: { name: 'CNBC' }, title: 'Markets steady as investors await jobs data', publishedAt: '2026-06-29T07:05:00Z' },
        { source: { name: 'WSJ' }, title: 'Retail sales beat expectations in June', publishedAt: '2026-06-29T06:30:00Z' },
        { source: { name: 'AP' }, title: 'Tech giant unveils new data center investment', publishedAt: '2026-06-29T05:55:00Z' },
      ],
    });
  },

  trigger: {
    metric: 'negativeMentions',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-B3',
    sopTitle: 'Crisis Comms',
    assignee: 'founder',
    slaHours: 24,
    severity: 'high',
  },
};
