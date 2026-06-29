'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

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
