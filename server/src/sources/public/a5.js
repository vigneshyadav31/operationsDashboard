'use strict';

const ENDPOINT = 'https://ghoapi.azureedge.net/api/NCDMORT3070';

const COUNTRIES = ['IND', 'USA', 'GBR', 'DEU', 'SGP'];
const COUNTRY_LABEL = {
  IND: 'India',
  USA: 'USA',
  GBR: 'UK',
  DEU: 'Germany',
  SGP: 'Singapore',
};

module.exports = {
  id: 'A5',
  name: 'WHO GHO — NCD mortality',
  category: 'public',
  sensitive: false,
  ttlSeconds: 86400,
  refresh: true,
  widget: {
    type: 'heatmap',
    title: 'NCD Mortality (30–70, %) by country/year',
    question: 'trigger',
    description: 'WHO GHO NCDMORT3070 — both sexes, recent years',
  },

  async fetch(ctx) {
    return ctx.http(ENDPOINT, { parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {
    const all = (raw && Array.isArray(raw.value) && raw.value) || [];

    const filtered = all.filter(
      (r) =>
        COUNTRIES.includes(r.SpatialDim) &&
        (r.Dim1 == null || r.Dim1 === 'BTSX') &&
        r.NumericValue != null
    );

    const yearsSet = new Set();

    const byCountry = {};
    for (const r of filtered) {
      const year = String(r.TimeDim);
      yearsSet.add(year);
      byCountry[r.SpatialDim] = byCountry[r.SpatialDim] || {};
      byCountry[r.SpatialDim][year] = Math.round(Number(r.NumericValue) * 10) / 10;
    }

    const yLabels = Array.from(yearsSet).sort().slice(-6);
    const presentCountries = COUNTRIES.filter((c) => byCountry[c]);
    const xLabels = presentCountries.map((c) => COUNTRY_LABEL[c] || c);

    const cells = [];
    let worsenedQoQ = 0;
    presentCountries.forEach((c, xi) => {
      yLabels.forEach((y, yi) => {
        const v = byCountry[c][y];
        if (v != null) cells.push({ x: xi, y: yi, value: v });
      });

      const yrs = Object.keys(byCountry[c]).sort();
      if (yrs.length >= 2) {
        const last = byCountry[c][yrs[yrs.length - 1]];
        const prev = byCountry[c][yrs[yrs.length - 2]];
        if (last > prev) worsenedQoQ += 1;
      }
    });

    return {
      xLabels,
      yLabels,
      cells,
      metrics: {
        worsenedQoQ,
        countriesTracked: presentCountries.length,
      },
    };
  },

  sample() {

    const baseline = {
      IND: { 2017: 22.4, 2018: 22.0, 2019: 21.7, 2020: 22.9 },
      USA: { 2017: 14.6, 2018: 14.3, 2019: 14.1, 2020: 13.9 },
      GBR: { 2017: 11.2, 2018: 11.0, 2019: 10.8, 2020: 10.6 },
      DEU: { 2017: 12.1, 2018: 12.0, 2019: 11.9, 2020: 12.3 },
      SGP: { 2017: 9.8, 2018: 9.6, 2019: 9.5, 2020: 9.3 },
    };
    const value = [];
    for (const c of Object.keys(baseline)) {
      for (const [year, v] of Object.entries(baseline[c])) {
        value.push({
          SpatialDim: c,
          TimeDim: Number(year),
          Dim1: 'BTSX',
          NumericValue: v,
        });
      }
    }
    return this.normalize({ value });
  },

  trigger: {
    metric: 'worsenedQoQ',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-A5',
    sopTitle: 'Compliance Audit',
    assignee: 'analyst',
    slaHours: 168,
    severity: 'low',
  },
};
