// Driver app: login, today's trips, seat filling at the stand, OTP boarding, hire requests, post trip, sign-up.
(function () {
  const A = window.BatoiAPI, U = window.UI, B = window.Batoi;
  const { esc, money, dateLabel, dur, pname, t12 } = U;
  const DKEY = 'batoi.driver';
  try { B.driverId = localStorage.getItem(DKEY) || null; } catch (e) {}
  function setDriver(id) { B.driverId = id; try { id ? localStorage.setItem(DKEY, id) : localStorage.removeItem(DKEY); } catch (e) {} }
  const me = () => (B.driverId ? A.driverById(B.driverId) : null);
  const bi = (en, hi) => esc(en) + '<span class="bi hi">' + esc(hi) + '</span>';

  // Guard: returns driver or renders login/pending and returns null.
  function need(root) {
    const d = me();
    if (!d) { login(root); return null; }
    if (d.status !== 'approved') { pending(root, d); return null; }
    return d;
  }

  function login(root) {
    const ds = A.drivers();
    root.innerHTML = '<h1>Driver login</h1><p class="muted hi" style="margin-top:4px">ड्राइवर लॉगिन</p>' +
      '<p class="demo-note">Demo: the real app logs in with a mobile OTP. Here, pick a driver to see their app.</p>' +
      '<div class="section-title"><h2>Demo drivers</h2></div>' +
      ds.map((d) => '<button class="trip" data-id="' + d.id + '"><div class="row"><div class="avatar">' + esc(U.initials(d.name)) + '</div><div class="grow"><b>' + esc(d.name) + '</b>' +
        '<div class="small muted">' + esc(A.data.vehicles[d.vehicle].name) + ' · ' + esc(pname(d.base)) + '</div></div>' +
        (d.status === 'approved' ? '<span class="plate">' + esc(d.vehicleNo) + '</span>' : '<span class="tag ' + (d.status === 'pending' ? 'warn' : 'bad') + '">' + esc(d.status) + '</span>') + '</div></button>').join('') +
      '<div class="card flat row" style="margin-top:16px"><div class="grow"><b>New driver?</b><div class="small muted">Register your vehicle · गाड़ी जोड़ें</div></div><a class="btn sm" href="#/drive/register">Register</a></div>';
    root.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { setDriver(b.dataset.id); B.go('#/drive'); });
  }

  function pending(root, d) {
    root.innerHTML = '<div class="card center stack"><div style="font-size:40px">📄</div><h2>' + (d.status === 'pending' ? 'Documents under review' : 'Account ' + esc(d.status)) + '</h2>' +
      '<p class="muted hi">' + (d.status === 'pending' ? 'आपके दस्तावेज़ जाँच में हैं' : 'संपर्क करें: Batoi support') + '</p>' +
      '<p class="small">' + esc(d.name) + ' · ' + esc(A.data.vehicles[d.vehicle].name) + ' · <span class="plate">' + esc(d.vehicleNo) + '</span></p>' +
      (d.status === 'pending' ? '<p class="small muted">We check licence, badge, permit, insurance and fitness before your trips go live. Usually within 24 hours.</p><p class="demo-note">Demo: approve this driver in <a href="#/admin/drivers">Admin → Drivers</a>.</p>' : '') +
      '<button class="btn ghost" id="out">Switch driver</button></div>';
    root.querySelector('#out').onclick = () => { setDriver(null); B.go('#/drive'); };
  }

  // ---------- home ----------
  B.route(/^\/drive$/, 'drive', (root) => {
    const d = need(root); if (!d) return;
    const v = A.data.vehicles[d.vehicle];
    const e = A.earnings(d.id);
    const trips = A.driverTrips(d.id, 7);
    const hires = A.driverHires(d.id);
    const reqs = A.openRequests(d.id);
    const byDate = {};
    trips.forEach((t) => { (byDate[t.date] = byDate[t.date] || []).push({ type: 'trip', t }); });
    hires.forEach((h) => { (byDate[h.date] = byDate[h.date] || []).push({ type: 'hire', h }); });
    const dates = Object.keys(byDate).sort();

    root.innerHTML =
      '<div class="drv-head"><div class="row between"><div><div class="muted small hi">नमस्ते</div><h1 style="color:#fff">' + esc(d.name.split(' ')[0]) + ' ji</h1>' +
        '<span class="plate">' + esc(d.vehicleNo) + '</span> <span class="small muted">' + esc(v.name) + ' · ★ ' + d.rating + '</span></div>' +
        '<button class="btn ghost sm" id="out" style="color:#fff;border-color:rgba(255,255,255,.3)">Switch</button></div>' +
        '<div class="earn"><div><b>' + e.count + '</b><span>Batoi bookings</span></div><div><b>' + money(e.cash) + '</b><span>Collect in cash</span></div><div><b>' + money(e.payout) + '</b><span>Batoi pays you</span></div></div></div>' +
      (reqs.length ? '<a class="banner warn" href="#/drive/requests" style="margin-bottom:14px"><span>🔔</span><div class="grow"><b>' + reqs.length + ' new hire request' + (reqs.length > 1 ? 's' : '') + '</b><br>Full-vehicle bookings for your ' + esc(v.short) + '. Tap to accept.</div></a>' : '') +
      '<div class="row between"><h2>' + bi('Your trips', 'आपकी यात्राएँ') + '</h2><a class="btn sm" href="#/drive/post">' + U.ICON.plus.replace('<svg', '<svg width="16" height="16"') + ' Post trip</a></div>' +
      (dates.length ? dates.map((date) => '<div class="section-title"><h3>' + esc(dateLabel(date)) + '</h3></div>' + byDate[date].map((x) => {
        if (x.type === 'hire') {
          const h = x.h, st = A.tripStatus(h.id).status;
          return '<a class="dtrip" href="#/drive/hire/' + h.id + '"><div class="row between"><b>' + t12(h.time) + ' · ' + esc(pname(h.from)) + ' → ' + esc(pname(h.to)) + '</b><span class="tag info">Full hire</span></div>' +
            '<div class="small muted" style="margin-top:4px">' + esc(h.lead.name) + ' · ' + h.pax + ' passenger' + (h.pax > 1 ? 's' : '') + ' · ' + esc(h.pickup) + (h.tripType === 'round' ? ' · round ' + h.days + 'd' : '') + '</div>' +
            '<div class="small" style="margin-top:4px">Collect ' + money(h.balance) + ' · ' + statusWord(st) + '</div></a>';
        }
        const t = x.t, taken = t.seats - t.free, st = A.tripStatus(t.id).status;
        return '<a class="dtrip" href="#/drive/trip/' + encodeURIComponent(t.id) + '"><div class="row between"><b>' + t12(t.time) + ' · ' + esc(pname(t.from)) + ' → ' + esc(pname(t.to)) + '</b>' +
          (t.blocked ? '<span class="tag bad">Road closed</span>' : statusTag(st)) + '</div>' +
          '<div class="small muted" style="margin-top:4px">' + taken + ' of ' + t.seats + ' seats filled · ' + money(t.price) + '/seat' + (t.ret ? ' · return deal' : '') + (t.custom ? ' · posted by you' : '') + '</div>' +
          '<div class="fill"><i style="width:' + (taken / t.seats * 100) + '%"></i></div></a>';
      }).join('')).join('') : '<div class="card flat center muted" style="margin-top:12px">No trips this week. Post one to start getting bookings.</div>');
    root.querySelector('#out').onclick = () => { setDriver(null); B.go('#/drive'); };
  }, true);

  const statusWord = (s) => ({ scheduled: 'Not started', started: 'On the way', completed: 'Completed' }[s]);
  const statusTag = (s) => ({ scheduled: '<span class="tag plain">Scheduled</span>', started: '<span class="tag deal">On the way</span>', completed: '<span class="tag good">Done</span>' }[s]);

  // OTP + start/complete block shared by seat trips and hires.
  function controls(key, st, cash) {
    if (st.status === 'scheduled') return '<button class="btn good block lg" id="start">' + bi('Start trip', 'यात्रा शुरू करें') + '</button>';
    if (st.status === 'started') return '<div class="card stack"><h3>' + bi('Check passenger OTP', 'यात्री का OTP डालें') + '</h3>' +
      '<div class="row"><input class="input otp-in grow" id="otp" inputmode="numeric" maxlength="4" placeholder="••••"><button class="btn" id="verify">Verify</button></div>' +
      '<p class="tiny muted" style="margin:0">Each Batoi passenger shows a 4-digit OTP on their ticket.</p></div>' +
      '<button class="btn block lg" id="done" style="margin-top:12px">' + bi('Reached · complete trip', 'यात्रा पूरी') + '</button>';
    return '<div class="banner good">✓ Trip completed. Collected ' + money(cash) + ' in cash/UPI.</div>';
  }
  function bindControls(root, key, redraw) {
    const s = root.querySelector('#start'), v = root.querySelector('#verify'), d = root.querySelector('#done');
    if (s) s.onclick = () => { A.startTrip(key); U.toast('Trip started. Passengers can track you now.'); redraw(); };
    if (v) v.onclick = () => {
      const code = root.querySelector('#otp').value;
      const b = A.verifyOtp(key, code);
      if (b) { U.toast('✓ ' + b.lead.name + ' boarded. Collect ' + money(b.balance)); redraw(); }
      else U.toast('OTP does not match any booking on this trip');
    };
    if (d) d.onclick = async () => { if (await U.confirmSheet('Complete this trip?', 'Passengers will be asked to rate the trip.', 'Complete')) { A.completeTrip(key); redraw(); } };
  }

  // ---------- manage a seat trip ----------
  B.route(/^\/drive\/trip\/(.+)$/, 'drive', (root, [id]) => {
    const d = need(root); if (!d) return;
    function draw() {
      const raw = A.getTrip(id);
      if (!raw) { root.innerHTML = '<div class="card">Trip not found. <a href="#/drive">Back</a></div>'; return; }
      const t = A.decorate(raw);
      const st = A.tripStatus(id);
      const rows = A.manifest(id);
      const cash = rows.reduce((s, r) => s + (r.balance || 0), 0);
      const r = A.routeById(t.routeId);
      root.innerHTML = '<a href="#/drive" class="small">← Trips</a>' +
        '<div class="card" style="margin-top:10px"><div class="row between"><div><div class="small muted">' + esc(dateLabel(t.date)) + '</div><h2>' + t12(t.time) + ' · ' + esc(pname(t.from)) + ' → ' + esc(pname(t.to)) + '</h2>' +
          '<div class="small muted">' + r.km + ' km · ~' + dur(r.mins) + ' · ' + money(t.price) + '/seat</div></div>' + statusTag(st.status) + '</div></div>' +
        (t.blocked ? '<div class="banner bad" style="margin-top:12px">⛔ Admin closed this road for the date: ' + esc(t.blocked.reason) + '. Do not start the trip.</div>' : '') +
        '<div class="section-title"><h2>' + bi('Seats', 'सीटें') + '</h2><span class="small muted">' + (t.seats - t.free) + '/' + t.seats + ' filled</span></div>' +
        '<div class="card">' + U.seatMap(t, new Set(), 'driver') +
          (st.status === 'scheduled' ? '<p class="small center" style="margin:12px 0 0">Tap an empty seat when someone boards at the stand, so Batoi stops selling it.<span class="bi hi">स्टैंड से सवारी बैठे तो खाली सीट दबाएँ</span></p>' : '') + '</div>' +
        '<div class="section-title"><h2>' + bi('Passengers', 'यात्री सूची') + '</h2><span class="small">Collect <b>' + money(cash) + '</b></span></div>' +
        '<div class="card" style="padding:6px 12px">' + (rows.length ? '<table class="manifest"><tr><th>Seat</th><th>Name / pickup</th><th style="text-align:right">Collect</th></tr>' +
          rows.map((x) => '<tr><td><b>' + x.seat + '</b></td><td>' + esc(x.name) + (x.boarded && x.bookingId ? ' <span class="tag good">boarded</span>' : '') +
            '<div class="tiny muted">' + (x.pickup ? esc(x.pickup) : 'At stand') + (x.phone ? ' · ' + esc(x.phone) : '') + '</div></td><td style="text-align:right">' + (x.balance ? money(x.balance) : x.source === 'Stand' ? 'cash' : '—') + '</td></tr>').join('') +
          '</table>' : '<p class="muted small">No passengers yet.</p>') + '</div>' +
        '<p class="tiny muted" style="margin:6px 2px 0">"—" rows are other Batoi travellers whose balance was settled online in this demo.</p>' +
        '<div style="margin-top:16px">' + (t.blocked && st.status === 'scheduled' ? '' : controls(id, st, cash)) + '</div>';
      root.querySelectorAll('[data-seat]').forEach((b) => b.onclick = () => {
        if (st.status !== 'scheduled') return U.toast('Trip already started');
        try { A.toggleWalkin(id, b.dataset.seat); draw(); } catch (e) { U.toast(e.message); }
      });
      bindControls(root, id, draw);
    }
    draw();
  });

  // ---------- manage a full-vehicle hire ----------
  B.route(/^\/drive\/hire\/(.+)$/, 'drive', (root, [id]) => {
    const d = need(root); if (!d) return;
    function draw() {
      const h = A.booking(id);
      if (!h || h.driverId !== d.id) { root.innerHTML = '<div class="card">Job not found. <a href="#/drive">Back</a></div>'; return; }
      const st = A.tripStatus(id);
      const r = A.routeById(h.routeId);
      root.innerHTML = '<a href="#/drive" class="small">← Trips</a>' +
        '<div class="card" style="margin-top:10px"><div class="row between"><div><div class="small muted">' + esc(dateLabel(h.date)) + ' · full ' + esc(A.data.vehicles[h.vehicle].short) + '</div>' +
          '<h2>' + t12(h.time) + ' · ' + esc(pname(h.from)) + ' → ' + esc(pname(h.to)) + '</h2><div class="small muted">' + r.km + ' km · ' + (h.tripType === 'round' ? 'round trip, ' + h.days + ' days' : 'one way') + '</div></div>' + statusTag(st.status) + '</div>' +
          '<hr class="sep"><div class="kv"><div><span>Customer</span><b>' + esc(h.lead.name) + '</b></div><div><span>Phone</span><b><a href="tel:' + esc(h.lead.phone) + '">' + esc(h.lead.phone) + '</a></b></div>' +
          '<div><span>Pickup</span><b>' + esc(h.pickup) + '</b></div><div><span>Passengers</span><b>' + h.pax + '</b></div>' +
          '<div><span>Collect from customer</span><b>' + money(h.balance) + '</b></div><div><span>You earn</span><b>' + money(h.fare - h.commission) + '</b></div></div></div>' +
        '<div style="margin-top:16px">' + controls(id, st, h.balance) + '</div>';
      bindControls(root, id, draw);
    }
    draw();
  });

  // ---------- hire requests ----------
  B.route(/^\/drive\/requests$/, 'drive', (root) => {
    const d = need(root); if (!d) return;
    const reqs = A.openRequests(d.id);
    root.innerHTML = '<h1>' + bi('Hire requests', 'बुकिंग अनुरोध') + '</h1><p class="small muted">Customers who want a full ' + esc(A.data.vehicles[d.vehicle].name) + '. First driver to accept gets the trip.</p>' +
      (reqs.length ? reqs.map((h) => {
        const r = A.routeById(h.routeId);
        return '<div class="card"><div class="row between"><b>' + esc(pname(h.from)) + ' → ' + esc(pname(h.to)) + '</b><span class="tag info">' + (h.tripType === 'round' ? 'Round · ' + h.days + 'd' : 'One way') + '</span></div>' +
          '<div class="small muted" style="margin-top:4px">' + esc(dateLabel(h.date)) + ' · ' + t12(h.time) + ' · ' + r.km + ' km · ' + h.pax + ' passenger' + (h.pax > 1 ? 's' : '') + ' · ' + esc(h.pickup) + '</div>' +
          '<div class="row between" style="margin-top:10px"><div><div class="tiny muted">You earn</div><div style="font:700 20px var(--display)">' + money(h.fare - h.commission) + '</div><div class="tiny muted">' + money(h.balance) + ' from customer, ' + money(h.advance - h.commission) + ' from Batoi</div></div>' +
          '<div class="row"><button class="btn ghost sm" data-no="' + h.id + '">Decline</button><button class="btn good" data-yes="' + h.id + '">Accept</button></div></div></div>';
      }).join('') : '<div class="card flat center muted" style="margin-top:12px">No open requests right now.<div class="tiny" style="margin-top:6px">Demo: book "Hire full vehicle" in Travel with a ' + esc(A.data.vehicles[d.vehicle].short) + ' and it shows up here.</div></div>');
    root.querySelectorAll('[data-yes]').forEach((b) => b.onclick = () => { try { A.acceptHire(b.dataset.yes, d.id); U.toast('Accepted. Customer notified.'); B.go('#/drive/hire/' + b.dataset.yes); } catch (e) { U.toast(e.message); } });
    root.querySelectorAll('[data-no]').forEach((b) => b.onclick = () => { A.declineHire(b.dataset.no, d.id); });
  }, true);

  // ---------- post a trip ----------
  B.route(/^\/drive\/post$/, 'drive', (root) => {
    const d = need(root); if (!d) return;
    const opts = [];
    A.data.routes.forEach((r) => {
      opts.push({ v: r.id + ':ab', l: pname(r.a) + ' → ' + pname(r.b), home: r.a === d.base });
      opts.push({ v: r.id + ':ba', l: pname(r.b) + ' → ' + pname(r.a), home: r.b === d.base });
    });
    opts.sort((a, b) => (b.home - a.home) || a.l.localeCompare(b.l));
    const tmr = A.addDays(A.today(), 1);
    root.innerHTML = '<h1>' + bi('Post a trip', 'यात्रा जोड़ें') + '</h1><p class="small muted">Travellers can book your empty seats as soon as you post.</p>' +
      '<div class="card stack" style="margin-top:14px">' +
        '<label class="field"><span>Route</span><select class="input" id="rt">' + opts.map((o) => '<option value="' + o.v + '">' + esc(o.l) + '</option>').join('') + '</select></label>' +
        '<div class="grid2"><label class="field"><span>Date</span><input type="date" class="input" id="dt" min="' + A.today() + '" value="' + tmr + '"></label>' +
        '<label class="field"><span>Departure</span><input type="time" class="input" id="tm" value="07:00" step="900"></label></div>' +
        '<div class="grid2"><label class="field"><span>Price per seat (₹)</span><input class="input" id="pr" inputmode="numeric"></label>' +
        '<label class="field"><span>Repeat daily for</span><select class="input" id="rp"><option value="1">Just this day</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label></div>' +
        '<label class="row small" style="cursor:pointer"><input type="checkbox" id="ret" style="width:18px;height:18px;accent-color:var(--primary)"> This is my trip back home: offer 25% off to fill seats</label>' +
        '<div class="small muted" id="hint"></div>' +
        '<div class="small">Vehicle: <b>' + esc(A.data.vehicles[d.vehicle].name) + '</b>, ' + A.data.vehicles[d.vehicle].seats + ' seats · <span class="plate">' + esc(d.vehicleNo) + '</span></div>' +
        '<button class="btn block lg" id="post">Post trip</button></div>';
    const $ = (s) => root.querySelector(s);
    function hint() {
      const [rid] = $('#rt').value.split(':');
      const p = A.suggestedPrice(rid, d.vehicle, $('#ret').checked);
      $('#pr').value = p;
      $('#hint').textContent = 'Suggested ' + money(p) + ' per seat for this route' + ($('#ret').checked ? ' (with return discount)' : '') + '. Batoi keeps ' + (A.RULES.commission * 100) + '%.';
    }
    $('#rt').onchange = hint; $('#ret').onchange = hint; hint();
    $('#post').onclick = () => {
      const [routeId, dir] = $('#rt').value.split(':');
      const date = $('#dt').value, time = $('#tm').value, price = Number($('#pr').value);
      if (!date || !time) return U.toast('Pick a date and time');
      if (!(price > 0)) return U.toast('Enter a seat price');
      if (date === A.today() && A.toMin(time) <= new Date().getHours() * 60 + new Date().getMinutes()) return U.toast('That time has already passed today');
      const ids = A.postTrip(d.id, { routeId, dir, date, time, price, repeat: Number($('#rp').value), ret: $('#ret').checked });
      U.toast(ids.length > 1 ? ids.length + ' trips posted' : 'Trip posted. It is live in search now.');
      B.go('#/drive');
    };
  });

  // ---------- register ----------
  B.route(/^\/drive\/register$/, 'drive', (root) => {
    const docs = [['licence', 'Driving licence'], ['badge', 'Commercial badge (PSV)'], ['rc', 'Vehicle RC (yellow plate)'], ['permit', 'Taxi / contract carriage permit'],
      ['insurance', 'Commercial insurance'], ['fitness', 'Fitness certificate'], ['green', 'Char Dham green card (if applicable)'], ['aadhaar', 'Aadhaar (KYC)']];
    root.innerHTML = '<a href="#/drive" class="small">← Driver login</a><h1 style="margin-top:8px">' + bi('Register your vehicle', 'अपनी गाड़ी जोड़ें') + '</h1>' +
      '<p class="small muted">Commercial (yellow plate) vehicles only. We verify every document before your trips go live.</p>' +
      '<div class="card stack" style="margin-top:14px">' +
        '<label class="field"><span>Full name</span><input class="input" id="nm" placeholder="As on licence"></label>' +
        '<label class="field"><span>Mobile</span><input class="input" id="ph" inputmode="numeric" maxlength="10" placeholder="10-digit mobile"></label>' +
        '<div class="grid2"><label class="field"><span>Vehicle</span><select class="input" id="vh">' + Object.keys(A.data.vehicles).map((k) => '<option value="' + k + '">' + esc(A.data.vehicles[k].name) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Vehicle number</span><input class="input" id="vn" placeholder="UK14 TA 1234" style="text-transform:uppercase"></label></div>' +
        '<label class="field"><span>Home town / stand</span><select class="input" id="bs">' + Object.keys(A.data.places).map((k) => '<option value="' + k + '">' + esc(pname(k)) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Operator / union (optional)</span><input class="input" id="op" placeholder="e.g. Uttarkashi Taxi Union"></label></div>' +
      '<div class="section-title"><h2>Documents</h2><span class="small muted" id="dc">0 of ' + docs.length + '</span></div>' +
      '<div class="docs">' + docs.map(([k, l]) => '<label><span class="small">' + esc(l) + '</span><input type="file" accept="image/*,.pdf" data-doc="' + k + '"><span class="up" data-st="' + k + '">Upload</span></label>').join('') + '</div>' +
      '<p class="demo-note" style="margin-top:12px">Demo: files stay on this device and are not uploaded anywhere.</p>' +
      '<button class="btn block lg" id="sub" style="margin:14px 0 8px">Submit for verification</button>';
    const got = new Set();
    root.querySelectorAll('[data-doc]').forEach((i) => i.onchange = () => {
      if (i.files.length) { got.add(i.dataset.doc); const s = root.querySelector('[data-st="' + i.dataset.doc + '"]'); s.textContent = '✓ ' + i.files[0].name.slice(0, 18); s.classList.add('ok'); }
      root.querySelector('#dc').textContent = got.size + ' of ' + docs.length;
    });
    root.querySelector('#sub').onclick = () => {
      const $ = (s) => root.querySelector(s).value.trim();
      if (!$('#nm')) return U.toast('Enter your name');
      if ($('#ph').replace(/\D/g, '').length !== 10) return U.toast('Enter a 10-digit mobile');
      if (!/^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{0,3}\s?\d{3,4}$/i.test($('#vn'))) return U.toast('Enter a valid vehicle number, e.g. UK14 TA 1234');
      if (got.size < 6) return U.toast('Upload at least licence, badge, RC, permit, insurance and fitness');
      const d = A.registerDriver({ name: $('#nm'), phone: '+91 ' + $('#ph'), vehicle: $('#vh'), vehicleNo: $('#vn').toUpperCase(), base: $('#bs'), operator: $('#op') || 'Self', docs: [...got] });
      setDriver(d.id);
      B.go('#/drive');
    };
  });
})();
