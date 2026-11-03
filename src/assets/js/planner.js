// "Plan your app" — instant recommendation. Runs entirely in the browser.
(() => {
  const form = document.getElementById('planner');
  if (!form) return;
  const $ = (id) => document.getElementById(id);

  const LABELS = {
    users: { staff: 'Staff or team', customers: 'Customers or the public', members: 'Members, players or volunteers', admins: 'Admins', me: 'Just me' },
    devices: { phone: 'Phones', tablet: 'Tablets', computer: 'Laptops and desktops' },
    features: { accounts: 'User accounts', bookings: 'Bookings or scheduling', payments: 'Payments or subscriptions', records: 'Forms and records', reports: 'Dashboards and reports', files: 'File sharing', email: 'Email reminders', integrations: 'Connect to other software', import: 'Bring in existing data' },
    extras: { install: 'Home-screen icon', offline: 'Works with poor signal', push: 'Push notifications', camera: 'Camera, photos or location', hardware: 'Bluetooth, NFC or hardware', background: 'Background location', store: 'App store listing', graphics: '3D graphics or games' },
    scale: { few: 'A handful', dozens: 'Dozens', hundreds: 'Hundreds', thousands: 'Thousands or more' },
    timing: { exploring: 'Just exploring', months: 'In the next few months', date: 'By a fixed date' },
  };

  const DRIVERS = {
    roles: 'Several types of user, each needing their own screens and permissions.',
    accounts: 'Secure sign-in, password resets and account management.',
    bookings: 'Availability rules, clashes, cancellations and confirmations.',
    payments: 'Payments through an established provider, with receipts and refunds handled properly.',
    records: 'The forms, fields and rules for the information you collect.',
    reports: 'Which figures matter and how they should be calculated and shown.',
    files: 'Secure uploads, storage and who can see each document.',
    email: 'Email templates and when each one is sent.',
    integrations: 'Each connection to other software, which depends on what that software allows.',
    import: 'Cleaning up and moving your existing data into the new app.',
    offline: 'Deciding exactly what works without signal, and how changes sync afterwards. This is careful work.',
    push: 'Notification permissions and messages, which behave differently on iPhone and Android.',
    camera: 'Permission requests and handling photos or location on different devices.',
    scale: 'Performance and hosting for a larger number of users.',
    date: 'A fixed deadline, which may mean launching with the essentials first.',
  };

  const values = (name) => [...form.querySelectorAll(`[name="${name}"]:checked`)].map((i) => i.value);

  function evaluate() {
    const d = { users: values('users'), devices: values('devices'), features: values('features'), extras: values('extras'), scale: values('scale')[0], timing: values('timing')[0] };
    const answered = d.users.length + d.devices.length + d.features.length + d.extras.length + (d.scale ? 1 : 0) + (d.timing ? 1 : 0);
    if (!answered) return { d, empty: true };

    const nativeSignals = d.extras.filter((x) => ['hardware', 'background', 'store', 'graphics'].includes(x));
    const pwaSignals = d.extras.filter((x) => ['install', 'offline', 'push'].includes(x));

    let kind, title, text;
    if (nativeSignals.length) {
      kind = 'native';
      title = 'Consider a native app, or talk it through first';
      const PHRASE = { hardware: 'Bluetooth, NFC or other hardware', background: 'background location tracking', store: 'an app store listing', graphics: 'demanding 3D graphics' };
      const why = nativeSignals.map((x) => PHRASE[x]).join(', ').replace(/, ([^,]*)$/, ' and $1');
      text = `You’ve asked for ${why}. Browsers either can’t do these consistently, especially on iPhone, or they need an app store. A native app may suit you better, though sometimes a web app can cover most of the idea while one part is handled differently. I’ll give you an honest view.`;
    } else if (pwaSignals.length) {
      kind = 'pwa';
      title = 'A web app with Progressive Web App features';
      text = 'Your app can run in the browser on every device you picked, and be installable on supported devices. ' +
        (d.extras.includes('offline') ? 'Offline use will be planned for the specific screens that need it. ' : '') +
        (d.extras.includes('push') ? 'Push notifications are possible with permission. On iPhone and iPad they need the app added to the Home Screen first. ' : '');
    } else {
      kind = 'web';
      title = 'A browser-based web app';
      text = 'Everything you’ve described works well in a modern browser. One app, opened from a web address, can serve ' +
        (d.devices.length ? d.devices.map((x) => LABELS.devices[x].toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1') : 'phones, tablets and computers') +
        ' without anything to download.';
    }

    const drivers = [];
    const roleCount = d.users.filter((u) => u !== 'me').length;
    if (roleCount >= 2) drivers.push(DRIVERS.roles);
    d.features.forEach((f) => DRIVERS[f] && drivers.push(DRIVERS[f]));
    ['offline', 'push', 'camera'].forEach((x) => d.extras.includes(x) && drivers.push(DRIVERS[x]));
    if (d.scale === 'thousands') drivers.push(DRIVERS.scale);
    if (d.timing === 'date') drivers.push(DRIVERS.date);

    const weight = roleCount + d.features.length + (d.features.includes('integrations') ? 2 : 0) + (d.features.includes('payments') ? 1 : 0) + (d.extras.includes('offline') ? 2 : 0) + (d.scale === 'thousands' ? 1 : 0);
    const size = weight <= 3 ? 'This sounds like a focused app, a good fit for a first version that can grow later.'
      : weight <= 8 ? 'This is a moderate-sized app. A first version with the essentials, followed by further stages, often works well.'
      : 'This is a substantial app. It’s worth planning it in stages so you can get the core in front of users sooner.';

    return { d, kind, title, text, drivers, size };
  }

  function summary(r) {
    const line = (k, arr) => (arr && arr.length ? `${k}: ${arr.join(', ')}` : null);
    const d = r.d;
    return [
      'My app plan (from the Plan your app tool)',
      '',
      line('Users', d.users.map((x) => LABELS.users[x])),
      line('Devices', d.devices.map((x) => LABELS.devices[x])),
      line('Features', d.features.map((x) => LABELS.features[x])),
      line('Also needs', d.extras.map((x) => LABELS.extras[x])),
      d.scale ? `Number of users: ${LABELS.scale[d.scale]}` : null,
      d.timing ? `Timing: ${LABELS.timing[d.timing]}` : null,
      `Suggested approach: ${r.title}`,
      '',
      'About the idea: ',
    ].filter((x) => x !== null).join('\n');
  }

  let current = null;
  function render() {
    const r = evaluate();
    current = r;
    const box = document.querySelector('.plan-result');
    if (r.empty) {
      box.dataset.kind = '';
      $('result-title').textContent = 'Tick a few answers to see a recommendation';
      $('result-text').textContent = 'It updates as you go.';
      $('result-scope').hidden = true;
      $('send-plan').disabled = true;
      return;
    }
    box.dataset.kind = r.kind;
    $('result-title').textContent = r.title;
    $('result-text').textContent = r.text;
    $('result-size').textContent = r.size;
    $('result-drivers').innerHTML = '';
    r.drivers.forEach((t) => { const li = document.createElement('li'); li.textContent = t; $('result-drivers').append(li); });
    $('result-scope').hidden = r.drivers.length === 0;
    $('send-plan').disabled = false;
  }

  form.addEventListener('change', render);
  $('reset-plan').addEventListener('click', () => { form.reset(); render(); form.querySelector('input').focus(); });
  $('send-plan').addEventListener('click', () => {
    if (!current || current.empty) return;
    try { sessionStorage.setItem('mbad-plan', summary(current)); } catch { /* storage unavailable */ }
    location.href = '/contact?from=planner';
  });
  render();
})();
