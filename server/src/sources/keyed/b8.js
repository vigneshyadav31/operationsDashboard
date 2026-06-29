'use strict';

const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://api.airtable.com/v0';

function onboardingDaysOf(fields) {
  const f = fields || {};
  const explicit = Number(f['Onboarding Days'] ?? f.OnboardingDays ?? f.onboardingDays);
  if (Number.isFinite(explicit)) return explicit;
  const start = Date.parse(f['Start Date'] || f.StartDate || f.startDate || '');
  if (Number.isFinite(start)) {
    return Math.max(0, Math.round((Date.now() - start) / (1000 * 60 * 60 * 24)));
  }
  return 0;
}

module.exports = {
  id: 'B8',
  name: 'Airtable — Client Onboarding',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 3600,
  refresh: true,
  widget: {
    type: 'gauge',
    title: 'Onboarding Cycle Time',
    question: 'sla',
    description: 'Worst active client onboarding duration vs the 7-day SLA',
  },

  async fetch(ctx) {
    const pat = ctx.env.AIRTABLE_PAT;
    if (!pat) throw new MissingKeyError('AIRTABLE_PAT');
    const baseId = ctx.env.AIRTABLE_BASE;
    if (!baseId) throw new MissingKeyError('AIRTABLE_BASE');
    const url = `${BASE}/${encodeURIComponent(baseId)}/Clients?pageSize=100`;
    return ctx.http(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${pat}` },
      parse: 'json',
      timeoutMs: 10000,
    });
  },

  normalize(raw) {
    const records = (raw && Array.isArray(raw.records) ? raw.records : []);
    let worst = 0;
    const forecast = [];
    records.forEach((r, i) => {
      const days = onboardingDaysOf(r.fields);
      if (days > worst) worst = days;
      if (i < 8) forecast.push({ t: (r.fields && (r.fields.Name || r.fields.Client)) || `Client ${i + 1}`, v: days });
    });
    return {
      value: worst,
      min: 0,
      max: 21,
      unit: 'days',
      thresholds: [
        { at: 0, color: '#16a34a' },
        { at: 7, color: '#f59e0b' },
        { at: 14, color: '#dc2626' },
      ],
      forecast,
      metrics: { onboardingDays: worst },
    };
  },

  sample() {

    return this.normalize({
      records: [
        { id: 'rec1', fields: { Name: 'Globex', 'Onboarding Days': 12 } },
        { id: 'rec2', fields: { Name: 'Initech', 'Onboarding Days': 6 } },
        { id: 'rec3', fields: { Name: 'Umbrella', 'Onboarding Days': 9 } },
        { id: 'rec4', fields: { Name: 'Stark Industries', 'Onboarding Days': 3 } },
        { id: 'rec5', fields: { Name: 'Wayne Enterprises', 'Onboarding Days': 5 } },
      ],
    });
  },

  trigger: {
    metric: 'onboardingDays',
    comparator: 'gt',
    threshold: 7,
    sopId: 'SOP-B8',
    sopTitle: 'Escalate Onboarding',
    assignee: 'founder',
    slaHours: 48,
    severity: 'high',
  },
};
