'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { logger } = require('../lib/logger');

const SOURCES_DIR = path.resolve(__dirname, '..', 'sources');
const SUBDIRS = ['public', 'keyed', 'scrapers'];

let adapters = null;
let byId = null;

function listJsFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_e) {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.js') && !e.name.endsWith('.test.js'))
    .map((e) => path.join(dir, e.name))
    .sort();
}

function loadAll() {
  if (adapters) return adapters;
  const loaded = [];
  for (const sub of SUBDIRS) {
    const dir = path.join(SOURCES_DIR, sub);
    for (const file of listJsFiles(dir)) {
      try {

        const mod = require(file);
        const adapter = mod && mod.default ? mod.default : mod;
        if (adapter && typeof adapter === 'object' && adapter.id) {
          loaded.push(adapter);
        } else {
          logger.warn(`Adapter at ${file} has no id; skipping`);
        }
      } catch (err) {
        logger.error(`Failed to load adapter ${file}: ${err.message}`);
      }
    }
  }

  loaded.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  adapters = loaded;
  byId = new Map(loaded.map((a) => [String(a.id).toUpperCase(), a]));
  logger.info(`Loaded ${loaded.length} source adapter(s)`);
  return adapters;
}

function getAdapters() {
  return loadAll();
}

function getAdapter(id) {
  loadAll();
  if (!id) return undefined;
  return byId.get(String(id).toUpperCase());
}

function loadScraperConfig(id) {
  if (!id) return null;
  const file = path.join(SOURCES_DIR, 'scrapers', 'config', `${String(id).toLowerCase()}.yaml`);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return yaml.load(raw) || null;
  } catch (err) {
    logger.warn(`loadScraperConfig(${id}) failed: ${err.message}`);
    return null;
  }
}

module.exports = {
  getAdapters,
  getAdapter,
  loadScraperConfig,
  SOURCES_DIR,
};
