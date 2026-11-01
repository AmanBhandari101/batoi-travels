// Traveller app: search, results, seat booking, vehicle hire, tickets, alerts.
(function () {
  const A = window.BatoiAPI, U = window.UI, B = window.Batoi;
  const { esc, money, dateLabel, dur, pname, t12 } = U;

  // Home form state survives navigation within the session.
  const form = { mode: 'seat', from: 'rishikesh', to: 'uttarkashi', date: A.today(), pax: 1, tripType: 'oneway', days: 2 };

  const placeOptions = (ids, sel) => ids.map((id) => '<option value="' + id + '"' + (id === sel ? ' selected' : '') + '>' + esc(pname(id)) + '</option>').join('');
  const allPlaces = () => Object.keys(A.data.places).sort((a, b) => pname(a).localeCompare(pname(b)));

  // ---------- payment (demo UPI) ----------
  function pay(amount, label) {
    return new Promise((resolve) => {
      U.sheet(
        '<div class="row between"><h2>Pay ' + money(amount) + '</h2><button class="btn ghost sm" data-close>✕</button></div>' +
        '<p class="small muted" style="margin:4px 0 14px">' + esc(label) + '</p>' +
        '<div class="upi">' + ['GPay', 'PhonePe', 'Paytm', 'BHIM UPI'].map((n, i) => '<button type="button" class="' + (i ? '' : 'on') + '">' + n + '</button>').join('') + '</div>' +
        '<p class="demo-note" style="margin-top:14px">Demo payment: no money moves. A real build uses Razorpay UPI here.</p>' +
        '<button class="btn block lg" data-pay style="margin-top:14px">Pay ' + money(amount) + '</button>',
        (el, close) => {
          el.querySelectorAll('.upi button').forEach((b) => b.onclick = () => { el.querySelectorAll('.upi button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); });
          el.querySelector('[data-pay]').onclick = (e) => {
            e.target.disabled = true; e.target.textContent = 'Waiting for UPI…';
            setTimeout(() => { close(); resolve(true); }, 900);
          };
          el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => resolve(false)));
        });
    });
  }

  // ---------- home ----------
  B.route(/^\/$/, 'travel', (root) => {
    const dests = A.destinationsFrom(form.from);
    if (!dests.includes(form.to)) form.to = dests[0];
    const tmr = A.addDays(A.today(), 1);
    const blocks = A.blocks().filter((b) => A.daysFrom(b.date) >= 0);
    const popular = [['rishikesh', 'uttarkashi'], ['rishikesh', 'sonprayag'], ['dehradun', 'uttarkashi'], ['rishikesh', 'badrinath'], ['uttarkashi', 'gangotri'], ['rishikesh', 'srinagar']];

    root.innerHTML =
      '<section class="hero"><h1>Book your seat to the hills</h1><p>Shared jeeps, cabs and Tempo Travellers, confirmed before you leave home.</p>' +
      '<svg class="hills" viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 L0 40 L50 18 L95 42 L150 8 L205 40 L250 22 L300 46 L350 14 L400 38 L400 70Z" fill="rgba(255,255,255,.12)"/><path d="M0 70 L0 55 L70 34 L130 56 L190 30 L260 58 L330 36 L400 54 L400 70Z" fill="var(--bg)"/></svg></section>' +
      '<div class="card search-card stack">' +
        '<div class="seg" role="tablist"><button data-mode="seat" class="' + (form.mode === 'seat' ? 'on' : '') + '">Book a seat</button><button data-mode="hire" class="' + (form.mode === 'hire' ? 'on' : '') + '">Hire full vehicle</button></div>' +
        '<div class="od"><div class="leg"><i></i><select id="from" aria-label="From">' + placeOptions(allPlaces(), form.from) + '</select></div>' +
        '<div class="leg"><i></i><select id="to" aria-label="To">' + placeOptions(dests, form.to) + '</select></div>' +
        '<button class="swap" id="swap" type="button" aria-label="Swap">' + U.ICON.swap + '</button></div>' +
        '<label class="field"><span>Travel date</span><div class="row"><button type="button" class="chip ' + (form.date === A.today() ? 'on' : '') + '" data-date="' + A.today() + '">Today</button>' +
          '<button type="button" class="chip ' + (form.date === tmr ? 'on' : '') + '" data-date="' + tmr + '">Tomorrow</button>' +
          '<input type="date" class="input grow" id="date" min="' + A.today() + '" max="' + A.addDays(A.today(), 60) + '" value="' + form.date + '"></div></label>' +
        (form.mode === 'seat'
          ? '<label class="field"><span>Seats</span><div class="stepper"><button type="button" data-pax="-1">−</button><b id="pax">' + form.pax + '</b><button type="button" data-pax="1">+</button></div></label>'
          : '<div class="grid2"><label class="field"><span>Trip</span><select class="input" id="ttype"><option value="oneway"' + (form.tripType === 'oneway' ? ' selected' : '') + '>One way</option><option value="round"' + (form.tripType === 'round' ? ' selected' : '') + '>Round trip</option></select></label>' +
            '<label class="field"><span>Days</span><select class="input" id="days"' + (form.tripType === 'round' ? '' : ' disabled') + '>' + [1, 2, 3, 4, 5, 6, 7].map((d) => '<option' + (d === form.days ? ' selected' : '') + '>' + d + '</option>').join('') + '</select></label></div>') +
        '<button class="btn block lg" id="go">' + (form.mode === 'seat' ? 'Search trips' : 'See vehicles & prices') + '</button>' +
      '</div>' +
      (blocks.length ? '<div class="banner warn" style="margin-top:12px"><span>⚠</span><div><b>Road alerts</b><br>' + blocks.map((b) => {
        const r = A.routeById(b.routeId); return esc(pname(r.a) + '–' + pname(r.b)) + ' closed ' + esc(dateLabel(b.date, true)) + ' (' + esc(b.reason) + ')';
      }).join('<br>') + '</div></div>' : '') +
      '<div class="section-title"><h2>Popular routes</h2><span class="small muted">fares from, per seat</span></div>' +
      '<div class="popular">' + popular.map(([f, t]) => {
        const r = A.findRoute(f, t).route; const lo = A.dateStrip(f, t, tmr, 1)[0].lowest;
        return '<button class="pop" data-f="' + f + '" data-t="' + t + '"><b>' + esc(pname(f)) + ' → ' + esc(pname(t).replace(/ \(.*/, '')) + '</b><span>' + r.km + ' km · ~' + dur(r.mins) + '</span><em>' + (lo ? 'from ' + money(lo) : '') + '</em></button>';
      }).join('') + '</div>' +
      '<div class="section-title"><h2>How Batoi works</h2></div>' +
      '<div class="card flat steps">' +
        '<div><span><b>Search your route and date.</b><br><span class="small muted">Every jeep, cab and Tempo Traveller leaving that day, with seats left.</span></span></div>' +
        '<div><span><b>Pick your seat, pay 20% advance.</b><br><span class="small muted">The rest goes to the driver at pickup, in cash or UPI.</span></span></div>' +
        '<div><span><b>Show your OTP and board.</b><br><span class="small muted">Track the vehicle live. Free cancellation up to 24 hours before.</span></span></div>' +
      '</div>' +
      '<div class="section-title"><h2>Drive with Batoi</h2></div>' +
      '<div class="card flat row"><div class="grow"><b>Own a taxi or jeep?</b><div class="small muted">Fill empty seats and get bookings for the trip back home.</div></div><a class="btn soft sm" href="#/drive/register">Join</a></div>';

    const $ = (s) => root.querySelector(s);
    root.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { form.mode = b.dataset.mode; B.go('#/'); });
    $('#from').onchange = (e) => { form.from = e.target.value; B.go('#/'); };
    $('#to').onchange = (e) => { form.to = e.target.value; };
    $('#swap').onclick = () => { [form.from, form.to] = [form.to, form.from]; B.go('#/'); };
    root.querySelectorAll('[data-date]').forEach((b) => b.onclick = () => { form.date = b.dataset.date; B.go('#/'); });
    $('#date').onchange = (e) => { if (e.target.value) form.date = e.target.value; root.querySelectorAll('[data-date]').forEach((b) => b.classList.toggle('on', b.dataset.date === form.date)); };
    root.querySelectorAll('[data-pax]').forEach((b) => b.onclick = () => { form.pax = Math.min(6, Math.max(1, form.pax + Number(b.dataset.pax))); $('#pax').textContent = form.pax; });
    if ($('#ttype')) $('#ttype').onchange = (e) => { form.tripType = e.target.value; $('#days').disabled = form.tripType !== 'round'; };
    if ($('#days')) $('#days').onchange = (e) => { form.days = Number(e.target.value); };
    $('#go').onclick = () => {
      if (form.mode === 'seat') B.go('#/results?from=' + form.from + '&to=' + form.to + '&date=' + form.date + '&pax=' + form.pax);
      else B.go('#/hire?from=' + form.from + '&to=' + form.to + '&date=' + form.date + '&type=' + form.tripType + '&days=' + form.days);
    };
    root.querySelectorAll('.pop').forEach((b) => b.onclick = () => {
      form.from = b.dataset.f; form.to = b.dataset.t; form.mode = 'seat';
      const date = A.daysFrom(form.date) < 0 ? A.today() : form.date;
      B.go('#/results?from=' + form.from + '&to=' + form.to + '&date=' + date + '&pax=' + form.pax);
    });
  });

  // ---------- results ----------
  const filt = { vehicle: 'all', deals: false, sort: 'time' };
  B.route(/^\/results$/, 'travel', (root, _, q) => {
    const from = q.get('from'), to = q.get('to'), date = q.get('date') || A.today(), pax = Number(q.get('pax') || 1);
    Object.assign(form, { from, to, date, pax, mode: 'seat' });
    const res = A.search(from, to, date, pax);
    if (!res.route) { root.innerHTML = '<div class="card">No direct route between these places yet. <a href="#/">Change search</a></div>'; return; }
    const strip = A.dateStrip(from, to, A.daysFrom(date) > 2 ? A.addDays(date, -2) : A.today(), 8);
    const upcoming = res.trips.filter((t) => !t.departed);
    const left = res.trips.length - upcoming.length;
    let list = upcoming.filter((t) => (filt.vehicle === 'all' || t.vehicle === filt.vehicle) && (!filt.deals || t.ret));
    if (filt.sort === 'price') list.sort((a, b) => a.price - b.price);
    if (filt.sort === 'seats') list.sort((a, b) => b.free - a.free);
    const vtypes = [...new Set(upcoming.map((t) => t.vehicle))];
    const hire = A.hireQuotes(from, to, date, 'oneway').quotes[0];

    root.innerHTML =
      '<div class="route-head"><div class="row between"><div><h2>' + esc(pname(from)) + ' → ' + esc(pname(to)) + '</h2>' +
        '<div class="small muted">' + res.route.km + ' km · ~' + dur(res.route.mins) + ' · via ' + esc(res.via.join(', ')) + '</div></div>' +
        '<a class="btn ghost sm" href="#/">Edit</a></div></div>' +
      '<div class="datestrip">' + strip.map((d) => '<button data-d="' + d.date + '" class="' + (d.date === date ? 'on ' : '') + (d.blocked ? 'closed' : '') + '"><b>' + esc(dateLabel(d.date, true).split(', ')[1]) + '</b><span>' + esc(dateLabel(d.date, true).split(',')[0]) + '</span><em>' + (d.blocked ? 'Closed' : d.lowest ? money(d.lowest) : '—') + '</em></button>').join('') + '</div>' +
      (res.block ? '<div class="banner bad" style="margin:10px 0"><span>⛔</span><div><b>Road closed on this date</b><br>' + esc(res.block.reason) + '. Bookings are paused. Pick another date above.</div></div>' : '') +
      '<div class="chips" style="margin:12px 0 4px"><button class="chip ' + (filt.vehicle === 'all' ? 'on' : '') + '" data-v="all">All</button>' +
        vtypes.map((v) => '<button class="chip ' + (filt.vehicle === v ? 'on' : '') + '" data-v="' + v + '">' + esc(A.data.vehicles[v].short) + '</button>').join('') +
        '<button class="chip ' + (filt.deals ? 'on' : '') + '" data-deals>Return deals</button></div>' +
      '<div class="row between" style="margin:10px 2px"><span class="small"><b>' + list.length + '</b> trip' + (list.length === 1 ? '' : 's') + ' · ' + esc(dateLabel(date)) + '</span>' +
        '<select class="input" id="sort" style="width:auto;padding:6px 10px"><option value="time">Earliest</option><option value="price"' + (filt.sort === 'price' ? ' selected' : '') + '>Cheapest</option><option value="seats"' + (filt.sort === 'seats' ? ' selected' : '') + '>Most seats</option></select></div>' +
      (list.length ? list.map((t) => {
        const can = !t.blocked && t.free >= pax;
        return '<button class="trip" data-trip="' + esc(t.id) + '"' + (can ? '' : ' disabled') + '>' +
          '<div class="row between" style="align-items:flex-start"><div class="grow">' + U.tripCardBody(t) + '</div>' +
          '<div class="price" style="margin-left:14px">' + (t.ret ? '<div class="strike small">' + money(t.fullPrice) + '</div>' : '') + money(t.price) + '<div class="tiny muted" style="font-weight:500">per seat</div></div></div>' +
          '<div class="meta"><b>' + esc(t.v.name) + '</b><span class="muted">' + esc(t.v.kind) + '</span>' + (t.ret ? '<span class="tag deal">Return deal −25%</span>' : '') +
          '<span class="grow"></span><span class="seatsleft ' + (t.free <= 2 ? 'low' : '') + '">' + (t.free ? t.free + ' of ' + t.seats + ' seats left' : 'Full') + '</span></div>' +
          '<div class="meta"><span>' + esc(t.driver.name) + ' <span class="star">★</span> ' + t.driver.rating + '</span><span class="muted">· ' + esc(t.v.luggage) + '</span>' +
          (t.free && t.free < pax ? '<span class="tag warn">Only ' + t.free + ' left</span>' : '') + '</div></button>';
      }).join('') : '<div class="card flat center muted">No trips match. ' + (filt.vehicle !== 'all' || filt.deals ? 'Try clearing the filters.' : 'Try another date.') + '</div>') +
      (left ? '<p class="small muted center" style="margin-top:14px">' + left + ' trip' + (left > 1 ? 's have' : ' has') + ' already left today.</p>' : '') +
      (hire ? '<div class="card flat row" style="margin-top:16px"><div class="grow"><b>Travelling as a group?</b><div class="small muted">Hire the whole vehicle from ' + money(hire.fare) + '.</div></div><a class="btn soft sm" href="#/hire?from=' + from + '&to=' + to + '&date=' + date + '&type=oneway">Hire</a></div>' : '');

    root.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => B.go('#/results?from=' + from + '&to=' + to + '&date=' + b.dataset.d + '&pax=' + pax));
    root.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { filt.vehicle = b.dataset.v; B.go(location.hash); });
    root.querySelector('[data-deals]').onclick = () => { filt.deals = !filt.deals; B.go(location.hash); };
    root.querySelector('#sort').onchange = (e) => { filt.sort = e.target.value; B.go(location.hash); };
    root.querySelectorAll('[data-trip]').forEach((b) => b.onclick = () => B.go('#/trip/' + encodeURIComponent(b.dataset.trip) + '?pax=' + pax));
  });

  // ---------- seat selection ----------
  B.route(/^\/trip\/(.+)$/, 'travel', (root, [id], q) => {
    const raw = A.getTrip(id);
    if (!raw) { root.innerHTML = '<div class="card">Trip not found. <a href="#/">Search again</a></div>'; return; }
    const t = A.decorate(raw);
    const pax = Number(q.get('pax') || 1);
    const sel = new Set(B.sel && B.sel.tripId === id ? B.sel.seats : []);
    let pickup = (B.sel && B.sel.tripId === id && B.sel.pickup) || A.place(t.from).pickups[0];

    function draw() {
      const fare = A.seatFare(t, [...sel]);
      root.innerHTML =
        '<a href="#/results?from=' + t.from + '&to=' + t.to + '&date=' + t.date + '&pax=' + pax + '" class="small">← All trips</a>' +
        '<div class="card" style="margin-top:10px"><div class="small muted">' + esc(dateLabel(t.date)) + '</div>' +
          '<h2 style="margin:4px 0 10px">' + esc(pname(t.from)) + ' → ' + esc(pname(t.to)) + '</h2>' + U.tripCardBody(t) +
          '<hr class="sep">' + U.driverMini(t.driver, t.v) + '</div>' +
        (t.blocked ? '<div class="banner bad" style="margin-top:12px">⛔ Road closed on this date. Booking paused.</div>' : '') +
        (t.departed ? '<div class="banner warn" style="margin-top:12px">This trip has already left.</div>' : '') +
        '<div class="section-title"><h2>Choose seat' + (pax > 1 ? 's' : '') + '</h2><span class="small muted">' + sel.size + ' of ' + pax + ' picked</span></div>' +
        '<div class="card">' + U.seatMap(t, sel, 'book') + '<p class="tiny muted center" style="margin:10px 0 0">Front seat is best if you get motion sick on hill roads.</p></div>' +
        '<div class="section-title"><h2>Pickup point</h2></div>' +
        '<div class="pickups">' + A.place(t.from).pickups.map((p) => '<label><input type="radio" name="pk" value="' + esc(p) + '"' + (p === pickup ? ' checked' : '') + '><span class="grow">' + esc(p) + '</span><span class="small muted">' + t12(t.time) + '</span></label>').join('') + '</div>' +
        '<div style="height:20px"></div>' +
        '<div class="stickybar"><div class="grow"><div class="small muted">' + (sel.size ? sel.size + ' seat' + (sel.size > 1 ? 's' : '') + ': ' + [...sel].join(', ') : 'No seat selected') + '</div><div class="total">' + money(fare) + '</div></div>' +
          '<button class="btn lg" id="cont"' + (sel.size && !t.blocked && !t.departed ? '' : ' disabled') + '>Continue</button></div>';
      root.querySelectorAll('[data-seat]').forEach((b) => b.onclick = () => {
        const s = b.dataset.seat;
        if (sel.has(s)) sel.delete(s);
        else { if (sel.size >= Math.max(pax, 1) && pax === 1) sel.clear(); if (sel.size >= 6) return U.toast('Up to 6 seats per booking'); sel.add(s); }
        draw();
      });
      root.querySelectorAll('[name=pk]').forEach((r) => r.onchange = () => { pickup = r.value; });
      root.querySelector('#cont').onclick = () => { B.sel = { tripId: id, seats: [...sel], pickup, pax }; B.go('#/checkout'); };
    }
    draw();
  });

  // ---------- seat checkout ----------
  B.route(/^\/checkout$/, 'travel', (root) => {
    if (!B.sel) { B.go('#/'); return; }
    const t = A.decorate(A.getTrip(B.sel.tripId));
    const seats = B.sel.seats;
    const money_ = A.split(A.seatFare(t, seats));
    const prof = A.profile();
    root.innerHTML =
      '<a href="#/trip/' + encodeURIComponent(t.id) + '?pax=' + seats.length + '" class="small">← Seats</a>' +
      '<div class="card" style="margin-top:10px"><div class="row between"><div><b>' + esc(pname(t.from)) + ' → ' + esc(pname(t.to)) + '</b><div class="small muted">' + esc(dateLabel(t.date)) + ' · ' + t12(t.time) + ' · ' + esc(t.v.name) + '</div></div><span class="tag info">' + seats.join(', ') + '</span></div>' +
        '<div class="small" style="margin-top:8px">Pickup: <b>' + esc(B.sel.pickup) + '</b></div></div>' +
      '<div class="section-title"><h2>Passengers</h2></div><div class="card stack">' +
        seats.map((s, i) => '<label class="field"><span>Seat ' + s + (i === 0 ? ' · main contact' : '') + '</span><input class="input" data-name="' + i + '" placeholder="Full name" value="' + (i === 0 ? esc(prof.name) : '') + '"></label>').join('') +
        '<label class="field"><span>Mobile number (ticket + driver contact)</span><input class="input" id="phone" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" value="' + esc(prof.phone) + '"></label>' +
      '</div>' +
      '<div class="section-title"><h2>Fare</h2></div><div class="card"><table class="fare">' +
        '<tr><td>' + seats.length + ' × seat' + (seats.includes('F1') ? ' (front +₹' + A.data.FRONT_SEAT_EXTRA + ')' : '') + '</td><td>' + money(money_.fare) + '</td></tr>' +
        '<tr><td>Convenience fee</td><td>' + money(money_.fee) + '</td></tr>' +
        '<tr class="total paynow"><td>Pay now (advance + fee)</td><td>' + money(money_.payNow) + '</td></tr>' +
        '<tr><td class="muted">Pay driver at pickup (cash/UPI)</td><td>' + money(money_.balance) + '</td></tr></table>' +
        '<p class="tiny muted" style="margin:10px 0 0">Cancel more than 24 h before: advance refunded. 6–24 h: half refunded. If the road is closed: full refund.</p></div>' +
      '<div style="height:20px"></div>' +
      '<div class="stickybar"><div class="grow"><div class="small muted">Pay now</div><div class="total">' + money(money_.payNow) + '</div></div><button class="btn lg" id="pay">Pay & book</button></div>';

    root.querySelector('#pay').onclick = async () => {
      const names = [...root.querySelectorAll('[data-name]')].map((i) => i.value.trim());
      const phone = root.querySelector('#phone').value.replace(/\D/g, '');
      if (!names[0]) return U.toast('Enter the main passenger name');
      if (phone.length !== 10) return U.toast('Enter a 10-digit mobile number');
      const ok = await pay(money_.payNow, 'Advance for ' + seats.length + ' seat' + (seats.length > 1 ? 's' : '') + ', ' + pname(t.from) + ' → ' + pname(t.to));
      if (!ok) return;
      try {
        const b = A.bookSeats({ tripId: t.id, seats, pickup: B.sel.pickup, lead: { name: names[0], phone }, pax: names.map((n, i) => n || names[0] + ' +' + i) });
        B.sel = null;
        B.go('#/ticket/' + b.id + '?new=1');
      } catch (e) { U.toast(e.message); }
    };
  });

  // ---------- hire full vehicle ----------
  B.route(/^\/hire$/, 'travel', (root, _, q) => {
    const from = q.get('from'), to = q.get('to'), date = q.get('date') || A.today();
    const type = q.get('type') || 'oneway', days = Number(q.get('days') || 2);
    Object.assign(form, { from, to, date, mode: 'hire', tripType: type, days });
    const res = A.hireQuotes(from, to, date, type, days);
    if (!res.route) { root.innerHTML = '<div class="card">No route between these places yet. <a href="#/">Change search</a></div>'; return; }
    const base = '#/hire?from=' + from + '&to=' + to + '&date=' + date;
    root.innerHTML =
      '<div class="route-head"><div class="row between"><div><h2>' + esc(pname(from)) + ' → ' + esc(pname(to)) + '</h2>' +
        '<div class="small muted">' + esc(dateLabel(date)) + ' · ' + res.route.km + ' km · ~' + dur(res.route.mins) + '</div></div><a class="btn ghost sm" href="#/">Edit</a></div>' +
        '<div class="seg" style="margin-top:12px"><button data-t="oneway" class="' + (type === 'oneway' ? 'on' : '') + '">One way</button><button data-t="round" class="' + (type === 'round' ? 'on' : '') + '">Round trip · ' + days + ' day' + (days > 1 ? 's' : '') + '</button></div></div>' +
      (res.block ? '<div class="banner bad" style="margin-bottom:12px">⛔ Road closed on this date (' + esc(res.block.reason) + '). Pick another date.</div>' : '') +
      (res.returnLegs.length ? '<div class="section-title"><h2>Cars going home empty</h2><span class="tag deal">up to 40% off</span></div>' +
        '<p class="small muted" style="margin:-4px 2px 10px">These drivers dropped someone in ' + esc(pname(from)) + ' and are driving back to ' + esc(pname(to)) + '. Fixed time, instant confirm.</p>' +
        res.returnLegs.map((l) => '<button class="trip" data-leg="' + esc(l.legId) + '"' + (res.block ? ' disabled' : '') + '><div class="row between"><div><b>' + esc(l.v.name) + '</b> <span class="muted small">· ' + l.v.seats + ' seats</span>' +
          '<div class="small" style="margin-top:4px">Leaves ' + t12(l.time) + ' · ' + esc(l.driver.name) + ' <span class="star">★</span> ' + l.driver.rating + '</div></div>' +
          '<div class="price"><div class="strike small">' + money(l.full) + '</div>' + money(l.fare) + '</div></div></button>').join('') : '') +
      '<div class="section-title"><h2>Choose a vehicle</h2><span class="small muted">' + (type === 'round' ? 'incl. driver stay' : 'one way, all-inclusive') + '</span></div>' +
      res.quotes.map((x) => '<button class="trip" data-veh="' + x.vehicle + '"' + (res.block ? ' disabled' : '') + '><div class="row between"><div class="grow"><b>' + esc(x.v.name) + '</b> <span class="muted small">· ' + esc(x.v.kind) + '</span>' +
        '<div class="small muted" style="margin-top:4px">Up to ' + x.v.seats + ' passengers · ' + esc(x.v.luggage) + '</div></div>' +
        '<div class="price">' + money(x.fare) + '<div class="tiny muted" style="font-weight:500">pay ' + money(x.money.payNow) + ' now</div></div></div></button>').join('') +
      '<p class="tiny muted" style="margin-top:12px">Prices include fuel, tolls, state entry and driver charges. ' + (type === 'oneway' ? 'One-way fares include the empty run back.' : 'Round trip adds ' + money(A.RULES.nightAllowance) + ' per extra day for the driver.') + '</p>';

    root.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => B.go(base + '&type=' + b.dataset.t + '&days=' + (b.dataset.t === 'round' ? Math.max(2, days) : days)));
    root.querySelectorAll('[data-veh]').forEach((b) => b.onclick = () => { B.hireSel = { from, to, date, tripType: type, days, vehicle: b.dataset.veh }; B.go('#/hirecheckout'); });
    root.querySelectorAll('[data-leg]').forEach((b) => b.onclick = () => {
      const l = res.returnLegs.find((x) => x.legId === b.dataset.leg);
      B.hireSel = { from, to, date, tripType: 'oneway', days: 1, vehicle: l.vehicle, legId: l.legId, time: l.time }; B.go('#/hirecheckout');
    });
  });

  B.route(/^\/hirecheckout$/, 'travel', (root) => {
    const h = B.hireSel;
    if (!h) { B.go('#/'); return; }
    const res = A.hireQuotes(h.from, h.to, h.date, h.tripType, h.days);
    const leg = h.legId ? res.returnLegs.find((l) => l.legId === h.legId) : null;
    if (h.legId && !leg) { root.innerHTML = '<div class="card">That return car was just booked. <a href="#/">Search again</a></div>'; return; }
    const q = leg || res.quotes.find((x) => x.vehicle === h.vehicle);
    const v = A.data.vehicles[h.vehicle];
    const prof = A.profile();
    const times = []; for (let m = 300; m <= 1080; m += 30) times.push(A.fromMin(m));
    const okTimes = times.filter((t) => A.daysFrom(h.date) > 0 || A.toMin(t) > new Date().getHours() * 60 + new Date().getMinutes() + 90);
    root.innerHTML =
      '<a href="#/hire?from=' + h.from + '&to=' + h.to + '&date=' + h.date + '&type=' + h.tripType + '&days=' + h.days + '" class="small">← Vehicles</a>' +
      '<div class="card" style="margin-top:10px"><b>' + esc(v.name) + (leg ? ' · return car' : '') + '</b><div class="small muted">' + esc(pname(h.from)) + ' → ' + esc(pname(h.to)) + ' · ' + esc(dateLabel(h.date)) +
        (h.tripType === 'round' ? ' · round trip, ' + h.days + ' days' : ' · one way') + '</div>' + (leg ? '<hr class="sep">' + U.driverMini(leg.driver, v) : '') + '</div>' +
      '<div class="section-title"><h2>Trip details</h2></div><div class="card stack">' +
        '<label class="field"><span>Pickup point</span><select class="input" id="pk">' + A.place(h.from).pickups.map((p) => '<option>' + esc(p) + '</option>').join('') + '</select></label>' +
        (leg ? '<div class="small">Departure: <b>' + t12(leg.time) + '</b> (fixed by the driver)</div>'
             : '<label class="field"><span>Departure time</span><select class="input" id="tm">' + (okTimes.length ? okTimes.map((t) => '<option value="' + t + '"' + (t === '07:00' ? ' selected' : '') + '>' + t12(t) + '</option>').join('') : '<option value="">No time left today</option>') + '</select></label>') +
        '<label class="field"><span>Passengers</span><select class="input" id="px">' + Array.from({ length: v.seats }, (_, i) => '<option>' + (i + 1) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span>Your name</span><input class="input" id="nm" value="' + esc(prof.name) + '" placeholder="Full name"></label>' +
        '<label class="field"><span>Mobile number</span><input class="input" id="ph" inputmode="numeric" maxlength="10" value="' + esc(prof.phone) + '" placeholder="10-digit mobile"></label></div>' +
      '<div class="section-title"><h2>Fare</h2></div><div class="card"><table class="fare">' +
        '<tr><td>Vehicle fare</td><td>' + money(q.fare) + '</td></tr><tr><td>Convenience fee</td><td>' + money(q.money.fee) + '</td></tr>' +
        '<tr class="total paynow"><td>Pay now</td><td>' + money(q.money.payNow) + '</td></tr><tr><td class="muted">Pay driver on the day</td><td>' + money(q.money.balance) + '</td></tr></table>' +
        (leg ? '' : '<p class="tiny muted" style="margin:10px 0 0">We send your request to verified ' + esc(v.short) + ' drivers. If nobody accepts, the full amount is refunded.</p>') + '</div>' +
      '<div style="height:20px"></div><div class="stickybar"><div class="grow"><div class="small muted">Pay now</div><div class="total">' + money(q.money.payNow) + '</div></div><button class="btn lg" id="pay">' + (leg ? 'Pay & book' : 'Pay & request') + '</button></div>';

    root.querySelector('#pay').onclick = async () => {
      const name = root.querySelector('#nm').value.trim(), phone = root.querySelector('#ph').value.replace(/\D/g, '');
      const time = leg ? leg.time : root.querySelector('#tm').value;
      if (!time) return U.toast('Pick another date: no departure time left today');
      if (!name) return U.toast('Enter your name');
      if (phone.length !== 10) return U.toast('Enter a 10-digit mobile number');
      const ok = await pay(q.money.payNow, (leg ? 'Return car ' : 'Hire ') + v.name + ', ' + pname(h.from) + ' → ' + pname(h.to));
      if (!ok) return;
      try {
        const b = A.requestHire({ from: h.from, to: h.to, date: h.date, time, vehicle: h.vehicle, tripType: h.tripType, days: h.days,
          pickup: root.querySelector('#pk').value, lead: { name, phone }, pax: Number(root.querySelector('#px').value), legId: h.legId });
        B.hireSel = null;
        B.go('#/ticket/' + b.id + '?new=1');
      } catch (e) { U.toast(e.message); }
    };
  });

  // ---------- my trips ----------
  B.route(/^\/trips$/, 'travel', (root, _, q) => {
    const tab = q.get('tab') || 'upcoming';
    const all = A.bookings();
    const groups = {
      upcoming: all.filter((b) => (b.status === 'confirmed' || b.status === 'requested') && A.daysFrom(b.date) >= 0),
      past: all.filter((b) => b.status === 'completed' || ((b.status === 'confirmed' || b.status === 'requested') && A.daysFrom(b.date) < 0)),
      cancelled: all.filter((b) => b.status === 'cancelled')
    };
    const list = groups[tab];
    root.innerHTML = '<h1>My trips</h1>' +
      '<div class="seg" style="margin:14px 0">' + ['upcoming', 'past', 'cancelled'].map((k) => '<button data-tab="' + k + '" class="' + (k === tab ? 'on' : '') + '">' + k[0].toUpperCase() + k.slice(1) + (groups[k].length ? ' (' + groups[k].length + ')' : '') + '</button>').join('') + '</div>' +
      (list.length ? list.map((b) => {
        const v = A.data.vehicles[b.vehicle]; const d = b.driverId && A.driverById(b.driverId);
        const blocked = A.blocks().some((x) => x.routeId === b.routeId && x.date === b.date);
        return '<a class="bk" href="#/ticket/' + b.id + '"><div class="row between"><b>' + esc(pname(b.from)) + ' → ' + esc(pname(b.to)) + '</b>' + U.statusTag(b) + '</div>' +
          '<div class="small muted" style="margin-top:4px">' + esc(dateLabel(b.date)) + ' · ' + t12(b.time) + ' · ' + esc(v.name) + (b.kind === 'seat' ? ' · seat ' + b.seats.join(', ') : ' · full vehicle') + '</div>' +
          (d ? '<div class="small" style="margin-top:4px">' + esc(d.name) + ' · <span class="plate">' + esc(d.vehicleNo) + '</span></div>' : '') +
          (blocked && b.status !== 'cancelled' ? '<div class="tag bad" style="margin-top:8px">Road closed on this date</div>' : '') + '</a>';
      }).join('') : '<div class="card flat center"><p class="muted">' + (tab === 'upcoming' ? 'No upcoming trips.' : 'Nothing here yet.') + '</p>' + (tab === 'upcoming' ? '<a class="btn" href="#/">Book a trip</a>' : '') + '</div>');
    root.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => B.go('#/trips?tab=' + b.dataset.tab));
  }, true);

  // ---------- ticket ----------
  B.route(/^\/ticket\/(.+)$/, 'travel', (root, [id], q) => {
    const b = A.booking(id);
    if (!b) { root.innerHTML = '<div class="card">Ticket not found. <a href="#/trips">My trips</a></div>'; return; }
    const v = A.data.vehicles[b.vehicle];
    const d = b.driverId && A.driverById(b.driverId);
    const block = A.blocks().find((x) => x.routeId === b.routeId && x.date === b.date);
    const active = b.status === 'confirmed' || b.status === 'requested';
    const share = 'Batoi ticket ' + b.id + ': ' + pname(b.from) + ' → ' + pname(b.to) + ', ' + dateLabel(b.date, true) + ' ' + t12(b.time) +
      (d ? ', ' + v.name + ' ' + d.vehicleNo + ', driver ' + d.name + ' ' + d.phone : '') + (b.seats.length ? ', seats ' + b.seats.join(' ') : '') + ', pickup ' + b.pickup + '.';

    root.innerHTML =
      '<a href="#/trips" class="small">← My trips</a>' +
      (q.get('new') ? '<div class="banner good" style="margin-top:10px"><span>✓</span><div><b>' + (b.status === 'requested' ? 'Request sent' : 'Booking confirmed') + '</b><br>' +
        (b.status === 'requested' ? 'We will notify you when a driver accepts.' : 'Ticket sent by SMS and WhatsApp to ' + esc(b.lead.phone) + ' (demo).') + '</div></div>' : '') +
      (block && active ? '<div class="banner bad" style="margin-top:10px"><span>⛔</span><div><b>Road closed on this date</b><br>' + esc(block.reason) + '. Cancel for a full refund including the fee, or wait for the road to reopen.</div></div>' : '') +
      '<div class="ticket" style="margin-top:12px"><div class="t-top"><div class="row between"><span class="small muted">' + esc(b.id) + '</span>' + U.statusTag(b) + '</div>' +
        '<div class="row between" style="margin-top:10px"><div><div class="city">' + esc(pname(b.from).replace(/ \(.*/, '')) + '</div><div class="small muted">' + t12(b.time) + '</div></div><div style="font-size:22px">→</div>' +
        '<div style="text-align:right"><div class="city">' + esc(pname(b.to).replace(/ \(.*/, '')) + '</div><div class="small muted">' + esc(dateLabel(b.date, true)) + '</div></div></div></div>' +
        '<div class="t-body"><div class="kv"><div><span>Pickup</span><b>' + esc(b.pickup) + '</b></div><div><span>' + (b.kind === 'seat' ? 'Seats' : 'Booking') + '</span><b>' + (b.kind === 'seat' ? b.seats.join(', ') : 'Full ' + esc(v.short) + (b.tripType === 'round' ? ', round ' + b.days + 'd' : ', one way')) + '</b></div>' +
          '<div><span>Passenger' + ((b.pax && b.pax.length > 1) || b.pax > 1 ? 's' : '') + '</span><b>' + esc(Array.isArray(b.pax) ? b.pax.join(', ') : b.lead.name + (b.pax > 1 ? ' +' + (b.pax - 1) : '')) + '</b></div><div><span>Vehicle</span><b>' + esc(v.name) + '</b></div></div></div>' +
        '<div class="perf"></div>' +
        '<div class="t-body">' + (b.status === 'confirmed' ? '<div class="row between"><div><div class="small muted">Boarding OTP · show to driver</div><div class="otp">' + b.otp + '</div></div>' +
            '<div style="text-align:right"><div class="small muted">Pay driver</div><div style="font:700 20px var(--display)">' + money(b.balance) + '</div></div></div>'
          : b.status === 'requested' ? '<div class="center"><b>Finding your driver…</b><div class="small muted">Verified ' + esc(v.short) + ' drivers are seeing your request.</div>' +
            '<p class="demo-note" style="margin-top:10px">Demo: open <b>Drive</b> at the top, log in as any ' + esc(v.short) + ' driver and accept it under Requests.</p></div>'
          : b.status === 'cancelled' ? '<div class="small">Cancelled. Refund <b>' + money(b.refund || 0) + '</b> to your UPI in 3–5 working days.</div>'
          : '<div class="small">Trip completed. Thanks for travelling with Batoi.</div>') + '</div></div>' +
      (d ? '<div class="section-title"><h2>Your driver</h2></div><div class="card">' + U.driverMini(d, v) +
        (active ? '<div class="row" style="margin-top:12px"><a class="btn soft sm grow" href="tel:' + esc(d.phone.replace(/\s/g, '')) + '">' + U.ICON.phone + ' Call</a><a class="btn ghost sm grow" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(share) + '">Share trip</a></div>' : '') + '</div>' : '') +
      (b.status === 'confirmed' || b.status === 'completed' ? '<div class="section-title"><h2>Live tracking</h2><span class="tiny muted" id="trk-note"></span></div><div class="card" id="trk"></div>' : '') +
      (b.status === 'completed' ? '<div class="section-title"><h2>Rate your trip</h2></div><div class="card center">' + [1, 2, 3, 4, 5].map((s) => '<button class="btn ghost sm" data-rate="' + s + '" style="font-size:20px;padding:6px 10px;' + (b.rating >= s ? 'color:var(--accent)' : 'color:var(--muted)') + '">★</button>').join(' ') + (b.rating ? '<p class="small muted">Thanks for rating ' + b.rating + '/5</p>' : '') + '</div>' : '') +
      '<div class="section-title"><h2>Payment</h2></div><div class="card"><table class="fare"><tr><td>Fare</td><td>' + money(b.fare) + '</td></tr><tr><td>Paid online (advance + fee)</td><td>' + money(b.payNow) + '</td></tr><tr><td>Pay driver</td><td>' + money(b.balance) + '</td></tr>' +
        (b.status === 'cancelled' ? '<tr><td>Refund</td><td>' + money(b.refund || 0) + '</td></tr>' : '') + '</table></div>' +
      (active && A.tripStatus(b.kind === 'hire' ? b.id : b.tripId).status === 'scheduled' ? '<button class="btn danger block" id="cancel" style="margin-top:16px">Cancel booking</button>' : '');

    function drawTrack() {
      const el = root.querySelector('#trk'); if (!el) return;
      const tr = A.tracking(b);
      const n = tr.stops.length;
      const pct = tr.progress * 100;
      root.querySelector('#trk-note').textContent = tr.status === 'started' ? 'Demo: 1 min = 1 hr' : '';
      el.innerHTML = (tr.status === 'scheduled' ? '<p class="small muted" style="margin:0 0 10px">Tracking starts when the driver starts the trip.</p>'
          : tr.status === 'started' ? '<p class="small" style="margin:0 0 10px"><b>On the way</b> · arriving in about ' + dur(Math.max(1, tr.etaMin)) + '</p>' : '<p class="small" style="margin:0 0 10px"><b>Arrived</b></p>') +
        '<div class="track"><div class="rail"><i style="height:' + pct + '%"></i></div>' +
        (tr.status === 'started' ? '<span class="bus" style="top:calc(' + pct + '% * .92 + 10px)">🚙</span>' : '') +
        tr.stops.map((s, i) => '<div class="stop ' + (i / (n - 1) <= tr.progress && tr.status !== 'scheduled' ? 'done ' : '') + (i === 0 || i === n - 1 ? 'end' : '') + '">' + esc(s) + '</div>').join('') + '</div>';
    }
    drawTrack();
    const iv = setInterval(drawTrack, 2000);

    root.querySelectorAll('[data-rate]').forEach((x) => x.onclick = () => { A.rateBooking(b.id, Number(x.dataset.rate)); B.go('#/ticket/' + b.id); });
    const c = root.querySelector('#cancel');
    if (c) c.onclick = async () => {
      const r = A.refundFor(b);
      if (await U.confirmSheet('Cancel this booking?', esc(r.rule) + '.<br><br>Refund: <b>' + money(r.amount) + '</b>', 'Yes, cancel', true)) {
        A.cancelBooking(b.id); U.toast('Cancelled. Refund ' + money(r.amount)); B.go('#/ticket/' + b.id);
      }
    };
    return () => clearInterval(iv);
  }, true);

  // ---------- alerts ----------
  B.route(/^\/alerts$/, 'travel', (root) => {
    const ns = A.notes();
    root.innerHTML = '<h1>Alerts</h1><p class="small muted">Booking updates, driver details and road closures.</p>' +
      (ns.length ? '<div class="card" style="padding-top:4px;padding-bottom:4px">' + ns.map((n) => '<div class="note ' + (n.read ? '' : 'unread') + '"><div class="grow"><div class="small">' + (n.read ? '' : '<b>● </b>') + esc(n.text) + '</div>' +
        '<div class="tiny muted">' + new Date(n.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + '</div></div>' +
        (n.bookingId ? '<a class="small" href="#/ticket/' + n.bookingId + '">View</a>' : '') + '</div>').join('') + '</div>'
        : '<div class="card flat center muted">No alerts yet.</div>');
    if (A.unread()) setTimeout(() => A.markRead(), 1500);
  });
})();
