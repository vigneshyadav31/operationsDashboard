'use strict';

const ENDPOINT =
  'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=17.385&longitude=78.4867&hourly=pm2_5,pm10,ozone,us_aqi';

module.exports = {
  id: 'A6',
  name: 'Open-Meteo — air quality',
  category: 'public',
  sensitive: false,
  ttlSeconds: 1800,
  refresh: true,
  widget: {
    type: 'gauge',
    title: 'Air Quality — Hyderabad HQ (US AQI)',
    question: 'trigger',
    description: 'Current US AQI with 12h forecast',
  },

  async fetch(ctx) {
    return ctx.http(ENDPOINT, { parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {
    const hourly = (raw && raw.hourly) || {};
    const times = hourly.time || [];
    const aqiArr = hourly.us_aqi || [];

    const now = Date.now();
    let idx = aqiArr.length - 1;
    let best = Infinity;
    for (let i = 0; i < times.length; i++) {
      const dt = Date.parse(times[i]);
      if (Number.isFinite(dt)) {
        const diff = Math.abs(dt - now);
        if (diff < best && aqiArr[i] != null) {
          best = diff;
          idx = i;
        }
      }
    }

    const value = Math.round(Number(aqiArr[idx]) || 0);

    const forecast = [];
    for (let i = idx + 1; i < Math.min(idx + 13, aqiArr.length); i++) {
      if (aqiArr[i] != null) {
        forecast.push({ t: times[i] || `+${i - idx}h`, v: Math.round(aqiArr[i]) });
      }
    }

    return {
      value,
      min: 0,
      max: 500,
      unit: 'AQI',
      thresholds: [
        { at: 50, color: '#2ecc71' },
        { at: 100, color: '#f1c40f' },
        { at: 150, color: '#e67e22' },
        { at: 200, color: '#e74c3c' },
        { at: 300, color: '#8e44ad' },
        { at: 500, color: '#7e0023' },
      ],
      forecast,
      metrics: {
        aqi: value,
        pm25: Math.round(Number((hourly.pm2_5 || [])[idx]) || 0),
        pm10: Math.round(Number((hourly.pm10 || [])[idx]) || 0),
        ozone: Math.round(Number((hourly.ozone || [])[idx]) || 0),
      },
    };
  },

  sample() {

    const times = [];
    const us_aqi = [];
    const pm2_5 = [];
    const pm10 = [];
    const ozone = [];
    const start = new Date();
    start.setMinutes(0, 0, 0);
    for (let i = 0; i < 24; i++) {
      const t = new Date(start.getTime() + i * 3600 * 1000);
      times.push(t.toISOString().slice(0, 16));
      const aqi = 247 + Math.round(Math.sin(i / 3) * 18);
      us_aqi.push(aqi);
      pm2_5.push(Math.round(aqi * 0.7));
      pm10.push(Math.round(aqi * 0.9));
      ozone.push(Math.round(60 + Math.cos(i / 4) * 12));
    }
    return this.normalize({ hourly: { time: times, us_aqi, pm2_5, pm10, ozone } });
  },

  trigger: {
    metric: 'aqi',
    comparator: 'gt',
    threshold: 200,
    sopId: 'SOP-A6',
    sopTitle: 'WFH Advisory',
    assignee: 'analyst',
    slaHours: 12,
    severity: 'high',
  },
};
