// Admin panel: overview, driver approval, routes (closures + season pricing), bookings.
(function () {
  const A = window.BatoiAPI, U = window.UI, B = window.Batoi;
  const { esc, money, dateLabel, pname, t12 } = U;
  const routeName = (r) => pname(r.a).replace(/ \(.*/, '') + ' – ' + pname(r.b).replace(/ \(.*/, '');

  function shell(root, tab, body) {
    const tabs = [['', 'Overview'], ['drivers', 'Drivers'], ['routes', 'Routes & alerts'], ['bookings', 'Bookings']];
    const s = A.stats();
    root.innerHTML = '<div class="admin-layout"><nav class="admin-nav">' + tabs.map(([k, l]) =>
      '<a href="#/admin' + (k ? '/' + k : '') + '" class="' + (k === tab ? 'on' : '') + '">' + l + (k === 'drivers' && s.driversPending ? ' <span class="tag warn">' + s.driversPending + '</span>' : '') + '</a>').join('') +
      '<button class="btn ghost sm" id="reset" style="margin-top:16px">Reset demo data</button></nav><div>' + body + '</div></div>';
    root.querySelector('#reset').onclick = async () => {
      if (await U.confirmSheet('Reset demo data?', 'Deletes all bookings, posted trips, closures and approvals made in this browser.', 'Reset', true)) { A.resetDemo(); U.toast('Demo data reset'); B.go('#/admin'); }
    };
  }

  // ---------- overview ----------
  B.route(/^\/admin$/, 'admin', (root) => {
    const s = A.stats();
    const routes = A.data.routes.map((r) => ({ r, n: s.byRoute[r.id] || 0 })).sort((a, b) => b.n - a.n);
    const max = Math.max(1, ...routes.map((x) => x.n));
    const tile = (label, value, sub) => '<div class="tile"><span>' + label + '</span><b>' + value + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>';
    shell(root, '',
      '<h1>Overview</h1><p class="small muted" style="margin:4px 0 16px">All numbers are from bookings made in this demo browser.</p>' +
      '<div class="tiles">' +
        tile('Bookings', s.live, s.cancelled + ' cancelled') +
        tile('Booking value', money(s.gmv), 'fares of live bookings') +
        tile('Batoi revenue', money(s.commission + s.fees), money(s.commission) + ' commission + ' + money(s.fees) + ' fees') +
        tile('Collected online', money(s.advances), money(s.refunds) + ' refunded') +
        tile('Open hire requests', s.requested, 'waiting for a driver') +
        tile('Drivers', s.driversApproved, s.driversPending + ' awaiting approval') +
        tile('Road closures', s.blocks, 'today and later') +
      '</div>' +
      (s.driversPending ? '<a class="banner warn" href="#/admin/drivers" style="margin-top:16px">⚠ <span><b>' + s.driversPending + ' driver' + (s.driversPending > 1 ? 's' : '') + '</b> waiting for document checks</span></a>' : '') +
      '<div class="section-title"><h2>Bookings by route</h2><span class="small muted">live bookings</span></div>' +
      '<div class="card bars">' + routes.map((x) => '<div class="bar" title="' + esc(routeName(x.r)) + ': ' + x.n + ' booking' + (x.n === 1 ? '' : 's') + '"><span>' + esc(routeName(x.r)) + '</span>' +
        '<span class="track2"><i style="width:' + (x.n / max * 100) + '%"></i></span><b>' + x.n + '</b></div>').join('') + '</div>');
  }, true);

  // ---------- drivers ----------
  let dfilter = 'all';
  B.route(/^\/admin\/drivers$/, 'admin', (root) => {
    const ds = A.drivers().filter((d) => dfilter === 'all' || d.status === dfilter)
      .sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));
    shell(root, 'drivers',
      '<h1>Drivers</h1><p class="small muted" style="margin:4px 0 12px">Approve only after checking licence, PSV badge, RC, permit, insurance and fitness.</p>' +
      '<div class="chips" style="margin-bottom:12px">' + ['all', 'pending', 'approved', 'suspended'].map((k) => '<button class="chip ' + (dfilter === k ? 'on' : '') + '" data-f="' + k + '">' + k[0].toUpperCase() + k.slice(1) + '</button>').join('') + '</div>' +
      '<div class="card table-wrap" style="padding:0"><table class="data"><thead><tr><th>Driver</th><th>Vehicle</th><th>Base</th><th class="num">Rating</th><th class="num">Trips</th><th>Status</th><th></th></tr></thead><tbody>' +
      ds.map((d) => '<tr><td><b>' + esc(d.name) + '</b><div class="tiny muted">' + esc(d.phone) + ' · ' + esc(d.operator) + '</div>' + (d.docs ? '<div class="tiny muted">Docs: ' + esc(d.docs.join(', ')) + '</div>' : '') + '</td>' +
        '<td>' + esc(A.data.vehicles[d.vehicle].short) + '<div><span class="plate">' + esc(d.vehicleNo) + '</span></div></td><td>' + esc(pname(d.base)) + '</td>' +
        '<td class="num">' + (d.rating || '—') + '</td><td class="num">' + d.trips.toLocaleString('en-IN') + '</td>' +
        '<td><span class="tag ' + ({ approved: 'good', pending: 'warn', suspended: 'bad', rejected: 'bad' }[d.status]) + '">' + esc(d.status) + '</span></td><td>' +
        (d.status === 'pending' ? '<button class="btn good sm" data-s="approved" data-id="' + d.id + '">Approve</button> <button class="btn ghost sm" data-s="rejected" data-id="' + d.id + '">Reject</button>'
          : d.status === 'approved' ? '<button class="btn ghost sm" data-s="suspended" data-id="' + d.id + '">Suspend</button>'
          : '<button class="btn soft sm" data-s="approved" data-id="' + d.id + '">Reinstate</button>') + '</td></tr>').join('') +
      '</tbody></table></div>' + (ds.length ? '' : '<p class="muted center">No drivers in this list.</p>'));
    root.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { dfilter = b.dataset.f; B.go('#/admin/drivers'); });
    root.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { A.setDriverStatus(b.dataset.id, b.dataset.s); U.toast('Driver ' + b.dataset.s); });
  }, true);

  // ---------- routes ----------
  B.route(/^\/admin\/routes$/, 'admin', (root) => {
    function draw() {
      const blocks = A.blocks().filter((b) => A.daysFrom(b.date) >= 0);
      const reasons = ['Landslide', 'Heavy rain warning', 'Snowfall', 'Road repair', 'Char Dham traffic control', 'VIP movement'];
      shell(root, 'routes',
        '<h1>Routes & alerts</h1><p class="small muted" style="margin:4px 0 16px">Close a road for a date to stop sales and alert booked travellers. Season pricing raises every fare on the route.</p>' +
        '<div class="card stack"><h2>Close a road</h2><div class="grid2" style="grid-template-columns:2fr 1fr">' +
          '<label class="field"><span>Route</span><select class="input" id="br">' + A.data.routes.map((r) => '<option value="' + r.id + '">' + esc(routeName(r)) + '</option>').join('') + '</select></label>' +
          '<label class="field"><span>Date</span><input type="date" class="input" id="bd" min="' + A.today() + '" value="' + A.today() + '"></label></div>' +
          '<label class="field"><span>Reason</span><select class="input" id="bw">' + reasons.map((r) => '<option>' + r + '</option>').join('') + '</select></label>' +
          '<button class="btn accent" id="block">Close road & alert travellers</button></div>' +
        '<div class="section-title"><h2>Active closures</h2></div>' +
        (blocks.length ? '<div class="card" style="padding:0"><table class="data"><tbody>' + blocks.map((b) => '<tr><td><b>' + esc(routeName(A.routeById(b.routeId))) + '</b></td><td>' + esc(dateLabel(b.date)) + '</td><td>' + esc(b.reason) + '</td>' +
          '<td style="text-align:right"><button class="btn soft sm" data-open="' + b.routeId + '|' + b.date + '">Reopen</button></td></tr>').join('') + '</tbody></table></div>' : '<p class="small muted">No roads closed.</p>') +
        '<div class="section-title"><h2>Routes</h2></div>' +
        '<div class="card table-wrap" style="padding:0"><table class="data"><thead><tr><th>Route</th><th class="num">km</th><th class="num">Hours</th><th class="num">Daily trips</th><th class="num">Bolero seat</th><th>Season pricing</th></tr></thead><tbody>' +
        A.data.routes.map((r) => {
          const daily = A.search(r.a, r.b, A.addDays(A.today(), 1)).trips.length + A.search(r.b, r.a, A.addDays(A.today(), 1)).trips.length;
          const sg = A.surge(r.id);
          return '<tr><td><b>' + esc(routeName(r)) + '</b><div class="tiny muted">via ' + esc(r.via.join(', ')) + '</div></td><td class="num">' + r.km + '</td><td class="num">' + (r.mins / 60).toFixed(1) + '</td><td class="num">' + daily + '</td>' +
            '<td class="num">' + money(A.suggestedPrice(r.id, 'bolero', false)) + '</td><td><select class="input" data-surge="' + r.id + '" style="width:auto;padding:6px 8px">' +
            [0, 10, 20, 30, 50].map((p) => '<option value="' + p + '"' + (p === sg ? ' selected' : '') + '>' + (p ? '+' + p + '%' : 'Normal') + '</option>').join('') + '</select></td></tr>';
        }).join('') + '</tbody></table></div>');
      const $ = (s) => root.querySelector(s);
      $('#block').onclick = () => {
        const date = $('#bd').value; if (!date) return U.toast('Pick a date');
        A.blockRoute($('#br').value, date, $('#bw').value); U.toast('Road closed. Booked travellers alerted.'); draw();
      };
      root.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => { const [r, d] = b.dataset.open.split('|'); A.unblockRoute(r, d); U.toast('Road reopened'); draw(); });
      root.querySelectorAll('[data-surge]').forEach((s) => s.onchange = () => { A.setSurge(s.dataset.surge, s.value); U.toast('Pricing updated'); draw(); });
    }
    draw();
  });

  // ---------- bookings ----------
  B.route(/^\/admin\/bookings$/, 'admin', (root) => {
    const bs = A.bookings();
    shell(root, 'bookings',
      '<h1>Bookings</h1><p class="small muted" style="margin:4px 0 12px">' + bs.length + ' booking' + (bs.length === 1 ? '' : 's') + ' made in this demo browser.</p>' +
      (bs.length ? '<div class="card table-wrap" style="padding:0"><table class="data"><thead><tr><th>Ticket</th><th>Traveller</th><th>Route</th><th>Departs</th><th>Type</th><th>Driver</th><th class="num">Fare</th><th class="num">Paid online</th><th>Status</th></tr></thead><tbody>' +
        bs.map((b) => { const d = b.driverId && A.driverById(b.driverId); return '<tr><td><b>' + esc(b.id) + '</b></td><td>' + esc(b.lead.name) + '<div class="tiny muted">' + esc(b.lead.phone) + '</div></td>' +
          '<td>' + esc(pname(b.from)) + ' → ' + esc(pname(b.to)) + '</td><td>' + esc(dateLabel(b.date, true)) + ' ' + t12(b.time) + '</td>' +
          '<td>' + (b.kind === 'seat' ? 'Seat ' + b.seats.join(', ') : 'Hire ' + esc(A.data.vehicles[b.vehicle].short) + (b.ret ? ' (return)' : '')) + '</td><td>' + (d ? esc(d.name) : '<span class="muted">—</span>') + '</td>' +
          '<td class="num">' + money(b.fare) + '</td><td class="num">' + money(b.payNow) + '</td><td>' + U.statusTag(b) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="card flat center muted">No bookings yet. Book a trip from the Travel tab.</div>'));
  }, true);
})();
