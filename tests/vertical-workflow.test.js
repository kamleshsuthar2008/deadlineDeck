/**
 * DeadlineDeck - Vertical Workflow Integration Test (Phase 3)
 * Executes the strict 10-step end-to-end user journey:
 * 1. Register new student account
 * 2. Login & establish session
 * 3. Create a subject
 * 4. Create an academic task
 * 5. Read the saved task
 * 6. Update the task
 * 7. Mark it completed
 * 8. Confirm the updated value directly in MySQL
 * 9. Delete the task
 * 10. Confirm that deletion succeeded in MySQL
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../app.js');
const { query, pool } = require('../config/db.js');

let server;
let baseUrl;
let sessionCookie = '';

function makeRequest(method, path, body = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }

        // Capture set-cookie
        const setCookie = res.headers['set-cookie'];
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          setCookie,
          body: json
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('PHASE 3: Complete Vertical Workflow Integration Test', async (t) => {
  // Start server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const testEmail = `student_test_${Date.now()}@university.edu`;
  const testPassword = 'SecurePassword123!';
  let createdSubjectId = null;
  let createdTaskId = null;

  await t.test('1. Register student', async () => {
    const res = await makeRequest('POST', '/api/auth/register', {
      name: 'Aditi Sharma',
      email: testEmail,
      password: testPassword,
      default_study_hours: 4.5
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.user);
    assert.equal(res.body.user.email, testEmail);

    if (res.setCookie && res.setCookie.length > 0) {
      sessionCookie = res.setCookie[0].split(';')[0];
    }
  });

  await t.test('2. Login student & verify session cookie', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.user);

    assert.ok(res.setCookie, 'Login should issue session cookie');
    sessionCookie = res.setCookie[0].split(';')[0];
    assert.ok(sessionCookie.includes('deadlinedeck.sid'), 'Cookie should be deadlinedeck.sid');
  });

  await t.test('3. Create a subject', async () => {
    const res = await makeRequest('POST', '/api/subjects', {
      subject_name: 'Computer Networks',
      subject_code: 'CS305'
    }, sessionCookie);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    createdSubjectId = res.body.subject.subject_id;
    assert.ok(createdSubjectId > 0);
  });

  await t.test('4. Create an academic task', async () => {
    const res = await makeRequest('POST', '/api/tasks', {
      title: 'Packet Tracer Lab Practical',
      description: 'Implement subnetting and RIP routing in Cisco Packet Tracer',
      subject_id: createdSubjectId,
      task_type: 'Practical',
      due_date: '2026-11-20',
      planned_date: '2026-11-15',
      estimated_hours: 2.5,
      priority: 'High',
      status: 'Pending'
    }, sessionCookie);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    createdTaskId = res.body.task.task_id;
    assert.ok(createdTaskId > 0);
  });

  await t.test('5. Read the saved task', async () => {
    const res = await makeRequest('GET', `/api/tasks/${createdTaskId}`, null, sessionCookie);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.task.title, 'Packet Tracer Lab Practical');
    assert.equal(res.body.task.priority, 'High');
    assert.equal(res.body.task.status, 'Pending');
    assert.equal(Number(res.body.task.estimated_hours), 2.5);
  });

  await t.test('6. Update the task', async () => {
    const res = await makeRequest('PUT', `/api/tasks/${createdTaskId}`, {
      title: 'Packet Tracer Lab Practical (Revised)',
      description: 'Implement OSPF and VLSM with verification screenshots',
      subject_id: createdSubjectId,
      task_type: 'Practical',
      due_date: '2026-11-22',
      planned_date: '2026-11-16',
      estimated_hours: 3.0,
      priority: 'High',
      status: 'In Progress'
    }, sessionCookie);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  });

  await t.test('7. Mark task completed', async () => {
    const res = await makeRequest('PATCH', `/api/tasks/${createdTaskId}/status`, {
      status: 'Completed'
    }, sessionCookie);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  });

  await t.test('8. Confirm updated value in MySQL database directly', async () => {
    const rows = await query('SELECT task_id, title, status, estimated_hours FROM tasks WHERE task_id = ?', [createdTaskId]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'Completed');
    assert.equal(rows[0].title, 'Packet Tracer Lab Practical (Revised)');
    assert.equal(Number(rows[0].estimated_hours), 3.0);
  });

  await t.test('9. Delete the task', async () => {
    const res = await makeRequest('DELETE', `/api/tasks/${createdTaskId}`, null, sessionCookie);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  });

  await t.test('10. Confirm deletion succeeded in MySQL directly', async () => {
    const rows = await query('SELECT task_id FROM tasks WHERE task_id = ?', [createdTaskId]);
    assert.equal(rows.length, 0, 'Task should no longer exist in MySQL');
  });

  // Clean up
  await query('DELETE FROM users WHERE email = ?', [testEmail]);
  await new Promise(resolve => server.close(resolve));
  if (app.sessionStore && typeof app.sessionStore.close === 'function') {
    await app.sessionStore.close();
  }
  await pool.end();
});
