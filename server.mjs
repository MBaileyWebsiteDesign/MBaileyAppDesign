// M Bailey App Design — static site + contact API. No framework needed.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.PORT || 8080);
const ROOT = join(import.meta.dirname, 'public');
const CANONICAL_HOST = (process.env.CANONICAL_HOST || 'mbaileyappdesign.co.uk').toLowerCase();
const MAIL_TO = process.env.MAIL_TO || 'matt@mbaileyappdesign.co.uk';
const MAIL_FROM = process.env.MAIL_FROM || 'M Bailey App Design <website@mbaileyappdesign.co.uk>';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.svg', '.xml', '.txt']);

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
};

// Mail transport is only created when SMTP settings exist
const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const transport = smtpReady
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const isCanonical = (host = '') => {
  const h = host.toLowerCase().split(':')[0];
  return h === CANONICAL_HOST || h === `www.${CANONICAL_HOST}`;
};

const fileCache = new Map();
async function loadFile(path) {
  if (fileCache.has(path)) return fileCache.get(path);
  const s = await stat(path);
  if (!s.isFile()) throw new Error('not a file');
  const body = await readFile(path);
  const ext = extname(path);
  const entry = { body, gz: COMPRESSIBLE.has(ext) ? gzipSync(body) : null, ext };
  if (process.env.NODE_ENV === 'production') fileCache.set(path, entry);
  return entry;
}

function send(req, res, status, entry, extra = {}) {
  const headers = { 'Content-Type': TYPES[entry.ext] || 'application/octet-stream', Vary: 'Accept-Encoding', ...SECURITY_HEADERS, ...extra };
  if (!isCanonical(req.headers.host)) headers['X-Robots-Tag'] = 'noindex, nofollow';
  let body = entry.body;
  if (entry.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body = entry.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
  res.end(JSON.stringify(obj));
}

// Simple in-memory rate limit: 5 enquiries per IP per hour
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleContact(req, res) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20_000) return json(res, 413, { ok: false, error: 'Your message is too long.' });
  }
  let data;
  try { data = JSON.parse(raw); } catch { return json(res, 400, { ok: false, error: 'The form data couldn’t be read.' }); }

  if (data.website) return json(res, 200, { ok: true }); // honeypot filled: quietly drop

  const ip = (req.headers['fly-client-ip'] || req.socket.remoteAddress || '').toString();
  if (limited(ip)) return json(res, 429, { ok: false, error: 'Too many messages have been sent from your connection. Try again in an hour.' });

  const f = {
    name: clean(data.name, 120), email: clean(data.email, 200), organisation: clean(data.organisation, 160),
    type: clean(data.type, 60), message: clean(data.message, 8000), consent: data.consent === 'yes',
  };
  if (!f.name || !EMAIL_RE.test(f.email) || f.message.length < 20 || !f.consent) {
    return json(res, 422, { ok: false, error: 'Some required details are missing.' });
  }

  const text = `New enquiry from mbaileyappdesign.co.uk\n\nName: ${f.name}\nEmail: ${f.email}\nOrganisation: ${f.organisation || '-'}\nEnquirer: ${f.type || '-'}\n\n${f.message}\n`;

  if (!transport) {
    // Not configured yet: keep the enquiry in the logs (fly logs) and tell the visitor to email.
    console.log('[contact] SMTP not configured — enquiry logged:\n' + text);
    return json(res, 503, { ok: false, error: 'The contact form isn’t connected to email yet.' });
  }
  try {
    await transport.sendMail({
      from: MAIL_FROM, to: MAIL_TO, replyTo: `${f.name.replace(/[<>"]/g, '')} <${f.email}>`,
      subject: `App enquiry: ${f.name}${f.organisation ? ` (${f.organisation})` : ''}`, text,
    });
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('[contact] send failed:', err.message, '\n' + text);
    return json(res, 502, { ok: false, error: 'The email service didn’t accept the message.' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let path = decodeURIComponent(url.pathname);

    // Send www to the bare domain
    const host = (req.headers.host || '').toLowerCase();
    if (host.startsWith('www.')) {
      res.writeHead(301, { Location: `https://${host.slice(4)}${req.url}` });
      return res.end();
    }

    if (path === '/healthz') return json(res, 200, { ok: true });
    if (path === '/api/contact') {
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Use POST.' });
      return handleContact(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false });

    if (path === '/robots.txt') {
      const body = isCanonical(req.headers.host)
        ? `User-agent: *\nAllow: /\n\nSitemap: https://${CANONICAL_HOST}/sitemap.xml\n`
        : 'User-agent: *\nDisallow: /\n';
      return send(req, res, 200, { body: Buffer.from(body), gz: null, ext: '.txt' }, { 'Cache-Control': 'public, max-age=3600' });
    }

    // Clean URLs: /services -> services.html; strip trailing slash and .html
    if (path.endsWith('.html')) {
      const to = path.replace(/(index)?\.html$/, '') || '/';
      res.writeHead(301, { Location: to + url.search }); return res.end();
    }
    if (path.length > 1 && path.endsWith('/')) {
      res.writeHead(301, { Location: path.slice(0, -1) + url.search }); return res.end();
    }

    const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
    const candidates = safe === '/' ? ['index.html'] : extname(safe) ? [safe] : [`${safe}.html`];
    for (const c of candidates) {
      try {
        const entry = await loadFile(join(ROOT, c));
        const isAsset = /\.(css|js|woff2|png|svg|ico)$/.test(c) && c !== '/sw.js';
        const cache = c === '/sw.js' ? 'no-cache'
          : isAsset ? (url.searchParams.has('v') || c.startsWith('/fonts/') ? 'public, max-age=31536000, immutable' : 'public, max-age=86400')
          : 'public, max-age=300';
        return send(req, res, 200, entry, { 'Cache-Control': cache });
      } catch { /* try next */ }
    }
    const nf = await loadFile(join(ROOT, '404.html'));
    return send(req, res, 404, nf, { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) json(res, 500, { ok: false });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`M Bailey App Design listening on :${PORT} (email ${smtpReady ? 'configured' : 'NOT configured'})`);
});
