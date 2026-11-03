# M Bailey App Design

**Apps that work everywhere. Built for the web.**

Website for M Bailey App Design: https://mbaileyappdesign.co.uk
Temporary address while DNS is set up: https://mbaileyappdesign.fly.dev

## What's here

| Path | What it is |
| --- | --- |
| `src/pages/*.html` | Page content. The first line of each file is a JSON comment with title, description and path. |
| `src/assets/` | CSS, JS, images, manifest and service worker, copied as-is into the build. |
| `build.mjs` | Wraps pages in the shared layout (header, footer, SEO meta, JSON-LD) and writes `public/` plus `sitemap.xml`. |
| `server.mjs` | Small Node server: clean URLs, gzip, caching and security headers, `/api/contact`, `/healthz`, host-aware `robots.txt`. |
| `scripts/make-images.mjs` | Re-renders the app icons and `og.png` (needs Playwright locally). Outputs are committed. |

No framework, one runtime dependency (`nodemailer`).

## Run locally

```bash
npm install
npm run dev        # builds then serves http://localhost:8080
```

## Brand

| Token | Hex | Role |
| --- | --- | --- |
| Deep ink | `#0A1220` | Page background |
| Midnight navy | `#101B2B` | Raised surfaces |
| Signal teal | `#63E4E0` | Primary accent, links, buttons |
| Fresh lime | `#B7F36B` | Only for "installable / PWA" signals and focus rings |
| Mist white | `#F5F8FA` | Text |
| Slate blue | `#9DB4C8` | Secondary text |
| Border blue | `#263D53` | Rules and borders |

Type: Bricolage Grotesque (headings, condensed slightly) and Instrument Sans (body), self-hosted.
Logo: three nested screens (desktop, tablet, phone) sharing one corner. One app, every screen.

## Deploy to Fly.io

First time, from this folder:

```bash
# 1. Install flyctl and sign in
curl -L https://fly.io/install.sh | sh        # macOS: brew install flyctl
fly auth login

# 2. Create the app (uses fly.toml; London region)
fly apps create mbaileyappdesign
#   If that name is taken, pick another and update `app =` in fly.toml.

# 3. Email settings for the contact form (see "Contact form email" below)
fly secrets set SMTP_HOST=smtp.example.com SMTP_PORT=587 \
  SMTP_USER=website@mbaileyappdesign.co.uk SMTP_PASS='app-password' \
  MAIL_FROM='M Bailey App Design <website@mbaileyappdesign.co.uk>'

# 4. Deploy
fly deploy

# 5. Check it
fly status
fly logs
open https://mbaileyappdesign.fly.dev
```

### Automatic deploys from GitHub

Every push to `main` deploys via `.github/workflows/fly-deploy.yml`. One-off setup:

```bash
fly tokens create deploy -x 999999h   # copy the token it prints
gh secret set FLY_API_TOKEN --repo MBaileyWebsiteDesign/MBaileyAppDesign
```

### Switching to the real domain later

```bash
fly certs add mbaileyappdesign.co.uk
fly certs add www.mbaileyappdesign.co.uk
fly ips list                     # use these in DNS
```

At your DNS provider, add:

- `A` record for `@` pointing to the IPv4 address from `fly ips list`
- `AAAA` record for `@` pointing to the IPv6 address
- `CNAME` record for `www` pointing to `mbaileyappdesign.fly.dev`

Then run `fly certs check mbaileyappdesign.co.uk` until it shows as issued.

While the site is on `*.fly.dev`, the server sends `noindex` headers and a `Disallow: /` robots.txt, so search engines won't index the temporary address. Once requests arrive on `mbaileyappdesign.co.uk`, indexing is allowed automatically and `www` redirects to the bare domain.

## Contact form email

Enquiries go to `MAIL_TO` (`matt@mbaileyappdesign.co.uk`, set in `fly.toml`). Sending needs SMTP details set as Fly secrets (step 3 above). Any SMTP provider works, for example your mailbox host's SMTP server, or a sending service such as Postmark, Brevo or Amazon SES.

Until SMTP is configured, the form tells visitors to email directly, and every enquiry is still written to the app logs (`fly logs`), so nothing is lost.

The form has validation, a hidden honeypot field and a limit of 5 messages per IP address per hour.

## Before launch checklist

- [ ] Configure SMTP secrets and send a test enquiry
- [ ] Review the privacy notice (`src/pages/privacy.html`), especially the retention period
- [ ] Point DNS at Fly and add certificates
- [ ] Submit `https://mbaileyappdesign.co.uk/sitemap.xml` in Google Search Console
- [ ] Add real case studies when available
