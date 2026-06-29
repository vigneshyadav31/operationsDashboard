'use strict';

// Loads environment variables from a local .env file (if present) and exposes a
// single typed config object. The app is designed to run with ZERO keys, so all
// provider keys are optional — adapters degrade to sample() when they're absent.

const path = require('path');
const dotenv = require('dotenv');

// .env lives at the repo root (one level above /server). Loading is idempotent
// and silently does nothing if the file is missing.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });
// Also allow a server-local .env as a convenience fallback.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

function str(name, fallback = '') {
  const v = process.env[name];
  return v === undefined || v === null ? fallback : String(v);
}

function int(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : fallback;
}

const nodeEnv = str('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

// All upstream provider keys from CONTRACTS §3. Blank by default.
const keys = {
  ALPHAVANTAGE_KEY: str('ALPHAVANTAGE_KEY'),
  OPENWEATHER_KEY: str('OPENWEATHER_KEY'),
  NEWSAPI_KEY: str('NEWSAPI_KEY'),
  FRED_KEY: str('FRED_KEY'),
  USAJOBS_KEY: str('USAJOBS_KEY'),
  USAJOBS_EMAIL: str('USAJOBS_EMAIL'),
  CLOCKIFY_KEY: str('CLOCKIFY_KEY'),
  CLOCKIFY_WORKSPACE: str('CLOCKIFY_WORKSPACE'),
  NOTION_TOKEN: str('NOTION_TOKEN'),
  NOTION_DB_ID: str('NOTION_DB_ID'),
  AIRTABLE_PAT: str('AIRTABLE_PAT'),
  AIRTABLE_BASE: str('AIRTABLE_BASE'),
  TRELLO_KEY: str('TRELLO_KEY'),
  TRELLO_TOKEN: str('TRELLO_TOKEN'),
  AQICN_TOKEN: str('AQICN_TOKEN'),
  SEC_EDGAR_UA: str('SEC_EDGAR_UA'),
};

const config = {
  port: int('PORT', 4000),
  nodeEnv,
  isProduction,
  isTest,
  sessionSecret: str('SESSION_SECRET', 'operations-dashboard-dev-secret'),
  demoPassword: str('DEMO_PASSWORD', 'demo1234'),
  refreshCron: str('REFRESH_CRON', '*/10 * * * *'),
  corsOrigin: str('CORS_ORIGIN', 'http://localhost:5173'),
  keys,
};

module.exports = { config };
