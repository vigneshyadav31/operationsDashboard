'use strict';

const ENDPOINT = 'https://www.reddit.com/r/Entrepreneur/top.json?limit=25&t=day';
const USER_AGENT =
  'OperationsDashboard/1.0 (Founders Office competitive-intel; contact: ops@demo.local)';

const COMPLAINT_WORDS = [
  'scam', 'fraud', 'refund', 'broken', 'fail', 'failed', 'failing', 'lawsuit',
  'angry', 'terrible', 'worst', 'avoid', 'warning', 'banned', 'shutdown',
  'complaint', 'ripoff', 'unethical', 'problem', 'issue',
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'i', 'you', 'we', 'my', 'me', 'it',
  'this', 'that', 'how', 'what', 'why', 'do', 'does', 'did', 'can', 'will', 'at',
  'as', 'by', 'from', 'your', 'our', 'so', 'if', 'about', 'just', 'not', 'no',
  'get', 'got', 'have', 'has', 'had', 'they', 'them', 'their', 'he', 'she',
]);

const COMPLAINT_BASELINE = 3;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

module.exports = {
  id: 'A8',
  name: 'Reddit — r/Entrepreneur',
  category: 'public',
  sensitive: false,
  ttlSeconds: 1800,
  refresh: true,
  widget: {
    type: 'wordcloud',
    title: 'r/Entrepreneur — Top Today',
    question: 'trigger',
    description: 'Trending terms + complaint-spike detection',
  },

  async fetch(ctx) {
    return ctx.http(ENDPOINT, {
      parse: 'json',
      timeoutMs: 10000,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
  },

  normalize(raw) {
    const children = (raw && raw.data && Array.isArray(raw.data.children) && raw.data.children) || [];
    const posts = children.map((c) => (c && c.data) || {});

    const counts = new Map();
    let complaintCount = 0;
    const rows = [];

    for (const p of posts) {
      const title = p.title || '';
      const tokens = tokenize(title);
      for (const w of tokens) {
        counts.set(w, (counts.get(w) || 0) + 1);
        if (COMPLAINT_WORDS.includes(w)) complaintCount += 1;
      }
      rows.push({
        title,
        score: Number(p.ups || p.score) || 0,
        comments: Number(p.num_comments) || 0,
        author: p.author || '',
      });
    }

    const words = Array.from(counts.entries())
      .map(([text, weight]) => ({ text, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 60);

    const complaintSpike = complaintCount - COMPLAINT_BASELINE;

    return {
      words,
      rows: rows.sort((a, b) => b.score - a.score).slice(0, 25),
      metrics: {
        complaintSpike,
        complaintCount,
        postCount: posts.length,
      },
    };
  },

  sample() {

    const titles = [
      'My SaaS got hit with a refund scam — warning to other founders',
      'This vendor is a complete ripoff, avoid them',
      'How I scaled to $1M ARR bootstrapped',
      'Our launch failed and here is the post mortem',
      'Best CRM for a small sales team?',
      'Terrible experience with a fraud chargeback lawsuit',
      'Hiring my first employee — what to know',
      'Marketing channels that actually worked for us',
      'A broken integration cost us three big customers',
      'Pricing strategy for B2B SaaS',
      'Angry customers after a botched migration',
      'Productivity tools every founder should use',
    ];
    const children = titles.map((t, i) => ({
      data: {
        title: t,
        ups: 500 - i * 17,
        num_comments: 80 - i * 3,
        author: `founder_${i + 1}`,
      },
    }));
    return this.normalize({ data: { children } });
  },

  trigger: {
    metric: 'complaintSpike',
    comparator: 'abs_gt',
    threshold: 2,
    sopId: 'SOP-A8',
    sopTitle: 'Competitive Intelligence',
    assignee: 'analyst',
    slaHours: 48,
    severity: 'medium',
  },
};
