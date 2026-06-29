'use strict';

const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;

function titleOf(page) {
  const props = (page && page.properties) || {};
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop && prop.type === 'title' && Array.isArray(prop.title)) {
      return prop.title.map((t) => t.plain_text || '').join('') || '(untitled)';
    }
  }
  return '(untitled)';
}

function statusOf(page) {
  const props = (page && page.properties) || {};
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop && prop.type === 'status' && prop.status) return prop.status.name || 'Backlog';
    if (prop && prop.type === 'select' && prop.select) return prop.select.name || 'Backlog';
  }
  return 'Backlog';
}

module.exports = {
  id: 'B7',
  name: 'Notion — SOP Library',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 3600,
  refresh: true,
  widget: {
    type: 'kanban',
    title: 'SOP Review Board',
    question: 'trigger',
    description: 'SOP pages grouped by review status; flags SOPs unreviewed for 6+ months',
  },

  async fetch(ctx) {
    const token = ctx.env.NOTION_TOKEN;
    if (!token) throw new MissingKeyError('NOTION_TOKEN');
    const dbId = ctx.env.NOTION_DB_ID;
    if (!dbId) throw new MissingKeyError('NOTION_DB_ID');
    const url = `${BASE}/databases/${encodeURIComponent(dbId)}/query`;
    return ctx.http(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 100 }),
      parse: 'json',
      timeoutMs: 12000,
    });
  },

  normalize(raw) {
    const pages = (raw && Array.isArray(raw.results) ? raw.results : []).slice(0, 100);
    const now = Date.now();
    const columnMap = new Map();
    let unreviewed6mo = 0;

    for (const page of pages) {
      const title = titleOf(page);
      const status = statusOf(page);
      const edited = Date.parse(page.last_edited_time || page.created_time || '');
      const stale = Number.isFinite(edited) ? now - edited > SIX_MONTHS_MS : false;
      if (stale) unreviewed6mo += 1;
      const meta = stale ? 'unreviewed 6mo+' : (page.last_edited_time || '').slice(0, 10);
      if (!columnMap.has(status)) columnMap.set(status, []);
      columnMap.get(status).push({ title, meta });
    }

    const columns = Array.from(columnMap.entries()).map(([name, cards]) => ({ name, cards }));
    return {
      columns,
      metrics: { unreviewed6mo, total: pages.length },
    };
  },

  sample() {
    const old = '2024-09-01T10:00:00.000Z';
    const recent = '2026-06-01T10:00:00.000Z';

    return this.normalize({
      results: [
        {
          last_edited_time: old,
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'SOP-A1 Treasury Reserve Review' }] },
            Status: { type: 'status', status: { name: 'Published' } },
          },
        },
        {
          last_edited_time: old,
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'SOP-B3 Crisis Comms' }] },
            Status: { type: 'status', status: { name: 'Published' } },
          },
        },
        {
          last_edited_time: recent,
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'SOP-B8 Escalate Onboarding' }] },
            Status: { type: 'status', status: { name: 'In Review' } },
          },
        },
        {
          last_edited_time: recent,
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'SOP-C1 Material Event Memo' }] },
            Status: { type: 'status', status: { name: 'Draft' } },
          },
        },
      ],
    });
  },

  trigger: {
    metric: 'unreviewed6mo',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-B7',
    sopTitle: 'SOP Refresh',
    assignee: 'admin',
    slaHours: 168,
    severity: 'medium',
  },
};
