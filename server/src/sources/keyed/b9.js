'use strict';

const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://api.trello.com/1';

function blockedDaysOf(board) {
  const ts = Date.parse(board.dateLastActivity || '');
  if (Number.isFinite(ts)) {
    return Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24)));
  }
  return 0;
}

module.exports = {
  id: 'B9',
  name: 'Trello — Delivery Boards',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 3600,
  refresh: true,
  widget: {
    type: 'bar',
    title: 'Board Inactivity (Blocked Days)',
    question: 'trigger',
    description: 'Days since last activity per delivery board; flags stuck work',
  },

  async fetch(ctx) {
    const key = ctx.env.TRELLO_KEY;
    if (!key) throw new MissingKeyError('TRELLO_KEY');
    const token = ctx.env.TRELLO_TOKEN;
    if (!token) throw new MissingKeyError('TRELLO_TOKEN');
    const url = `${BASE}/members/me/boards?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}&fields=name,dateLastActivity,closed&filter=open`;
    return ctx.http(url, { method: 'GET', parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {
    const boards = (Array.isArray(raw) ? raw : []).filter((b) => b && !b.closed).slice(0, 12);
    const categories = [];
    const values = [];
    let maxBlocked = 0;
    for (const b of boards) {
      const d = blockedDaysOf(b);
      categories.push(b.name || b.id || 'Board');
      values.push(d);
      if (d > maxBlocked) maxBlocked = d;
    }
    return {
      categories,
      series: [{ name: 'Days Since Activity', values }],
      stacked: false,
      metrics: { blockedDays: maxBlocked },
    };
  },

  sample() {
    const now = Date.now();
    const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

    return this.normalize([
      { id: 'b1', name: 'Onboarding — Globex', dateLastActivity: daysAgo(6), closed: false },
      { id: 'b2', name: 'Delivery — Initech', dateLastActivity: daysAgo(1), closed: false },
      { id: 'b3', name: 'Support — Umbrella', dateLastActivity: daysAgo(2), closed: false },
      { id: 'b4', name: 'R&D — Stark', dateLastActivity: daysAgo(0), closed: false },
    ]);
  },

  trigger: {
    metric: 'blockedDays',
    comparator: 'gt',
    threshold: 3,
    sopId: 'SOP-B9',
    sopTitle: 'Escalate Blocked',
    assignee: 'admin',
    slaHours: 48,
    severity: 'medium',
  },
};
