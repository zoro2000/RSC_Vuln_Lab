/**
 * Vulnerable RSC lab for CVE-2025-55182
 * - React/ReactDOM/react-server-dom-webpack 19.2.0 (no hasOwnProperty check)
 * - Legit server action generateReport uses child_process.exec with string concat
 * - decodeAction is invoked directly with user-controlled form data
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// Minimal __webpack_require__/chunk loader expected by the RSC runtime
global.__webpack_require__ = require;
global.__webpack_chunk_load__ = () => Promise.resolve();

// Load vulnerable decodeAction from react-server-dom-webpack 19.2.0
const bundledPath = path.join(
  __dirname,
  'node_modules',
  'react-server-dom-webpack',
  'cjs',
  'react-server-dom-webpack-server.node.development.js'
);
const moduleCode = fs.readFileSync(bundledPath, 'utf8');
const moduleExports = {};
new Function('exports', 'require', '__dirname', '__filename', moduleCode)(
  moduleExports,
  require,
  path.dirname(bundledPath),
  bundledPath
);
const { decodeAction } = moduleExports;

// Manifest describing the legitimate business action
const actionsModuleId = path.join(__dirname, 'app', 'server-actions.js');
const serverManifest = {
  'app/server-actions': {
    id: actionsModuleId,
    name: 'generateReport',
    chunks: []
  }
};

class ServerFormData {
  constructor() { this._m = new Map(); }
  append(k, v) { this._m.set(k, v); }
  get(k) { return this._m.get(k); }
  forEach(cb) { this._m.forEach((v, k) => cb(v, k)); }
}

function parseMultipart(buffer, boundary) {
  const form = new ServerFormData();
  const parts = buffer.toString().split('--' + boundary);
  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;
    const nameMatch = part.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const valueStart = part.indexOf('\r\n\r\n');
    if (valueStart === -1) continue;
    let value = part.slice(valueStart + 4).trim();
    if (value.endsWith('--')) value = value.slice(0, -2).trim();
    form.append(nameMatch[1], value);
  }
  return form;
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/formaction') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) throw new Error('No boundary');

        const formData = parseMultipart(buffer, boundaryMatch[1]);
        const actionFn = await decodeAction(formData, serverManifest); // vulnerable call

        const result = typeof actionFn === 'function' ? await actionFn() : actionFn;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result: String(result) }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Simple landing page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<h1>RSC CVE-2025-55182 Report Lab</h1><p>POST multipart to /formaction with $ACTION_* payloads.</p>`);
});

server.listen(3002, () => {
  console.log('Vuln report server on http://localhost:3002');
  console.log('Manifest modules:', Object.keys(serverManifest));
});
