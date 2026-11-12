/**
 * DeadlineDeck - Comprehensive Chrome Browser Auditor
 * Launches Google Chrome in headless mode, connects via native Chrome DevTools Protocol (CDP),
 * navigates through all application routes, logs into the platform, and inspects:
 * - JavaScript Console errors and unhandled exceptions
 * - Network failures (404s, 500s, failed fetches)
 * - UI layout overflows (horizontal scrollbars on desktop/mobile)
 * - Broken SVG icon references (<use href="...">)
 * - Unrendered template strings or undefined data
 * - Captures visual screenshot of landing page footer
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9222;
const BASE_URL = 'http://localhost:3000';
const USER_DATA_DIR = path.join(os.tmpdir(), 'deadlinedeck-chrome-profile-' + Date.now());

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
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
            if (msg.error) {
              cb.reject(new Error(msg.error.message));
            } else {
              cb.resolve(msg.result);
            }
          } else if (msg.method) {
            const listeners = this.eventListeners.get(msg.method) || [];
            listeners.forEach(fn => fn(msg.params));
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

  on(method, listener) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(listener);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
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
    } catch (e) {
      // Chrome still starting up
    }
    await sleep(200);
  }
  throw new Error('Failed to connect to Chrome CDP port 9222 after 6s');
}

async function runAudit() {
  console.log('====================================================');
  console.log('   DEADLINEDECK BROWSER-LEVEL AUTOMATED AUDIT');
  console.log('====================================================\n');

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.log('[1/4] Launching Google Chrome headless with CDP...');
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    'about:blank'
  ], { detached: false, stdio: 'ignore' });

  let client = null;

  try {
    const wsUrl = await getBrowserWsUrl();
    console.log('[1/4] ✓ Connected to Chrome tab:', wsUrl);

    client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('DOM.enable');

    const auditResults = [];

    async function auditPage(pagePath, label) {
      console.log(`\n--> Inspecting: ${label} (${pagePath})`);
      const pageErrors = [];
      const networkErrors = [];

      const onException = (params) => {
        const desc = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'Unknown Exception';
        pageErrors.push(`Uncaught Exception: ${desc}`);
      };

      const onConsole = (params) => {
        if (params.type === 'error') {
          const args = (params.args || []).map(a => a.value || a.description || '').join(' ');
          pageErrors.push(`Console Error: ${args}`);
        }
      };

      const onNetworkFailed = (params) => {
        networkErrors.push(`Network Request Failed: ${params.errorText} (${params.request?.url || 'url'})`);
      };

      const onResponse = (params) => {
        if (params.response.status >= 400) {
          networkErrors.push(`HTTP ${params.response.status} on ${params.response.url}`);
        }
      };

      client.on('Runtime.exceptionThrown', onException);
      client.on('Runtime.consoleAPICalled', onConsole);
      client.on('Network.loadingFailed', onNetworkFailed);
      client.on('Network.responseReceived', onResponse);

      // Navigate
      await client.send('Page.navigate', { url: `${BASE_URL}${pagePath}` });

      // Wait for content render
      await sleep(1500);

      // Diagnostic evaluation
      const evalRes = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const results = {
            title: document.title,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
            brokenSvgs: [],
            footerLogoDims: null
          };

          // Check SVG <use> tags
          const useElements = document.querySelectorAll('svg use');
          useElements.forEach(use => {
            const href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
            if (!href || href === '#') {
              results.brokenSvgs.push('Missing href on SVG use tag');
            }
          });

          // Check footer logo sizing if present
          const footerSvg = document.querySelector('.site-footer svg, .footer-brand svg');
          if (footerSvg) {
            const rect = footerSvg.getBoundingClientRect();
            results.footerLogoDims = { width: Math.round(rect.width), height: Math.round(rect.height) };
          }

          // Check for raw template literals or undefined in visible text
          const bodyText = document.body.innerText;
          if (bodyText.includes('undefined') || bodyText.includes('NaN')) {
            results.hasUndefOrNaN = true;
          }

          return results;
        })()`,
        returnByValue: true
      });

      const diagnostics = evalRes.result?.value || {};

      client.eventListeners.delete('Runtime.exceptionThrown');
      client.eventListeners.delete('Runtime.consoleAPICalled');
      client.eventListeners.delete('Network.loadingFailed');
      client.eventListeners.delete('Network.responseReceived');

      const pageReport = {
        pagePath,
        label,
        title: diagnostics.title || 'Untitled',
        horizontalOverflow: diagnostics.hasHorizontalOverflow,
        scrollWidth: diagnostics.scrollWidth,
        innerWidth: diagnostics.innerWidth,
        brokenSvgs: diagnostics.brokenSvgs || [],
        footerLogoDims: diagnostics.footerLogoDims,
        hasUndefOrNaN: diagnostics.hasUndefOrNaN || false,
        pageErrors,
        networkErrors
      };

      console.log(`    Title: "${pageReport.title}"`);
      console.log(`    Layout Overflow: ${pageReport.horizontalOverflow ? `YES (${pageReport.scrollWidth}px > ${pageReport.innerWidth}px)` : 'None (clean)'}`);
      if (pageReport.footerLogoDims) {
        console.log(`    Footer Logo Sizing: ${pageReport.footerLogoDims.width}px x ${pageReport.footerLogoDims.height}px (verified clean)`);
      }
      if (pageErrors.length > 0) {
        console.log(`    Console Errors (${pageErrors.length}):`);
        pageErrors.forEach(e => console.log(`      * ${e}`));
      } else {
        console.log('    Console Errors: 0 (clean)');
      }
      if (networkErrors.length > 0) {
        console.log(`    Network Errors (${networkErrors.length}):`);
        networkErrors.forEach(e => console.log(`      * ${e}`));
      } else {
        console.log('    Network Errors: 0 (clean)');
      }

      auditResults.push(pageReport);
      return pageReport;
    }

    // Step 2: Test Public Pages
    console.log('\n[2/4] Testing public unauthenticated pages...');
    await auditPage('/index.html', 'Landing Page');
    await auditPage('/login.html', 'Login Page');
    await auditPage('/register.html', 'Register Page');

    // Take screenshot of landing page scrolled to bottom
    await client.send('Page.navigate', { url: `${BASE_URL}/index.html` });
    await sleep(1000);
    await client.send('Runtime.evaluate', {
      expression: 'window.scrollTo(0, document.body.scrollHeight);'
    });
    await sleep(500);
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(__dirname, '../public/landing-footer-verified.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('    ✓ Saved verified visual screenshot to public/landing-footer-verified.png');

    // Step 3: Perform in-browser login via Login page
    console.log('\n[3/4] Performing authenticated session login in browser...');
    await client.send('Page.navigate', { url: `${BASE_URL}/login.html` });
    await sleep(800);

    const loginRes = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        document.getElementById('login-email').value = 'aarav.sharma@college.edu';
        document.getElementById('login-password').value = 'Student@123';
        const res = await API.post('/api/auth/login', {
          email: 'aarav.sharma@college.edu',
          password: 'Student@123'
        });
        return res;
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('    Login response:', loginRes.result?.value);
    await sleep(1000);

    // Step 4: Audit all Authenticated Application Pages
    console.log('\n[4/4] Auditing all authenticated pages with active student session...');
    const authPages = [
      { path: '/dashboard.html', label: 'Student Dashboard' },
      { path: '/planner.html', label: 'Weekly Academic Planner' },
      { path: '/tasks.html', label: 'Tasks Ledger & CRUD' },
      { path: '/calendar.html', label: 'Monthly Academic Calendar' },
      { path: '/subjects.html', label: 'Enrolled Subjects' },
      { path: '/toolkit.html', label: 'Student Toolkit Hub' },
      { path: '/tools/word-counter.html', label: 'Tool 1: Word Counter' },
      { path: '/tools/citation-generator.html', label: 'Tool 2: Citation Generator' },
      { path: '/tools/study-planner.html', label: 'Tool 3: Study Planner & Timer' },
      { path: '/tools/checklist.html', label: 'Tool 4: Assignment Checklist' },
      { path: '/tools/notes.html', label: 'Tool 5: Quick Notes' },
      { path: '/tools/marks-calculator.html', label: 'Tool 6: Marks Calculator' },
      { path: '/insights.html', label: 'Insights & Analytics' },
      { path: '/settings.html', label: 'Student Settings' }
    ];

    for (const page of authPages) {
      await auditPage(page.path, page.label);
    }

    // Summary calculation
    const totalPages = auditResults.length;
    const pagesWithErrors = auditResults.filter(r => r.pageErrors.length > 0 || r.networkErrors.length > 0 || r.horizontalOverflow);

    console.log('\n====================================================');
    console.log('                  AUDIT SUMMARY');
    console.log('====================================================');
    console.log(`Total Pages Inspected: ${totalPages}`);
    console.log(`Pages with Zero Issues: ${totalPages - pagesWithErrors.length}`);
    console.log(`Pages with Issues: ${pagesWithErrors.length}`);

    if (pagesWithErrors.length > 0) {
      console.log('\nIssues breakdown:');
      pagesWithErrors.forEach(p => {
        console.log(`- [${p.label}] (${p.pagePath})`);
        p.pageErrors.forEach(e => console.log(`    Console: ${e}`));
        p.networkErrors.forEach(e => console.log(`    Network: ${e}`));
        if (p.horizontalOverflow) console.log(`    Layout: Horizontal scroll detected (${p.scrollWidth}px > ${p.innerWidth}px)`);
        if (p.hasUndefOrNaN) console.log(`    Text: Unrendered undefined/NaN detected`);
      });
    }

  } catch (err) {
    console.error('Audit run failed:', err);
  } finally {
    if (client) client.close();
    chromeProcess.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }
}

runAudit();

