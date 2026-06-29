'use strict';

const { loadScraperConfig } = require('../../config/sources');

const ID = 'C3';

function midSalary(job) {
  const min = Number(job.salary_min) || 0;
  const max = Number(job.salary_max) || 0;
  if (min && max) return Math.round((min + max) / 2);
  return min || max || 0;
}

module.exports = {
  id: ID,
  name: 'RemoteOK — remote comp benchmark',
  category: 'scraper',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'bubble',
    title: 'Remote Compensation Benchmark',
    question: 'refresh',
    description: 'Remote roles by salary and posting frequency (quarterly)',
  },

  async fetch(ctx) {
    const cfg = loadScraperConfig(ID) || {};
    if (cfg.enabled === false) return null;

    const endpoint = cfg.endpoint || 'https://remoteok.com/api';
    const userAgent =
      (cfg.userAgent && String(cfg.userAgent)) ||
      "Operations Dashboard (Founder's Office) contact: ops-dashboard@example.com";

    const raw = await ctx.http(endpoint, {
      method: 'GET',
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      parse: 'json',
      timeoutMs: 10000,
    });

    const list = Array.isArray(raw) ? raw.slice(1) : null;
    return list;
  },

  normalize(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return this.sample();

    const withSalary = raw
      .filter((j) => j && (j.salary_min || j.salary_max))
      .slice(0, 40);

    if (withSalary.length === 0) return this.sample();

    const points = withSalary.map((job, i) => {
      const primaryTag = Array.isArray(job.tags) && job.tags.length ? job.tags[0] : (job.position || 'role');
      return {
        x: i + 1,
        y: midSalary(job),
        r: Math.min(40, 8 + (Array.isArray(job.tags) ? job.tags.length : 1) * 2),
        label: `${(job.company || 'Co').toString().slice(0, 24)} · ${String(primaryTag).slice(0, 18)}`,
      };
    });

    const salaries = points.map((p) => p.y).filter(Boolean);
    const avgSalary = salaries.length
      ? Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length)
      : 0;

    return {
      points,
      xLabel: 'Posting recency (newest → older)',
      yLabel: 'Midpoint annual salary (USD)',
      metrics: { roleCount: points.length, avgSalary },
    };
  },

  sample() {
    const points = [
      { x: 1, y: 165000, r: 24, label: 'NimbusAI · senior-eng' },
      { x: 2, y: 142000, r: 18, label: 'Larkfield · backend' },
      { x: 3, y: 188000, r: 30, label: 'Orbital · staff-eng' },
      { x: 4, y: 119000, r: 14, label: 'BrightPath · support' },
      { x: 5, y: 154000, r: 22, label: 'Cobalt · devops' },
      { x: 6, y: 132000, r: 16, label: 'Meadow · product' },
      { x: 7, y: 201000, r: 34, label: 'Helix · ml-eng' },
      { x: 8, y: 98000, r: 12, label: 'Quill · content' },
      { x: 9, y: 176000, r: 26, label: 'Vantage · security' },
      { x: 10, y: 145000, r: 20, label: 'Driftwood · frontend' },
    ];
    const avgSalary = Math.round(points.reduce((s, p) => s + p.y, 0) / points.length);
    return {
      points,
      xLabel: 'Posting recency (newest → older)',
      yLabel: 'Midpoint annual salary (USD)',
      metrics: { roleCount: points.length, avgSalary },
    };
  },

};
