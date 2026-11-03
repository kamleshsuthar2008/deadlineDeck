const test = require('node:test');
const assert = require('node:assert/strict');

test('App initializes and exports Express application instance', () => {
  const app = require('../app.js');
  assert.equal(typeof app, 'function');
  assert.equal(typeof app.listen, 'function');
});
