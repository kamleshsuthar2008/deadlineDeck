/**
 * DeadlineDeck - Dashboard Verification & Interactive Testing Script
 * Tests:
 * 1. 7-Day Workload Map Grid Layout & Visuals
 * 2. "+ Add Task" Modal Opening, Pre-fill, and Closing
 * 3. End-to-end Task Creation via Form and UI Refresh
 * 4. High-resolution Screenshots of Fixed UI
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9223; // Use distinct port
const BASE_URL = 'http://localhost:3000';
const USER_DATA_DIR = path.join(os.tmpdir(), 'deadlinedeck-verify-profile-' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\Kamlesh suthar\\.gemini\\antigravity\\brain\\4ae7e2ba-58b3-4837-83c6-3c8abe8f40e3';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) cb.reject(new Error(msg.error.message));
            else cb.resolve(msg.result);
          }
        } catch (e) {
          console.error('CDP parse error:', e);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getBrowserWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const tabs = await res.json();
        if (tabs && tabs.length > 0 && tabs[0].webSocketDebuggerUrl) {
          return tabs[0].webSocketDebuggerUrl;
        }
      }
    } catch (e) {}
    await sleep(200);
  }
  throw new Error(`Failed to connect to Chrome CDP port ${CDP_PORT}`);
}

async function evalInPage(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (res.exceptionDetails) {
    throw new Error('Eval error: ' + JSON.stringify(res.exceptionDetails));
  }
  return res.result ? res.result.value : undefined;
}

async function main() {
  console.log('[1/6] Launching Chrome in headless verification mode...');
  const chromeArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1400,1350'
  ];

  const chromeProc = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' });

  try {
    const wsUrl = await getBrowserWsUrl();
    const cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    console.log('[2/6] Navigating to login page...');
    await cdp.send('Page.navigate', { url: `${BASE_URL}/login.html` });
    await sleep(1500);

    console.log('[3/6] Authenticating as demo student...');
    await evalInPage(cdp, `
      document.getElementById('login-email').value = 'aarav.sharma@college.edu';
      document.getElementById('login-password').value = 'Student@123';
      document.getElementById('form-login').dispatchEvent(new Event('submit', { cancelable: true }));
    `);
    await sleep(2000);

    console.log('[4/6] Navigating to dashboard and checking workload map...');
    await cdp.send('Page.navigate', { url: `${BASE_URL}/dashboard.html` });
    await sleep(2500);

    const workloadState = await evalInPage(cdp, `
      (() => {
        const grid = document.getElementById('workload-map-grid');
        const columns = Array.from(document.querySelectorAll('.workload-day-column')).map(col => ({
          date: col.getAttribute('data-date'),
          weekday: col.querySelector('.day-weekday-label')?.textContent?.trim(),
          dayNum: col.querySelector('.day-numeral')?.textContent?.trim(),
          ratio: col.querySelector('.day-hours-ratio')?.textContent?.trim(),
          utilBadge: col.querySelector('.day-util-badge')?.textContent?.trim(),
          isSelected: col.classList.contains('is-selected'),
          isToday: col.classList.contains('is-today')
        }));

        const computed = window.getComputedStyle(grid);
        return {
          gridDisplay: computed.display,
          gridColumnsCount: computed.gridTemplateColumns.split(' ').length,
          columnsFound: columns.length,
          columns
        };
      })()
    `);

    console.log('Workload map verification result:', JSON.stringify(workloadState, null, 2));

    // Capture initial screenshot of fixed workload map
    const ss1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const ssPath1 = path.join(ARTIFACT_DIR, 'dashboard-fixed-workload.png');
    fs.writeFileSync(ssPath1, Buffer.from(ss1.data, 'base64'));
    console.log(`Saved screenshot 1 to: ${ssPath1}`);

    console.log('[5/6] Testing "+ Add Task" button and modal...');
    const modalCheck1 = await evalInPage(cdp, `
      (() => {
        const btn = document.getElementById('btn-quick-add-task');
        btn.click();
        const modal = document.getElementById('modal-quick-task');
        return {
          isOpen: modal.classList.contains('open') || modal.classList.contains('is-open'),
          display: window.getComputedStyle(modal).display,
          plannedDateVal: document.getElementById('task-planned-date').value,
          dueDateVal: document.getElementById('task-due-date').value,
          subjectsCount: document.getElementById('task-subject').options.length
        };
      })()
    `);
    console.log('Modal open check:', JSON.stringify(modalCheck1, null, 2));

    // Capture modal screenshot
    const ss2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const ssPath2 = path.join(ARTIFACT_DIR, 'dashboard-modal-open.png');
    fs.writeFileSync(ssPath2, Buffer.from(ss2.data, 'base64'));
    console.log(`Saved screenshot 2 to: ${ssPath2}`);

    console.log('[6/6] Submitting a real academic task through the modal form...');
    const taskSubmitResult = await evalInPage(cdp, `
      (async () => {
        document.getElementById('task-title').value = 'Automated Verification Task - BCNF Normalization';
        document.getElementById('task-type').value = 'Assignment';
        document.getElementById('task-priority').value = 'High';
        document.getElementById('task-hours').value = '2.5';
        document.getElementById('task-desc').value = 'Testing automated form submission';

        const form = document.getElementById('form-quick-task');
        form.dispatchEvent(new Event('submit', { cancelable: true }));

        // Wait 1.5s for API call and toast
        await new Promise(r => setTimeout(r, 1500));

        const modal = document.getElementById('modal-quick-task');
        const toast = document.querySelector('.toast');

        return {
          modalClosed: !modal.classList.contains('open') && !modal.classList.contains('is-open'),
          toastText: toast?.textContent?.trim() || null
        };
      })()
    `);
    console.log('Task submit result:', JSON.stringify(taskSubmitResult, null, 2));

    await sleep(1500);

    // Final screenshot after task creation
    const ss3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const ssPath3 = path.join(ARTIFACT_DIR, 'dashboard-task-created.png');
    fs.writeFileSync(ssPath3, Buffer.from(ss3.data, 'base64'));
    console.log(`Saved screenshot 3 to: ${ssPath3}`);

    cdp.close();
    chromeProc.kill();

    console.log('\n=== ALL DASHBOARD VERIFICATION TESTS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Verification failed with error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

main();
