const http = require('http');
const fs = require('fs');
const path = require('path');

const CANDIDATES = [8020, 8021, 8022, 8025, 8030, 8765, 8888, 9020, 9090];
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const handler = (req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('X-Server', 'momar-mockup');
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
};

function tryPort(idx) {
  if (idx >= CANDIDATES.length) {
    console.error('No hay puerto libre en la lista de candidatos.');
    process.exit(1);
  }
  const port = CANDIDATES[idx];
  const srv = http.createServer(handler);
  srv.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      tryPort(idx + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
  srv.listen(port, () => {
    fs.writeFileSync(path.join(ROOT, '.port'), String(port));
    console.log(`MOMAR mockup en http://localhost:${port}`);
  });
}

tryPort(0);
