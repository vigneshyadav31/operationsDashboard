'use strict';

const TOP_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const ITEM_URL = (id) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
const TOP_N = 20;

const WATCHLIST = ['infosys', 'reliance', 'acme', 'tata', 'wipro'];

function detectClient(title) {
  const t = String(title || '').toLowerCase();
  return WATCHLIST.some((w) => t.includes(w)) ? 1 : 0;
}

module.exports = {
  id: 'A4',
  name: 'Hacker News — front page',
  category: 'public',
  sensitive: false,
  ttlSeconds: 600,
  refresh: true,
  widget: {
    type: 'table',
    title: 'Hacker News — Front Page',
    question: 'trigger',
    description: 'Top 20 stories; watch for client/company mentions',
  },

  async fetch(ctx) {
    const ids = await ctx.http(TOP_URL, { parse: 'json', timeoutMs: 10000 });
    const topIds = Array.isArray(ids) ? ids.slice(0, TOP_N) : [];
    const items = await Promise.all(
      topIds.map((id) =>
        ctx.http(ITEM_URL(id), { parse: 'json', timeoutMs: 10000 }).catch(() => null)
      )
    );
    return { items: items.filter(Boolean) };
  },

  normalize(raw) {
    const items = (raw && raw.items) || [];
    let clientOnFrontPage = 0;
    const rows = items.map((it, idx) => {
      const flagged = detectClient(it.title);
      if (flagged) clientOnFrontPage = 1;
      return {
        rank: idx + 1,
        title: it.title || '(untitled)',
        score: Number(it.score) || 0,
        comments: Number(it.descendants) || 0,
        author: it.by || '',
        url: it.url || `https://news.ycombinator.com/item?id=${it.id}`,
        client: flagged ? 'yes' : '',
      };
    });

    return {
      columns: [
        { key: 'rank', label: '#' },
        { key: 'title', label: 'Title' },
        { key: 'score', label: 'Score' },
        { key: 'comments', label: 'Comments' },
        { key: 'author', label: 'By' },
        { key: 'client', label: 'Client?' },
      ],
      rows,
      metrics: {
        clientOnFrontPage,
        storyCount: rows.length,
        topScore: rows.length ? rows[0].score : 0,
      },
    };
  },

  sample() {

    const titles = [
      ['Show HN: A faster SQLite-backed cache', 412, 188, 'devperson'],
      ['Reliance announces new cloud platform for SMBs', 521, 264, 'newsbot'],
      ['The hidden cost of microservices', 298, 144, 'architect42'],
      ['Why we moved off Kubernetes', 376, 210, 'sredude'],
      ['Postgres is enough', 489, 322, 'dbfan'],
      ['Rust in production: two years later', 305, 176, 'oxidize'],
      ['Ask HN: How do you do on-call?', 211, 198, 'tiredeng'],
      ['A new approach to rate limiting', 187, 91, 'limiter'],
      ['The economics of open source', 254, 133, 'oss_econ'],
      ['Building a search engine from scratch', 333, 158, 'searchy'],
    ];
    const items = titles.map((t, i) => ({
      id: 4000000 + i,
      title: t[0],
      score: t[1],
      descendants: t[2],
      by: t[3],
      url: `https://example.com/story/${i}`,
    }));
    return this.normalize({ items });
  },

  trigger: {
    metric: 'clientOnFrontPage',
    comparator: 'eq',
    threshold: 1,
    sopId: 'SOP-A4',
    sopTitle: 'Inbound Press Response',
    assignee: 'founder',
    slaHours: 24,
    severity: 'high',
  },
};
