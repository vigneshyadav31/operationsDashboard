'use strict';

const { AppError } = require('../lib/AppError');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join('.') || source}: ${i.message}`)
          .join('; ');
        return next(new AppError(400, `Validation failed: ${issues}`, 'VALIDATION_ERROR'));
      }
      req[source] = result.data;
      next();
    } catch (err) {
      next(new AppError(400, `Validation error: ${err.message}`, 'VALIDATION_ERROR'));
    }
  };
}

module.exports = { validate };
