#!/usr/bin/env node
/* serve.js — servidor local sem dependências.
 * MIME de PDF e MP3 e suporte a Range (resposta 206), como pede a especificação.
 * Uso: node serve.js [porta]   (padrão 8080, ou env PORT)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = parseInt(process.argv[2] || process.env.PORT || '8080', 10);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8', '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.normalize(path.join(root, urlPath));
    if (!filePath.startsWith(root)) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Acesso negado.'); }

    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 — não achei: ' + urlPath + '\nExperimente abrir / (index.html).');
      }
      const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      const range = req.headers.range;
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (m) {
          let start = m[1] === '' ? 0 : parseInt(m[1], 10);
          let end = m[2] === '' ? stat.size - 1 : parseInt(m[2], 10);
          if (m[1] === '' && m[2] !== '') start = Math.max(0, stat.size - parseInt(m[2], 10));
          end = Math.min(end, stat.size - 1);
          if (start > end || start >= stat.size) {
            res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
            return res.end();
          }
          res.writeHead(206, {
            'Content-Type': type,
            'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Cache-Control': 'no-cache'
          });
          return fs.createReadStream(filePath, { start, end }).pipe(res);
        }
      }
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erro interno: ' + e.message);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log('Chicotes do Destino em http://localhost:' + port + '/');
});
