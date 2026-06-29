'use strict';

const { getAdapters } = require('../config/sources');

function getRules() {
  return getAdapters()
    .filter((a) => a && a.trigger)
    .map((a) => ({
      sourceId: a.id,
      sopId: a.trigger.sopId,
      sopTitle: a.trigger.sopTitle,
      metric: a.trigger.metric,
      comparator: a.trigger.comparator,
      threshold: a.trigger.threshold,
      assignee: a.trigger.assignee,
      slaHours: a.trigger.slaHours,
      severity: a.trigger.severity,
    }));
}

module.exports = { getRules };
