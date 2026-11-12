const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../config/db.js');

test('App initializes and exports Express application instance', async () => {
  const app = require('../app.js');
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.listen, 'function');

  if (app.sessionStore && typeof app.sessionStore.close === 'function') {
    await app.sessionStore.close();
  }
  await pool.end();
});
