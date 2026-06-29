'use strict';

// B2 — OpenWeatherMap (current conditions, Hyderabad).
// Endpoint: GET https://api.openweathermap.org/data/2.5/weather?lat=17.385&lon=78.4867&appid=${OPENWEATHER_KEY}&units=metric
// Auth: query-string appid.  Widget: kpi-strip.
// Trigger: gt 0 on `severe` (Business Continuity, analyst, 12h, high).
const { MissingKeyError } = require('../../lib/AppError');

const BASE = 'https://api.openweathermap.org/data/2.5/weather';
const LAT = 17.385;
const LON = 78.4867;

// Weather condition group ids that warrant a business-continuity flag.
// 2xx thunderstorm, 5xx heavy rain, 6xx snow, 7xx atmosphere (fog/dust/tornado), 9xx extreme/squall.
function severeFromConditions(weatherArr, windMs) {
  let severe = 0;
  for (const w of weatherArr || []) {
    const id = Number(w.id);
    if (!Number.isFinite(id)) continue;
    if (id < 800) {
      // thunderstorm, drizzle group is 3xx (mild), rain 5xx, snow 6xx, atmosphere 7xx
      if (id >= 200 && id < 300) severe += 1; // thunderstorm
      else if (id >= 502 && id < 600) severe += 1; // heavy/violent rain
      else if (id >= 600 && id < 700) severe += 1; // snow
      else if (id >= 700 && id < 800 && id !== 701 && id !== 721) severe += 1; // fog/dust/ash/tornado
    } else if (id > 800 && id >= 900 && id < 906) {
      severe += 1; // extreme group
    }
  }
  if (Number.isFinite(windMs) && windMs >= 17) severe += 1; // gale-force winds
  return severe;
}

module.exports = {
  id: 'B2',
  name: 'OpenWeatherMap — Hyderabad',
  category: 'keyed',
  sensitive: false,
  ttlSeconds: 900,
  refresh: true,
  widget: {
    type: 'kpi-strip',
    title: 'Site Conditions — Hyderabad',
    question: 'trigger',
    description: 'Live temperature, wind, humidity + severe-weather flag for the HQ',
  },

  async fetch(ctx) {
    const key = ctx.env.OPENWEATHER_KEY;
    if (!key) throw new MissingKeyError('OPENWEATHER_KEY');
    const url = `${BASE}?lat=${LAT}&lon=${LON}&appid=${encodeURIComponent(key)}&units=metric`;
    return ctx.http(url, { method: 'GET', parse: 'json', timeoutMs: 10000 });
  },

  normalize(raw) {
    const main = (raw && raw.main) || {};
    const wind = (raw && raw.wind) || {};
    const weatherArr = (raw && raw.weather) || [];
    const condition = weatherArr[0] ? weatherArr[0].main : 'Clear';
    const temp = Number(main.temp);
    const feels = Number(main.feels_like);
    const humidity = Number(main.humidity);
    const windMs = Number(wind.speed);
    const severe = severeFromConditions(weatherArr, windMs);
    return {
      items: [
        { label: 'Temp', value: Number.isFinite(temp) ? Number(temp.toFixed(1)) : null, unit: '°C', delta: null },
        { label: 'Feels Like', value: Number.isFinite(feels) ? Number(feels.toFixed(1)) : null, unit: '°C', delta: null },
        { label: 'Humidity', value: Number.isFinite(humidity) ? humidity : null, unit: '%', delta: null },
        { label: 'Wind', value: Number.isFinite(windMs) ? Number(windMs.toFixed(1)) : null, unit: 'm/s', delta: null },
        { label: 'Condition', value: condition, unit: '', delta: null },
      ],
      metrics: { severe, tempC: Number.isFinite(temp) ? Number(temp.toFixed(1)) : 0 },
    };
  },

  sample() {
    // Severe thunderstorm + gale wind => severe>0 breaches gt 0 (business continuity).
    return this.normalize({
      weather: [{ id: 212, main: 'Thunderstorm', description: 'heavy thunderstorm' }],
      main: { temp: 34.8, feels_like: 41.2, humidity: 88, pressure: 996 },
      wind: { speed: 19.4, deg: 210, gust: 24.1 },
      name: 'Hyderabad',
    });
  },

  trigger: {
    metric: 'severe',
    comparator: 'gt',
    threshold: 0,
    sopId: 'SOP-B2',
    sopTitle: 'Business Continuity',
    assignee: 'analyst',
    slaHours: 12,
    severity: 'high',
  },
};
