'use strict';

const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://data.usajobs.gov/api/Search';

function tally(items) {
  const counts = new Map();
  for (const it of items) {
    const md = (it && it.MatchedObjectDescriptor) || {};
    const org = md.OrganizationName || md.DepartmentName || 'Other';
    counts.set(org, (counts.get(org) || 0) + 1);
  }
  return counts;
}

module.exports = {
  id: 'B5',
  name: 'USAJOBS — Compliance (DC)',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'bar',
    title: 'Federal Compliance Postings',
    question: 'trigger',
    description: 'Open compliance roles in Washington, DC by hiring agency (capture signal)',
  },

  async fetch(ctx) {
    const key = ctx.env.USAJOBS_KEY;
    if (!key) throw new MissingKeyError('USAJOBS_KEY');
    const email = ctx.env.USAJOBS_EMAIL;
    if (!email) throw new MissingKeyError('USAJOBS_EMAIL');
    const url = `${BASE}?Keyword=compliance&LocationName=${encodeURIComponent('Washington,DC')}`;
    return ctx.http(url, {
      method: 'GET',
      headers: {
        'Authorization-Key': key,
        'User-Agent': email,
        Host: 'data.usajobs.gov',
      },
      parse: 'json',
      timeoutMs: 12000,
    });
  },

  normalize(raw) {
    const result = (raw && raw.SearchResult) || {};
    const items = Array.isArray(result.SearchResultItems) ? result.SearchResultItems : [];
    const counts = tally(items);
    const categories = Array.from(counts.keys());
    const values = categories.map((c) => counts.get(c));
    const newPostings = Number.isFinite(Number(result.SearchResultCount))
      ? Number(result.SearchResultCount)
      : items.length;
    return {
      categories,
      series: [{ name: 'Open Postings', values }],
      stacked: false,
      metrics: { newPostings },
    };
  },

  sample() {

    return this.normalize({
      SearchResult: {
        SearchResultCount: 4,
        SearchResultItems: [
          { MatchedObjectDescriptor: { OrganizationName: 'Dept. of the Treasury', PositionTitle: 'Compliance Officer' } },
          { MatchedObjectDescriptor: { OrganizationName: 'Dept. of the Treasury', PositionTitle: 'Regulatory Analyst' } },
          { MatchedObjectDescriptor: { OrganizationName: 'SEC', PositionTitle: 'Compliance Examiner' } },
          { MatchedObjectDescriptor: { OrganizationName: 'GSA', PositionTitle: 'Audit & Compliance Lead' } },
        ],
      },
    });
  },

  trigger: {
    metric: 'newPostings',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-B5',
    sopTitle: 'Capture Management',
    assignee: 'analyst',
    slaHours: 168,
    severity: 'low',
  },
};
