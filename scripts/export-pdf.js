/**
 * DeadlineDeck - Academic Project Report PDF Generator
 * Loads scripts/report-template.html and generates a publication-grade PDF using Headless Chrome CDP.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9228;
const USER_DATA_DIR = path.join(os.tmpdir(), 'deadlinedeck-pdf-profile-' + Date.now());
const TEMPLATE_PATH = path.join(__dirname, 'report-template.html');
const OUTPUT_PDF_PROJECT = 'C:\\deadlineDeck\\DeadlineDeck-Project-Report.pdf';
const ARTIFACT_DIR = 'C:\\Users\\Kamlesh suthar\\.gemini\\antigravity\\brain\\4ae7e2ba-58b3-4837-83c6-3c8abe8f40e3';
const OUTPUT_PDF_ARTIFACT = path.join(ARTIFACT_DIR, 'DeadlineDeck-Project-Report.pdf');

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
  return new Promise(r => setTimeout(r, ms));
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

async function main() {
  console.log('[1/4] Verifying HTML report template...');
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at: ${TEMPLATE_PATH}`);
  }

  console.log('[2/4] Launching Headless Chrome for PDF compilation...');
  const chromeArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ];

  const chromeProc = spawn(CHROME_PATH, chromeArgs, { stdio: 'ignore' });

  try {
    const wsUrl = await getBrowserWsUrl();
    const cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');

    console.log('[3/4] Navigating to local report template in Chrome...');
    const fileUrl = 'file:///' + TEMPLATE_PATH.replace(/\\/g, '/');
    await cdp.send('Page.navigate', { url: fileUrl });
    await sleep(2500); // Allow fonts and styles to fully render

    console.log('[4/4] Generating academic PDF with Page.printToPDF...');
    const pdfData = await cdp.send('Page.printToPDF', {
      printBackground: true,
      paperWidth: 8.27,  // A4 Standard Width (inches)
      paperHeight: 11.69, // A4 Standard Height (inches)
      marginTop: 0.8,
      marginBottom: 0.8,
      marginLeft: 0.8,
      marginRight: 0.8,
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size: 8pt; width: 100%; text-align: right; color: #718096; padding-right: 25px; font-family: serif;">DeadlineDeck — Academic Project Report</div>',
      footerTemplate: '<div style="font-size: 8pt; width: 100%; text-align: center; color: #718096; font-family: serif;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
    });

    const pdfBuffer = Buffer.from(pdfData.data, 'base64');
    fs.writeFileSync(OUTPUT_PDF_PROJECT, pdfBuffer);
    fs.writeFileSync(OUTPUT_PDF_ARTIFACT, pdfBuffer);

    console.log(`\n============================================================`);
    console.log(`  ACADEMIC PROJECT REPORT PDF GENERATED SUCCESSFULLY`);
    console.log(`============================================================`);
    console.log(`  Project File:  ${OUTPUT_PDF_PROJECT}`);
    console.log(`  Artifact File: ${OUTPUT_PDF_ARTIFACT}`);
    console.log(`  Total Size:    ${Math.round(pdfBuffer.length / 1024)} KB`);
    console.log(`============================================================\n`);

    cdp.close();
    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('PDF Generation failed:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

main();
