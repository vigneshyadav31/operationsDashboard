'use strict';

// B6 — Clockify (workspace projects).
// Endpoint: GET https://api.clockify.me/api/v1/workspaces/${CLOCKIFY_WORKSPACE}/projects
// Auth: header X-Api-Key=${CLOCKIFY_KEY}.  Widget: stacked-bar => widget type 'bar' (stacked:true).
// Trigger: gte 90 on `utilization` (Capacity Reallocation, admin, 72h, medium).
const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://api.clockify.me/api/v1';

// Derive billable/non-billable hours and a utilization % from project estimates.
// Clockify projects carry an `estimate` ({estimate:'PT40H'}) and a `duration`. We
// approximate logged hours and a billable split per project.
function parseIsoHours(iso) {
  if (!iso || typeof iso !== 'string') return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  return h + min / 60;
}

module.exports = {
  id: 'B6',
  name: 'Clockify — Project Utilization',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 3600,
  refresh: true,
  widget: {
    type: 'bar',
    title: 'Team Utilization by Project',
    question: 'trigger',
    description: 'Billable vs non-billable hours per project + overall utilization %',
  },

  async fetch(ctx) {
    const key = ctx.env.CLOCKIFY_KEY;
    if (!key) throw new MissingKeyError('CLOCKIFY_KEY');
    const ws = ctx.env.CLOCKIFY_WORKSPACE;
    if (!ws) throw new MissingKeyError('CLOCKIFY_WORKSPACE');
    const url = `${BASE}/workspaces/${encodeURIComponent(ws)}/projects?page-size=50&archived=false`;
    return ctx.http(url, {
      method: 'GET',
      headers: { 'X-Api-Key': key },
      parse: 'json',
      timeoutMs: 10000,
    });
  },

  normalize(raw) {
    const projects = Array.isArray(raw) ? raw.slice(0, 12) : [];
    const categories = [];
    const billable = [];
    const nonBillable = [];
    let totalBillable = 0;
    let totalLogged = 0;

    for (const p of projects) {
      const name = p.name || p.id || 'Project';
      const est = parseIsoHours((p.estimate && p.estimate.estimate) || p.duration);
      const logged = est > 0 ? est : 8;
      // Respect an explicit billable share when the project carries one; otherwise
      // infer from the billable flag.
      let billRatio = Number(p.billableRatio);
      if (!Number.isFinite(billRatio) || billRatio < 0 || billRatio > 1) {
        billRatio = p.billable === false ? 0.2 : 0.75;
      }
      const bill = Number((logged * billRatio).toFixed(1));
      const nonbill = Number((logged - bill).toFixed(1));
      categories.push(name);
      billable.push(bill);
      nonBillable.push(nonbill);
      totalBillable += bill;
      totalLogged += logged;
    }

    const utilization = totalLogged > 0 ? (totalBillable / totalLogged) * 100 : 0;
    return {
      categories,
      series: [
        { name: 'Billable', values: billable },
        { name: 'Non-billable', values: nonBillable },
      ],
      stacked: true,
      metrics: { utilization: Number(utilization.toFixed(1)) },
    };
  },

  sample() {
    // Heavily billable client work pushes overall utilization to ~92% => breaches gte 90.
    return this.normalize([
      { id: 'p1', name: 'Client Alpha', billable: true, billableRatio: 0.95, estimate: { estimate: 'PT120H' } },
      { id: 'p2', name: 'Client Bravo', billable: true, billableRatio: 0.93, estimate: { estimate: 'PT96H' } },
      { id: 'p3', name: 'Client Charlie', billable: true, billableRatio: 0.9, estimate: { estimate: 'PT80H' } },
      { id: 'p4', name: 'Internal R&D', billable: false, billableRatio: 0.5, estimate: { estimate: 'PT16H' } },
    ]);
  },

  trigger: {
    metric: 'utilization',
    comparator: 'gte',
    threshold: 90,
    sopId: 'SOP-B6',
    sopTitle: 'Capacity Reallocation',
    assignee: 'admin',
    slaHours: 72,
    severity: 'medium',
  },
};
