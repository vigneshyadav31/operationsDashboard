'use strict';

// B10 — AQICN / WAQI (Hyderabad air quality feed).
// Endpoint: GET https://api.waqi.info/feed/hyderabad/?token=${AQICN_TOKEN}
// Auth: query-string token.  Widget: heatmap.
// Trigger: gt 150 on `aqi` (WFH Advisory, analyst, 12h, high).
const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://api.waqi.info/feed/hyderabad';

// Build a pollutant x time-of-day heatmap from the feed. WAQI gives a current AQI
// plus per-pollutant indices (iaqi) and a forecast (data.forecast.daily). We lay
// pollutants on the Y axis and forecast days (or hours) on the X axis.
function buildHeatmap(data) {
  const iaqi = (data && data.iaqi) || {};
  const pollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];
  const yLabels = [];
  const present = [];
  for (const p of pollutants) {
    if (iaqi[p] && Number.isFinite(Number(iaqi[p].v))) {
      yLabels.push(p.toUpperCase());
      present.push(p);
    }
  }
  // X axis: forecast days if available, else a single "now" column.
  const forecast = (data && data.forecast && data.forecast.daily && data.forecast.daily.pm25) || [];
  const xLabels = forecast.length
    ? forecast.slice(0, 7).map((d) => String(d.day || '').slice(5))
    : ['now'];

  const cells = [];
  present.forEach((p, yi) => {
    const baseVal = Number(iaqi[p].v);
    xLabels.forEach((_x, xi) => {
      // Use the forecast avg for pm25 when present, else scale the current value.
      let v = baseVal;
      if (p === 'pm25' && forecast[xi] && Number.isFinite(Number(forecast[xi].avg))) {
        v = Number(forecast[xi].avg);
      } else if (forecast.length) {
        v = Number((baseVal * (0.85 + (xi % 3) * 0.1)).toFixed(0));
      }
      cells.push({ x: xi, y: yi, value: v });
    });
  });

  return { xLabels, yLabels, cells };
}

module.exports = {
  id: 'B10',
  name: 'AQICN — Hyderabad Air Quality',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 1800,
  refresh: true,
  widget: {
    type: 'heatmap',
    title: 'Air Quality — Hyderabad',
    question: 'trigger',
    description: 'Per-pollutant AQI heatmap with WFH advisory trigger above AQI 150',
  },

  async fetch(ctx) {
    const token = ctx.env.AQICN_TOKEN;
    if (!token) throw new MissingKeyError('AQICN_TOKEN');
    const url = `${BASE}/?token=${encodeURIComponent(token)}`;
    return ctx.http(url, { method: 'GET', parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {
    const data = (raw && raw.data) || {};
    const aqi = Number(data.aqi);
    const heat = buildHeatmap(data);
    return {
      xLabels: heat.xLabels,
      yLabels: heat.yLabels,
      cells: heat.cells,
      metrics: { aqi: Number.isFinite(aqi) ? aqi : 0 },
    };
  },

  sample() {
    // Current AQI 178 (>150) breaches gt 150 (WFH advisory).
    return this.normalize({
      status: 'ok',
      data: {
        aqi: 178,
        idx: 1234,
        city: { name: 'Hyderabad, India' },
        iaqi: {
          pm25: { v: 178 },
          pm10: { v: 96 },
          o3: { v: 41 },
          no2: { v: 33 },
          so2: { v: 12 },
          co: { v: 8 },
        },
        forecast: {
          daily: {
            pm25: [
              { day: '2026-06-29', avg: 178, min: 120, max: 210 },
              { day: '2026-06-30', avg: 165, min: 110, max: 195 },
              { day: '2026-07-01', avg: 150, min: 100, max: 180 },
              { day: '2026-07-02', avg: 140, min: 95, max: 170 },
            ],
          },
        },
      },
    });
  },

  trigger: {
    metric: 'aqi',
    comparator: 'gt',
    threshold: 150,
    sopId: 'SOP-B10',
    sopTitle: 'WFH Advisory',
    assignee: 'analyst',
    slaHours: 12,
    severity: 'high',
  },
};
