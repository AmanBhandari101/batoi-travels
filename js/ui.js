// Route registry shared by the screen modules; app.js drives it.
window.Batoi = {
  routes: [],
  // live = re-render when data changes (only for screens without text inputs)
  route(re, role, fn, live) { this.routes.push({ re, role, fn, live: !!live }); },
  go(hash) { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; },
  sel: null, hireSel: null, driverId: null
};

// Shared UI helpers.
window.UI = (function () {
  const A = window.BatoiAPI;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dateLabel(s, short) {
    const d = A.parseYmd(s); const diff = A.daysFrom(s);
    const base = DOW[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()];
    if (short) return base;
    return diff === 0 ? 'Today · ' + base : diff === 1 ? 'Tomorrow · ' + base : base;
  }
  const dur = (m) => (Math.floor(m / 60) ? Math.floor(m / 60) + 'h' : '') + (m % 60 ? ' ' + (m % 60) + 'm' : '');
  const pname = (id) => A.place(id).name;
  const initials = (n) => n.split(' ').map((x) => x[0]).slice(0, 2).join('');
  const t12 = (t) => { const [h, m] = t.split(':').map(Number); return ((h + 11) % 12 + 1) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };

  function toast(msg) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
  }
  // Bottom sheet. Returns { el, close }.
  function sheet(html, onMount) {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    const close = () => ov.remove();
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
    document.body.appendChild(ov);
    if (onMount) onMount(ov.querySelector('.sheet'), close);
    return { el: ov, close };
  }
  function confirmSheet(title, body, okLabel, danger) {
    return new Promise((res) => {
      sheet('<h2>' + esc(title) + '</h2><p class="muted">' + body + '</p><div class="row" style="margin-top:16px"><button class="btn ghost grow" data-close>Back</button><button class="btn grow ' + (danger ? 'accent' : '') + '" data-ok>' + esc(okLabel) + '</button></div>',
        (el, close) => { el.querySelector('[data-ok]').onclick = () => { close(); res(true); }; el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => res(false))); });
    });
  }

  // Seat map. mode 'book' (traveller) | 'driver'. selected = Set of seat ids.
  function seatMap(trip, selected, mode) {
    const v = A.data.vehicles[trip.vehicle];
    const m = A.seatMap(trip);
    const rows = v.layout.map((row) => '<div class="vrow">' + row.map((c) => {
      if (c === null) return '<span class="seat gap"></span>';
      if (c === 'D') return '<span class="seat drv" title="Driver"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M3.5 10h6M14.5 10h6M12 14.5V21"/></svg></span>';
      const st = m[c];
      let cls = 'seat', dis = false, sub = '';
      if (c === 'F1') cls += ' front';
      if (mode === 'driver') {
        if (st === 'app' || st === 'mine') { cls += ' taken'; dis = true; sub = 'online'; }
        else if (st === 'stand') { cls += ' stand'; sub = 'stand'; }
      } else {
        if (st === 'mine') { cls += ' mine'; dis = true; sub = 'yours'; }
        else if (st) { cls += ' taken'; dis = true; }
        else if (selected.has(c)) cls += ' sel';
        if (!st && c === 'F1') sub = '+₹' + A.data.FRONT_SEAT_EXTRA;
      }
      return '<button type="button" class="' + cls + '" data-seat="' + c + '"' + (dis ? ' disabled' : '') + ' aria-label="Seat ' + c + '">' + c + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
    }).join('') + '</div>').join('');
    const legend = mode === 'driver'
      ? '<div class="legend"><span><i></i>Empty · खाली</span><span><i class="taken"></i>Booked online</span><span><i class="stand"></i>Filled at stand</span></div>'
      : '<div class="legend"><span><i></i>Available</span><span><i class="sel"></i>Selected</span><span><i class="taken"></i>Booked</span><span><span class="star">★</span> Front seat</span></div>';
    return '<div class="vehicle">' + rows + '</div>' + legend;
  }

  function tripCardBody(t) {
    return '<div class="times"><span>' + t12(t.time) + '</span><span class="line"><span>' + dur(t.mins) + '</span></span><span>' + t12(t.arrive) + '</span></div>';
  }
  function driverMini(d, v) {
    return '<div class="driver-card"><div class="avatar">' + esc(initials(d.name)) + '</div><div class="grow"><b>' + esc(d.name) + '</b>' +
      (d.rating ? ' <span class="small"><span class="star">★</span> ' + d.rating + '</span>' : '') +
      '<div class="small muted">' + esc(d.operator) + ' · ' + d.trips.toLocaleString('en-IN') + ' trips · since ' + d.since + '</div>' +
      '<div style="margin-top:4px"><span class="plate">' + esc(d.vehicleNo) + '</span> <span class="small muted">' + esc(v.name) + '</span></div></div></div>';
  }
  const statusTag = (b) => ({
    confirmed: '<span class="tag good">Confirmed</span>', requested: '<span class="tag warn">Finding driver</span>',
    cancelled: '<span class="tag bad">Cancelled</span>', completed: '<span class="tag plain">Completed</span>'
  }[b.status] || '');

  const ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M14 6v12" stroke-dasharray="2 2"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r="1"/><circle cx="16.5" cy="13" r="1"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 9-7 9 7v9H3z"/><path d="M10 20v-6h4v6"/></svg>',
    swap: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>'
  };

  return { esc, money, dateLabel, dur, pname, initials, t12, toast, sheet, confirmSheet, seatMap, tripCardBody, driverMini, statusTag, ICON };
})();
