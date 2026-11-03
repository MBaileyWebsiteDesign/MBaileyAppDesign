// M Bailey App Design — site behaviour
(() => {
  // Mobile navigation
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.dataset.open = String(open);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.dataset.open === 'true') {
        nav.dataset.open = 'false';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Hero device demo: one app, three screen sizes
  const demo = document.querySelector('.demo');
  if (demo) {
    const buttons = [...demo.querySelectorAll('[data-set-device]')];
    const status = demo.querySelector('.demo-status');
    const labels = { phone: 'phone', tablet: 'tablet', desktop: 'desktop' };
    let timer = null;

    const set = (device, announce) => {
      demo.dataset.device = device;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setDevice === device)));
      if (announce && status) status.textContent = `Showing the app at ${labels[device]} size.`;
    };
    buttons.forEach((b) => b.addEventListener('click', () => {
      clearTimeout(timer);
      set(b.dataset.setDevice, true);
    }));

    // A single, short tour on load — skipped for reduced motion
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && window.innerWidth > 520) {
      set('phone');
      timer = setTimeout(() => {
        set('tablet');
        timer = setTimeout(() => set('desktop'), 1700);
      }, 1400);
    } else {
      set('desktop');
    }
  }

  // Contact form
  const form = document.getElementById('contact-form');
  if (form) {
    const status = document.getElementById('form-status');
    const submit = form.querySelector('button[type="submit"]');
    const show = (kind, html) => {
      status.className = `form-status ${kind}`;
      status.innerHTML = html;
      status.hidden = false;
      status.focus();
    };
    const fieldError = (input, msg) => {
      input.setAttribute('aria-invalid', 'true');
      const el = document.getElementById(`${input.id}-err`);
      if (el) el.textContent = msg;
    };
    const clearErrors = () => {
      form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
      form.querySelectorAll('.err').forEach((e) => (e.textContent = ''));
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const data = Object.fromEntries(new FormData(form));
      let bad = null;
      if (!data.name?.trim()) { fieldError(form.name, 'Enter your name.'); bad ??= form.name; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) { fieldError(form.email, 'Enter an email address like name@example.co.uk.'); bad ??= form.email; }
      if ((data.message || '').trim().length < 20) { fieldError(form.message, 'Tell me a little more about the app — at least a sentence or two.'); bad ??= form.message; }
      if (!form.consent.checked) { fieldError(form.consent, 'Tick the box so I can reply to you.'); bad ??= form.consent; }
      if (bad) { bad.focus(); return; }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) {
          form.reset();
          show('ok', '<strong>Message sent.</strong> Thanks for getting in touch. I’ll reply by email.');
        } else {
          show('bad', `<strong>Your message wasn’t sent.</strong> ${json.error || 'Something went wrong on the server.'} You can email <a href="mailto:matt@mbaileyappdesign.co.uk">matt@mbaileyappdesign.co.uk</a> instead.`);
        }
      } catch {
        show('bad', '<strong>Your message wasn’t sent.</strong> Check your connection and try again, or email <a href="mailto:matt@mbaileyappdesign.co.uk">matt@mbaileyappdesign.co.uk</a>.');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Send message';
      }
    });
  }

  // This site is itself a small PWA
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
})();
