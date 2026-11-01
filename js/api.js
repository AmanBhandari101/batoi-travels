// Batoi Travels — data layer.
// Everything the screens need goes through window.BatoiAPI. In v1 it is backed by
// localStorage + generated demo trips; a real backend replaces only this file.

window.BatoiAPI = (function () {
  const D = window.BATOI_DATA;
  const KEY = 'batoi.v1';

  const RULES = {
    commission: 0.10,     // Batoi keeps 10% of the fare
    advancePct: 0.20,     // traveller pays 20% online, rest to the driver
    minAdvance: 100,
    fee: 25,              // convenience fee per booking
    returnSeatOff: 0.25,  // return-trip seat deal
    returnHireOff: 0.40,  // empty car going home
    nightAllowance: 600,  // per extra day on round-trip hire
    demoSpeed: 60         // tracking demo: 1 real minute = 1 hour on the road
  };

  // ---------- storage ----------
  function fresh() {
    return { bookings: [], tripState: {}, customTrips: [], blocks: [], driverStatus: {},
             newDrivers: [], surge: {}, notes: [], declined: {}, profile: { name: '', phone: '' } };
  }
  let mem = null;
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return Object.assign(fresh(), s); } catch (e) {}
    return mem || fresh();
  }
  let S = load();
  function save() {
    mem = S;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('batoi:change'));
  }
  // Another tab (e.g. driver app open separately) changed the data.
  window.addEventListener('storage', (e) => { if (e.key === KEY) { S = load(); window.dispatchEvent(new CustomEvent('batoi:change')); } });

  // ---------- helpers ----------
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => ymd(new Date());
  const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const daysFrom = (s) => Math.round((parseYmd(s) - parseYmd(today())) / 86400000);
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fromMin = (m) => { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  const round10 = (x) => Math.round(x / 10) * 10;
  const round100 = (x) => Math.round(x / 100) * 100;
  const departAt = (date, time) => { const d = parseYmd(date); const m = toMin(time); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; };
  const uid = (p) => p + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase();

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = hash(seed); return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const place = (id) => D.places[id];
  const routeById = (id) => D.routes.find((r) => r.id === id);
  function findRoute(from, to) {
    for (const r of D.routes) {
      if (r.a === from && r.b === to) return { route: r, dir: 'ab' };
      if (r.b === from && r.a === to) return { route: r, dir: 'ba' };
    }
    return null;
  }
  const ends = (r, dir) => (dir === 'ab' ? { from: r.a, to: r.b } : { from: r.b, to: r.a });
  const viaFor = (r, dir) => (dir === 'ab' ? r.via.slice() : r.via.slice().reverse());

  // ---------- drivers ----------
  function drivers() {
    return D.drivers.map((d) => Object.assign({}, d, S.driverStatus[d.id] ? { status: S.driverStatus[d.id] } : {}))
      .concat(S.newDrivers.map((d) => Object.assign({}, d, S.driverStatus[d.id] ? { status: S.driverStatus[d.id] } : {})));
  }
  const driverById = (id) => drivers().find((d) => d.id === id);

  // ---------- schedules (fixed daily departures) ----------
  const SCHEDULES = (function build() {
    const out = D.schedules.map((s) => Object.assign({ id: s.route + '-' + s.dir + '-' + s.time.replace(':', '') }, s));
    const handMade = new Set(D.schedules.map((s) => s.route));
    const times = ['05:00', '06:00', '07:00', '08:30', '10:00', '12:00', '14:30'];
    const vtypes = ['bolero', 'bolero', 'tempo', 'ertiga', 'innova', 'dzire'];
    const approved = D.drivers.filter((d) => d.status === 'approved');
    D.routes.forEach((r) => {
      if (handMade.has(r.id)) return;
      ['ab', 'ba'].forEach((dir) => {
        const R = rng(r.id + dir);
        const n = r.busy * 2 + (dir === 'ab' ? 1 : 0);
        const picked = times.slice().sort(() => R() - 0.5).slice(0, n).sort();
        picked.forEach((time, i) => {
          const vehicle = vtypes[Math.floor(R() * vtypes.length)];
          const pool = approved.filter((d) => d.vehicle === vehicle);
          const drv = (pool.length ? pool : approved)[Math.floor(R() * (pool.length || approved.length))];
          out.push({ id: r.id + '-' + dir + '-' + time.replace(':', ''), route: r.id, dir, time, vehicle, driver: drv.id,
                     ret: dir === 'ba' && i === picked.length - 1 });
        });
      });
    });
    return out;
  })();

  // ---------- trips ----------
  function seatPrice(r, vehicle, ret) {
    const surge = (S.surge[r.id] || 0) / 100;
    const base = round10(r.km * D.vehicles[vehicle].seatRate * (1 + surge));
    return ret ? round10(base * (1 - RULES.returnSeatOff)) : base;
  }
  function makeTrip(s, date) {
    const r = routeById(s.route);
    const e = ends(r, s.dir);
    const drv = driverById(s.driver);
    // A driver suspended by admin takes their scheduled trips off sale.
    if (!drv || drv.status !== 'approved') return null;
    return { id: s.id + '@' + date, sched: s.id, routeId: r.id, dir: s.dir, from: e.from, to: e.to, date, time: s.time,
             arrive: fromMin(toMin(s.time) + r.mins), mins: r.mins, km: r.km, vehicle: s.vehicle, driverId: s.driver,
             ret: !!s.ret, custom: !!s.custom, price: s.price || seatPrice(r, s.vehicle, s.ret), fullPrice: seatPrice(r, s.vehicle, false) };
  }
  function tripsOn(date, routeId, dir) {
    const list = [];
    SCHEDULES.forEach((s) => {
      if (routeId && (s.route !== routeId || s.dir !== dir)) return;
      const t = makeTrip(s, date); if (t) list.push(t);
    });
    S.customTrips.forEach((c) => {
      if (c.date !== date) return;
      if (routeId && (c.route !== routeId || c.dir !== dir)) return;
      const t = makeTrip(Object.assign({}, c, { custom: true }), date); if (t) { t.id = c.id; list.push(t); }
    });
    return list.sort((a, b) => toMin(a.time) - toMin(b.time));
  }
  function getTrip(id) {
    if (!id) return null;
    const c = S.customTrips.find((x) => x.id === id);
    if (c) { const t = makeTrip(Object.assign({}, c, { custom: true }), c.date); if (t) t.id = c.id; return t; }
    const [sid, date] = id.split('@');
    const s = SCHEDULES.find((x) => x.id === sid);
    return s && date ? makeTrip(s, date) : null;
  }

  // Seats already sold to other (simulated) travellers, so the demo looks lived-in.
  const NAMES = ['Priya S.', 'Amit K.', 'Neha R.', 'Rohit B.', 'Kavita N.', 'Sanjay P.', 'Pooja M.', 'Arjun T.',
                 'Meena D.', 'Vivek G.', 'Anjali C.', 'Rakesh J.', 'Sneha V.', 'Karan L.', 'Divya H.', 'Tarun A.'];
  function prebooked(trip) {
    if (trip.custom) return [];
    const v = D.vehicles[trip.vehicle];
    const R = rng(trip.id);
    const ahead = Math.max(0, daysFrom(trip.date));
    const fill = Math.max(0.05, 0.8 - ahead * 0.09) * (0.45 + R());
    const n = Math.min(v.seats, Math.floor(fill * v.seats));
    const ids = seatIds(trip.vehicle).sort(() => R() - 0.5).slice(0, n);
    return ids.map((seat, i) => ({ seat, name: NAMES[(hash(trip.id) + i) % NAMES.length], pickup: place(trip.from).pickups[i % place(trip.from).pickups.length] }));
  }
  const seatIds = (vehicle) => D.vehicles[vehicle].layout.flat().filter((c) => c && c !== 'D');
  const tstate = (key) => S.tripState[key] || { walkins: [], status: 'scheduled', boarded: [] };

  // seat -> 'mine' | 'app' | 'stand'
  function seatMap(trip) {
    const m = {};
    prebooked(trip).forEach((p) => { m[p.seat] = 'app'; });
    tstate(trip.id).walkins.forEach((s) => { m[s] = 'stand'; });
    S.bookings.forEach((b) => { if (b.tripId === trip.id && b.status !== 'cancelled') b.seats.forEach((s) => { m[s] = 'mine'; }); });
    return m;
  }
  function freeSeats(trip) { const m = seatMap(trip); return seatIds(trip.vehicle).filter((s) => !m[s]); }

  function blockFor(routeId, date) { return S.blocks.find((b) => b.routeId === routeId && b.date === date) || null; }

  function decorate(t) {
    const v = D.vehicles[t.vehicle];
    const free = freeSeats(t).length;
    const dep = departAt(t.date, t.time);
    return Object.assign({}, t, { v, driver: driverById(t.driverId), free, seats: v.seats,
      departed: dep < new Date() || tstate(t.id).status !== 'scheduled', blocked: blockFor(t.routeId, t.date) });
  }

  function search(from, to, date, pax) {
    const fr = findRoute(from, to);
    if (!fr) return { route: null, trips: [] };
    const trips = tripsOn(date, fr.route.id, fr.dir).map(decorate);
    return { route: fr.route, dir: fr.dir, via: viaFor(fr.route, fr.dir), block: blockFor(fr.route.id, date), trips,
             pax: pax || 1 };
  }
  function dateStrip(from, to, start, n) {
    const fr = findRoute(from, to); const out = [];
    for (let i = 0; i < n; i++) {
      const date = addDays(start, i);
      let lowest = null, count = 0;
      if (fr) tripsOn(date, fr.route.id, fr.dir).map(decorate).forEach((t) => {
        if (t.departed || t.blocked || t.free === 0) return;
        count++; lowest = lowest == null ? t.price : Math.min(lowest, t.price);
      });
      out.push({ date, count, lowest, blocked: fr ? !!blockFor(fr.route.id, date) : false });
    }
    return out;
  }
  function destinationsFrom(from) {
    const out = [];
    D.routes.forEach((r) => { if (r.a === from) out.push(r.b); if (r.b === from) out.push(r.a); });
    return out;
  }

  // ---------- money ----------
  function split(fare) {
    const advance = Math.min(fare, Math.max(RULES.minAdvance, round10(fare * RULES.advancePct)));
    return { fare, advance, fee: RULES.fee, payNow: advance + RULES.fee, balance: fare - advance,
             commission: Math.round(fare * RULES.commission) };
  }
  function seatFare(trip, seats) {
    return seats.reduce((s, id) => s + trip.price + (id === 'F1' ? D.FRONT_SEAT_EXTRA : 0), 0);
  }
  const otp = () => String(1000 + Math.floor(Math.random() * 9000));

  function note(text, bookingId) {
    S.notes.unshift({ id: uid('N'), at: Date.now(), text, bookingId: bookingId || null, read: false });
  }

  // ---------- traveller: seat booking ----------
  function bookSeats({ tripId, seats, pickup, lead, pax }) {
    const t = getTrip(tripId);
    if (!t) throw new Error('Trip not found');
    const d = decorate(t);
    if (d.blocked) throw new Error('This route is closed on this date');
    if (d.departed) throw new Error('This trip has already left');
    const free = new Set(freeSeats(t));
    seats.forEach((s) => { if (!free.has(s)) throw new Error('Seat ' + s + ' was just taken. Pick another.'); });
    const money = split(seatFare(t, seats));
    const b = Object.assign({ id: uid('BT'), kind: 'seat', tripId, routeId: t.routeId, dir: t.dir, from: t.from, to: t.to,
      date: t.date, time: t.time, vehicle: t.vehicle, driverId: t.driverId, seats, pickup, lead, pax,
      status: 'confirmed', otp: otp(), createdAt: Date.now(), ret: t.ret }, money);
    S.bookings.unshift(b);
    S.profile = { name: lead.name, phone: lead.phone };
    note('Booked ' + seats.length + ' seat' + (seats.length > 1 ? 's' : '') + ' ' + place(t.from).name + ' → ' + place(t.to).name +
         ', ' + t.date + ' ' + t.time + '. Ticket ' + b.id + '.', b.id);
    save();
    return b;
  }

  // ---------- traveller: full vehicle hire ----------
  function hireQuotes(from, to, date, tripType, days) {
    const fr = findRoute(from, to);
    if (!fr) return { route: null, quotes: [], returnLegs: [] };
    const r = fr.route, surge = 1 + (S.surge[r.id] || 0) / 100;
    days = Math.max(1, days || 1);
    const quotes = Object.keys(D.vehicles).map((k) => {
      const v = D.vehicles[k];
      const fare = tripType === 'round'
        ? round100(r.km * 2 * v.hireRate * surge + RULES.nightAllowance * (days - 1))
        : round100(r.km * v.hireRate * 1.5 * surge); // one-way includes the empty run home
      return { vehicle: k, v, fare, money: split(fare) };
    }).sort((a, b) => a.fare - b.fare);

    // Cars that finished a trip at `from` and are driving home to `to` empty.
    const returnLegs = [];
    if (tripType !== 'round') {
      const R = rng('ret' + r.id + fr.dir + date);
      drivers().filter((d) => d.status === 'approved' && d.base === to).forEach((d) => {
        if (R() < 0.35) return;
        const time = fromMin(600 + Math.floor(R() * 14) * 30);
        const legId = 'RL-' + d.id + '-' + r.id + fr.dir + '-' + date;
        if (S.bookings.some((b) => b.legId === legId && b.status !== 'cancelled')) return;
        if (departAt(date, time) < new Date()) return;
        const full = round100(r.km * D.vehicles[d.vehicle].hireRate * 1.5 * surge);
        const fare = round100(full * (1 - RULES.returnHireOff));
        returnLegs.push({ legId, driver: d, vehicle: d.vehicle, v: D.vehicles[d.vehicle], time, fare, full, money: split(fare) });
      });
    }
    return { route: r, dir: fr.dir, quotes, returnLegs, block: blockFor(r.id, date), days, tripType };
  }

  function requestHire({ from, to, date, time, vehicle, tripType, days, pickup, lead, pax, legId }) {
    const q = hireQuotes(from, to, date, tripType, days);
    if (!q.route) throw new Error('No route');
    if (q.block) throw new Error('This route is closed on this date');
    let fare, driverId = null, status = 'requested';
    if (legId) {
      const leg = q.returnLegs.find((l) => l.legId === legId);
      if (!leg) throw new Error('That return car was just booked by someone else');
      fare = leg.fare; driverId = leg.driver.id; vehicle = leg.vehicle; time = leg.time; status = 'confirmed';
    } else {
      fare = q.quotes.find((x) => x.vehicle === vehicle).fare;
    }
    const b = Object.assign({ id: uid('BH'), kind: 'hire', tripType, days: tripType === 'round' ? days : 1, legId: legId || null,
      routeId: q.route.id, dir: q.dir, from, to, date, time, vehicle, driverId, seats: [], pickup, lead, pax,
      status, otp: otp(), createdAt: Date.now(), ret: !!legId }, split(fare));
    S.bookings.unshift(b);
    S.profile = { name: lead.name, phone: lead.phone };
    note(legId ? 'Return car booked: ' + D.vehicles[vehicle].name + ' with ' + driverById(driverId).name + '. Ticket ' + b.id + '.'
               : 'Request sent for a ' + D.vehicles[vehicle].name + '. We will confirm as soon as a driver accepts.', b.id);
    save();
    return b;
  }

  // ---------- traveller: my bookings ----------
  function bookings() { return S.bookings.slice(); }
  function booking(id) { return S.bookings.find((b) => b.id === id) || null; }
  function refundFor(b) {
    const block = blockFor(b.routeId, b.date);
    if (block) return { amount: b.payNow, rule: 'Route closed by admin: full refund including fee' };
    if (b.status === 'requested') return { amount: b.payNow, rule: 'No driver yet: full refund' };
    const hrs = (departAt(b.date, b.time) - new Date()) / 3600000;
    if (hrs > 24) return { amount: b.advance, rule: 'More than 24 h before departure: advance refunded (fee kept)' };
    if (hrs > 6) return { amount: Math.round(b.advance / 2), rule: '6–24 h before departure: half the advance refunded' };
    return { amount: 0, rule: 'Less than 6 h before departure: no refund' };
  }
  function cancelBooking(id) {
    const b = booking(id);
    if (!b || b.status === 'cancelled' || b.status === 'completed') throw new Error('Cannot cancel this booking');
    const r = refundFor(b);
    b.status = 'cancelled'; b.refund = r.amount; b.cancelledAt = Date.now();
    note('Ticket ' + b.id + ' cancelled. Refund ₹' + r.amount + ' to your UPI in 3–5 days.', b.id);
    save();
    return r;
  }
  function tracking(b) {
    const key = b.kind === 'hire' ? b.id : b.tripId;
    const st = tstate(key);
    const r = routeById(b.routeId);
    const stops = [place(b.from).name].concat(viaFor(r, b.dir), [place(b.to).name]);
    if (st.status === 'scheduled') return { status: 'scheduled', stops, progress: 0 };
    if (st.status === 'completed') return { status: 'completed', stops, progress: 1 };
    const elapsedSec = (Date.now() - st.startedAt) / 1000;
    const simMin = elapsedSec / 60 * RULES.demoSpeed;
    const progress = Math.min(1, simMin / r.mins);
    return { status: 'started', stops, progress, etaMin: Math.max(0, Math.round(r.mins - simMin)), boarded: (st.boarded || []).includes(b.id) };
  }
  function notes() { return S.notes.slice(); }
  function unread() { return S.notes.filter((n) => !n.read).length; }
  function markRead() { S.notes.forEach((n) => { n.read = true; }); save(); }
  function profile() { return Object.assign({}, S.profile); }

  // ---------- driver ----------
  function driverTrips(driverId, days) {
    const out = [];
    for (let i = 0; i < (days || 7); i++) {
      const date = addDays(today(), i);
      tripsOn(date).forEach((t) => { if (t.driverId === driverId) out.push(decorate(t)); });
    }
    return out.filter((t) => tstate(t.id).status !== 'completed' || t.date === today());
  }
  function driverHires(driverId) {
    return S.bookings.filter((b) => b.kind === 'hire' && b.driverId === driverId && b.status !== 'cancelled' && daysFrom(b.date) >= 0);
  }
  function openRequests(driverId) {
    const d = driverById(driverId);
    const declined = S.declined[driverId] || [];
    return S.bookings.filter((b) => b.kind === 'hire' && b.status === 'requested' && b.vehicle === d.vehicle && !declined.includes(b.id));
  }
  function acceptHire(bookingId, driverId) {
    const b = booking(bookingId);
    if (!b || b.status !== 'requested') throw new Error('Already taken by another driver');
    b.status = 'confirmed'; b.driverId = driverId;
    const d = driverById(driverId);
    note('Driver confirmed for ' + b.id + ': ' + d.name + ', ' + D.vehicles[d.vehicle].name + ' ' + d.vehicleNo + '.', b.id);
    save();
  }
  function declineHire(bookingId, driverId) {
    (S.declined[driverId] = S.declined[driverId] || []).push(bookingId); save();
  }
  function manifest(tripId) {
    const t = getTrip(tripId);
    if (!t) return [];
    const st = tstate(tripId);
    const rows = prebooked(t).map((p) => ({ seat: p.seat, name: p.name, pickup: p.pickup, source: 'Batoi', boarded: st.status !== 'scheduled' }));
    S.bookings.filter((b) => b.tripId === tripId && b.status !== 'cancelled').forEach((b) => {
      b.seats.forEach((s, i) => rows.push({ seat: s, name: (b.pax && b.pax[i]) || b.lead.name, pickup: b.pickup, source: 'Batoi',
        bookingId: b.id, phone: b.lead.phone, balance: i === 0 ? b.balance : 0, boarded: (st.boarded || []).includes(b.id) }));
    });
    st.walkins.forEach((s) => rows.push({ seat: s, name: 'Walk-in at stand', source: 'Stand', boarded: true }));
    const order = seatIds(t.vehicle);
    return rows.sort((a, b) => order.indexOf(a.seat) - order.indexOf(b.seat));
  }
  function setTripState(key, fn) { const st = JSON.parse(JSON.stringify(tstate(key))); fn(st); S.tripState[key] = st; save(); }
  function toggleWalkin(tripId, seat) {
    const t = getTrip(tripId); const m = seatMap(t);
    if (m[seat] === 'app' || m[seat] === 'mine') throw new Error('Seat ' + seat + ' is booked on Batoi');
    setTripState(tripId, (st) => { const i = st.walkins.indexOf(seat); if (i >= 0) st.walkins.splice(i, 1); else st.walkins.push(seat); });
  }
  function startTrip(key) {
    setTripState(key, (st) => { st.status = 'started'; st.startedAt = Date.now(); });
    S.bookings.forEach((b) => { if ((b.tripId === key || b.id === key) && b.status === 'confirmed') note('Your vehicle has left for ' + place(b.to).name + '. Track it live in My trips.', b.id); });
    save();
  }
  function verifyOtp(key, code) {
    const b = S.bookings.find((x) => (x.tripId === key || x.id === key) && x.status === 'confirmed' && x.otp === String(code).trim());
    if (!b) return null;
    setTripState(key, (st) => { if (!st.boarded.includes(b.id)) st.boarded.push(b.id); });
    return b;
  }
  function completeTrip(key) {
    setTripState(key, (st) => { st.status = 'completed'; st.completedAt = Date.now(); });
    S.bookings.forEach((b) => {
      if ((b.tripId === key || b.id === key) && b.status === 'confirmed') { b.status = 'completed'; note('Reached ' + place(b.to).name + '. Rate your trip with ' + driverById(b.driverId).name + '.', b.id); }
    });
    save();
  }
  function tripStatus(key) { return tstate(key); }
  function rateBooking(id, stars) { const b = booking(id); if (b) { b.rating = stars; save(); } }

  function postTrip(driverId, { routeId, dir, date, time, price, repeat, ret }) {
    const d = driverById(driverId);
    const r = routeById(routeId);
    const ids = [];
    for (let i = 0; i < Math.max(1, repeat || 1); i++) {
      const c = { id: uid('C'), route: routeId, dir, date: addDays(date, i), time, vehicle: d.vehicle, driver: driverId,
                  ret: !!ret, price: price ? Number(price) : null };
      if (!c.price) delete c.price;
      S.customTrips.push(c); ids.push(c.id);
    }
    save();
    return ids;
  }
  function suggestedPrice(routeId, vehicle, ret) { return seatPrice(routeById(routeId), vehicle, ret); }
  function earnings(driverId) {
    let gross = 0, cash = 0, count = 0;
    S.bookings.forEach((b) => {
      if (b.driverId !== driverId || b.status === 'cancelled') return;
      count++; gross += b.fare - b.commission; cash += b.balance;
    });
    return { count, gross, cash, payout: gross - cash };
  }
  function registerDriver(info) {
    const d = Object.assign({ id: uid('D'), rating: 0, trips: 0, since: new Date().getFullYear(), status: 'pending', operator: 'Self' }, info);
    S.newDrivers.push(d); save();
    return d;
  }

  // ---------- admin ----------
  function stats() {
    const live = S.bookings.filter((b) => b.status !== 'cancelled');
    const gmv = live.reduce((s, b) => s + b.fare, 0);
    const ds = drivers();
    const byRoute = {};
    live.forEach((b) => { byRoute[b.routeId] = (byRoute[b.routeId] || 0) + 1; });
    return { bookings: S.bookings.length, live: live.length, cancelled: S.bookings.length - live.length,
      requested: S.bookings.filter((b) => b.status === 'requested').length,
      gmv, commission: live.reduce((s, b) => s + b.commission, 0), fees: live.length * RULES.fee,
      advances: live.reduce((s, b) => s + b.payNow, 0),
      refunds: S.bookings.reduce((s, b) => s + (b.refund || 0), 0),
      driversApproved: ds.filter((d) => d.status === 'approved').length,
      driversPending: ds.filter((d) => d.status === 'pending').length, byRoute,
      blocks: S.blocks.filter((b) => daysFrom(b.date) >= 0).length };
  }
  function setDriverStatus(id, status) { S.driverStatus[id] = status; save(); }
  function blockRoute(routeId, date, reason) {
    if (blockFor(routeId, date)) return;
    S.blocks.push({ routeId, date, reason, at: Date.now() });
    const r = routeById(routeId);
    S.bookings.forEach((b) => {
      if (b.routeId === routeId && b.date === date && (b.status === 'confirmed' || b.status === 'requested'))
        note('⚠ ' + place(r.a).name + '–' + place(r.b).name + ' road closed on ' + date + ' (' + reason + '). Cancel ' + b.id + ' for a full refund or pick another date.', b.id);
    });
    save();
  }
  function unblockRoute(routeId, date) {
    S.blocks = S.blocks.filter((b) => !(b.routeId === routeId && b.date === date));
    S.bookings.forEach((b) => { if (b.routeId === routeId && b.date === date && b.status === 'confirmed') note('Road open again for ' + date + '. Ticket ' + b.id + ' stands.', b.id); });
    save();
  }
  function blocks() { return S.blocks.slice().sort((a, b) => a.date.localeCompare(b.date)); }
  function setSurge(routeId, pct) { S.surge[routeId] = Number(pct) || 0; save(); }
  function surge(routeId) { return S.surge[routeId] || 0; }
  function resetDemo() { S = fresh(); mem = null; try { localStorage.removeItem(KEY); } catch (e) {} save(); }

  return {
    RULES, data: D, place, routeById, findRoute, viaFor, drivers, driverById, today, addDays, daysFrom, parseYmd, toMin, fromMin,
    search, dateStrip, destinationsFrom, getTrip, decorate, seatMap, seatIds, freeSeats, seatFare, split,
    bookSeats, hireQuotes, requestHire, bookings, booking, refundFor, cancelBooking, tracking, notes, unread, markRead, profile,
    driverTrips, driverHires, openRequests, acceptHire, declineHire, manifest, toggleWalkin, startTrip, verifyOtp, completeTrip,
    tripStatus, rateBooking, postTrip, suggestedPrice, earnings, registerDriver,
    stats, setDriverStatus, blockRoute, unblockRoute, blocks, setSurge, surge, resetDemo
  };
})();
