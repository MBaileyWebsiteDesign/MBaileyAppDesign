// Static build: wraps src/pages/*.html in the shared layout and writes public/
import { readdir, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { join } from 'node:path';

const SITE = 'https://mbaileyappdesign.co.uk';
const NAME = 'M Bailey App Design';
const EMAIL = 'matt@mbaileyappdesign.co.uk';
const OUT = 'public';
const VERSION = Date.now().toString(36);

const nav = [
  ['/web-apps-explained', 'Web apps explained', 'explained'],
  ['/services', 'Services', 'services'],
  ['/who-its-for', 'Who it’s for', 'who'],
  ['/process', 'How it works', 'process'],
  ['/guides', 'Guides', 'guides'],
  ['/about', 'About', 'about'],
];

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE}/#business`,
  name: NAME,
  url: SITE,
  email: EMAIL,
  logo: `${SITE}/img/icon-512.png`,
  image: `${SITE}/img/og.png`,
  slogan: 'Apps that work everywhere. Built for the web.',
  description: 'Bespoke browser-based web applications and Progressive Web Apps for individuals, businesses, clubs, organisations and entrepreneurs.',
  areaServed: { '@type': 'Country', name: 'United Kingdom' },
  knowsAbout: ['Web application development', 'Progressive Web Apps', 'Responsive design', 'Database-driven applications', 'API integrations'],
  sameAs: ['https://mbaileywebsitedesign.co.uk', 'https://mbaileyphotos.co.uk'],
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function layout(meta, body) {
  const url = SITE + (meta.path === '/' ? '/' : meta.path);
  const title = meta.path === '/' ? `${NAME} | Bespoke web apps that work on every device` : `${meta.title} | ${NAME}`;
  const ld = [orgLd, ...(meta.jsonld ? [meta.jsonld] : [])];
  if (meta.faq) {
    const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const qa = [...body.matchAll(/<summary>([\s\S]*?)<\/summary><div>([\s\S]*?)<\/div><\/details>/g)];
    ld.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: qa.map(([, q, a]) => ({ '@type': 'Question', name: strip(q), acceptedAnswer: { '@type': 'Answer', text: strip(a) } })),
    });
  }
  if (meta.path !== '/') {
    ld.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: meta.title, item: url },
      ],
    });
  }
  const navHtml = nav.map(([href, label, key]) =>
    `<a href="${href}"${meta.nav === key ? ' aria-current="page"' : ''}>${label}</a>`).join('\n        ');

  const cta = meta.noCta ? '' : `
  <section class="cta-band" aria-labelledby="cta-title">
    <div class="wrap">
      <div>
        <h2 id="cta-title">Got an idea for an app?</h2>
        <p>Tell me what it needs to do and who will use it. I’ll tell you honestly whether a web app is the right fit.</p>
      </div>
      <div class="actions"><a class="btn btn-primary" href="/contact">Start a conversation</a></div>
    </div>
  </section>`;

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(meta.description)}">
  ${meta.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
  <meta name="theme-color" content="#0A1220">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${NAME}">
  <meta property="og:title" content="${esc(meta.ogTitle || title)}">
  <meta property="og:description" content="${esc(meta.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/img/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_GB">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="preload" href="/fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/instrument.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/site.css?v=${VERSION}">
  <script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld)}</script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/" aria-label="${NAME} home">
        <img src="/img/logo-mark.svg" alt="" width="34" height="34">
        <span class="brand-name">M Bailey <span>App Design</span></span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav id="site-nav" class="nav" aria-label="Main">
        ${navHtml}
        <a class="btn btn-ghost nav-plan" href="/plan-your-app"${meta.nav === 'plan' ? ' aria-current="page"' : ''}>Plan your app</a>
        <a class="btn btn-primary" href="/contact"${meta.nav === 'contact' ? ' aria-current="page"' : ''}>Start a project</a>
      </nav>
    </div>
  </header>
  <main id="main">
${body}
  </main>${cta}
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a class="brand" href="/"><img src="/img/logo-mark.svg" alt="" width="30" height="30"><span class="brand-name">M Bailey <span>App Design</span></span></a>
          <p style="margin-top:1rem">Apps that work everywhere. Built for the web.</p>
          <p><a href="mailto:${EMAIL}">${EMAIL}</a></p>
        </div>
        <div>
          <h2>Web apps</h2>
          <ul>
            <li><a href="/web-apps-explained">Web apps explained</a></li>
            <li><a href="/web-apps-explained#pwa">Progressive Web Apps</a></li>
            <li><a href="/web-apps-explained#native">When native is better</a></li>
            <li><a href="/web-app-cost">What a web app costs</a></li>
            <li><a href="/plan-your-app">Plan your app</a></li>
          </ul>
        </div>
        <div>
          <h2>Studio</h2>
          <ul>
            <li><a href="/services">Services</a></li>
            <li><a href="/who-its-for">Who it’s for</a></li>
            <li><a href="/process">How it works</a></li>
            <li><a href="/security">Security and data</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/faq">FAQ</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>
        <div>
          <h2>Sister studios</h2>
          <ul>
            <li><a href="https://mbaileywebsitedesign.co.uk" rel="noopener">M Bailey Website Design</a></li>
            <li><a href="https://mbaileyphotos.co.uk" rel="noopener">M Bailey Photos</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-base">
        <span>&copy; ${new Date().getFullYear()} ${NAME}</span>
        <span><a href="/privacy" style="color:inherit">Privacy notice</a> &nbsp; <a href="/accessibility" style="color:inherit">Accessibility</a></span>
      </div>
    </div>
  </footer>
  <script src="/js/site.js?v=${VERSION}" defer></script>${(meta.scripts || []).map((src) => `\n  <script src="${src}?v=${VERSION}" defer></script>`).join('')}
</body>
</html>
`;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'fonts'), { recursive: true });
await cp('src/assets', OUT, { recursive: true });
await cp('node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2', join(OUT, 'fonts/bricolage.woff2'));
await cp('node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2', join(OUT, 'fonts/instrument.woff2'));

const pages = [];
for (const f of (await readdir('src/pages')).filter((f) => f.endsWith('.html'))) {
  const raw = await readFile(join('src/pages', f), 'utf8');
  const m = raw.match(/^<!--([\s\S]*?)-->\n/);
  if (!m) throw new Error(`Missing meta header in ${f}`);
  const meta = JSON.parse(m[1]);
  const html = layout(meta, raw.slice(m[0].length));
  const outName = meta.path === '/' ? 'index.html' : `${meta.path.slice(1)}.html`;
  await writeFile(join(OUT, outName), html);
  if (!meta.noindex) pages.push(meta);
}

const today = new Date().toISOString().slice(0, 10);
await writeFile(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p.path === '/' ? '/' : p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);

// Service worker gets a fresh cache name on every build
const sw = await readFile(join(OUT, 'sw.js'), 'utf8');
await writeFile(join(OUT, 'sw.js'), sw.replace('__VERSION__', VERSION));

console.log(`Built ${pages.length} pages to ${OUT}/ (v${VERSION})`);
