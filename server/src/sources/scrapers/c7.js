'use strict';

const { loadScraperConfig } = require('../../config/sources');

const ID = 'C7';

module.exports = {
  id: ID,
  name: 'India MCA — company master data',
  category: 'scraper',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'table',
    title: 'MCA — Counterparty Compliance Status',
    question: 'trigger',
    description: 'Company master data (CSV-sourced); flags status changes',
  },

  async fetch(_ctx) {
    const cfg = loadScraperConfig(ID) || {};

    void cfg;
    return null;
  },

  normalize(raw) {
    if (!raw || !Array.isArray(raw.rows)) return this.sample();

    const statusChange = raw.rows.filter(
      (r) => r && r.status && String(r.status).toLowerCase() !== 'active'
    ).length;

    return {
      columns: raw.columns,
      rows: raw.rows,
      note: raw.note,
      metrics: { statusChange, companies: raw.rows.length },
    };
  },

  sample() {
    const columns = [
      { key: 'cin', label: 'CIN' },
      { key: 'name', label: 'Company' },
      { key: 'status', label: 'Status' },
      { key: 'lastFiling', label: 'Last Filing' },
      { key: 'state', label: 'State' },
    ];
    const rows = [
      { cin: 'L72200KA1981PLC013115', name: 'Infosys Ltd', status: 'Active', lastFiling: '2025-09-30', state: 'Karnataka' },
      { cin: 'U72900TG2014PTC094321', name: 'Larkfield Analytics Pvt Ltd', status: 'Active', lastFiling: '2025-08-14', state: 'Telangana' },
      { cin: 'U74999MH2016PTC287654', name: 'Meadow Supply Chain Pvt Ltd', status: 'Strike Off', lastFiling: '2024-03-11', state: 'Maharashtra' },
      { cin: 'U93000DL2018PTC334210', name: 'BrightPath Services Pvt Ltd', status: 'Under Process of Striking Off', lastFiling: '2024-11-02', state: 'Delhi' },
      { cin: 'U72200KA2019PTC121009', name: 'Cobalt Logistics Pvt Ltd', status: 'Active', lastFiling: '2025-07-21', state: 'Karnataka' },
    ];
    const statusChange = rows.filter((r) => r.status.toLowerCase() !== 'active').length;
    return {
      columns,
      rows,
      note: 'Sample from MCA company master data CSV (data.gov.in). The MCA21 portal is not scraped.',
      metrics: { statusChange, companies: rows.length },
    };
  },

  trigger: {
    metric: 'statusChange',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-C7',
    sopTitle: 'KYC/Compliance Refresh',
    assignee: 'admin',
    slaHours: 168,
    severity: 'medium',
  },
};
