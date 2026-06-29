'use strict';

const { loadScraperConfig } = require('../../config/sources');

const ID = 'C4';

function fingerprint(text) {
  if (!text) return 0;
  let h = 0;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 1000000007;
  }
  return h;
}

function leadershipCue(text) {
  return /(\bCEO\b|chief executive|chairman|managing director|appointed|stepped down|resign)/i.test(
    text || ''
  )
    ? 1
    : 0;
}

module.exports = {
  id: ID,
  name: 'Wikipedia — counterparty profile',
  category: 'scraper',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'kpi-strip',
    title: 'Counterparty Profile — Infosys',
    question: 'trigger',
    description: 'Encyclopedic snapshot; flags leadership/description changes',
  },

  async fetch(ctx) {
    const cfg = loadScraperConfig(ID) || {};
    if (cfg.enabled === false) return null;

    const endpoint =
      cfg.endpoint || 'https://en.wikipedia.org/api/rest_v1/page/summary/Infosys';
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
    if (!raw || (!raw.extract && !raw.description)) return this.sample();

    const title = raw.title || 'Infosys';
    const description = raw.description || '';
    const extract = raw.extract || '';
    const fp = fingerprint(`${description}|${extract}`);
    const leadershipChange = leadershipCue(`${description} ${extract}`);

    return {
      items: [
        { label: 'Entity', value: title, unit: '', delta: 0 },
        { label: 'Descriptor', value: description || '—', unit: '', delta: 0 },
        { label: 'Summary length', value: extract.length, unit: 'chars', delta: 0 },
        { label: 'Leadership cue', value: leadershipChange ? 'present' : 'none', unit: '', delta: 0 },
      ],
      metrics: { leadershipChange, fingerprint: fp, summaryLen: extract.length },
    };
  },

  sample() {
    const description = 'Indian multinational information technology company';
    const extract =
      'Infosys Limited is an Indian multinational information technology company that provides business consulting, information technology and outsourcing services. The company was appointed a new chief executive who stepped into the role this quarter, headquartered in Bangalore.';
    return {
      items: [
        { label: 'Entity', value: 'Infosys', unit: '', delta: 0 },
        { label: 'Descriptor', value: description, unit: '', delta: 0 },
        { label: 'Summary length', value: extract.length, unit: 'chars', delta: 0 },
        { label: 'Leadership cue', value: 'present', unit: '', delta: 0 },
      ],
      metrics: { leadershipChange: 1, fingerprint: fingerprint(`${description}|${extract}`), summaryLen: extract.length },
    };
  },

  trigger: {
    metric: 'leadershipChange',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-C4',
    sopTitle: 'Re-introduction Call',
    assignee: 'founder',
    slaHours: 72,
    severity: 'medium',
  },
};
