// Batoi Travels — demo seed data (Uttarakhand hill routes).
// Distances and times are approximate road figures; drivers, phone numbers and
// vehicle numbers are fictional.

window.BATOI_DATA = (function () {
  const places = {
    rishikesh:  { name: 'Rishikesh',   hi: 'ऋषिकेश',     pickups: ['Natraj Chowk', 'ISBT Rishikesh', 'Tapovan', 'Ram Jhula taxi stand'] },
    dehradun:   { name: 'Dehradun',    hi: 'देहरादून',    pickups: ['ISBT Dehradun', 'Clock Tower', 'Prince Chowk', 'Jolly Grant Airport'] },
    haridwar:   { name: 'Haridwar',    hi: 'हरिद्वार',     pickups: ['Haridwar Railway Station', 'Singh Dwar', 'Har Ki Pauri parking'] },
    uttarkashi: { name: 'Uttarkashi',  hi: 'उत्तरकाशी',   pickups: ['Uttarkashi Bus Stand', 'Gyansu', 'Joshiyara Bridge'] },
    tehri:      { name: 'New Tehri',   hi: 'नई टिहरी',    pickups: ['New Tehri Bus Stand', 'Boradi'] },
    srinagar:   { name: 'Srinagar (Garhwal)', hi: 'श्रीनगर', pickups: ['Srinagar Bus Stand', 'HNB University gate'] },
    rudraprayag:{ name: 'Rudraprayag', hi: 'रुद्रप्रयाग',  pickups: ['Rudraprayag Bus Stand', 'Gulabrai'] },
    sonprayag:  { name: 'Sonprayag (Kedarnath)', hi: 'सोनप्रयाग', pickups: ['Sonprayag Parking', 'Guptkashi Bazar'] },
    joshimath:  { name: 'Joshimath',   hi: 'जोशीमठ',     pickups: ['Joshimath Taxi Stand', 'Auli Road'] },
    badrinath:  { name: 'Badrinath',   hi: 'बद्रीनाथ',     pickups: ['Badrinath Bus Stand'] },
    barkot:     { name: 'Barkot (Yamunotri)', hi: 'बड़कोट', pickups: ['Barkot Bus Stand'] },
    gangotri:   { name: 'Gangotri',    hi: 'गंगोत्री',     pickups: ['Gangotri Taxi Stand'] },
    harsil:     { name: 'Harsil',      hi: 'हर्षिल',      pickups: ['Harsil Market'] },
    mussoorie:  { name: 'Mussoorie',   hi: 'मसूरी',       pickups: ['Library Chowk', 'Picture Palace'] },
    chopta:     { name: 'Chopta',      hi: 'चोपता',       pickups: ['Chopta Road Head'] }
  };

  // a <-> b, both directions are bookable. via = towns on the way (a -> b order).
  const routes = [
    { id: 'r1',  a: 'rishikesh', b: 'uttarkashi', km: 165, mins: 360, via: ['Narendranagar', 'Chamba', 'Chinyalisaur', 'Dharasu'], busy: 3 },
    { id: 'r2',  a: 'dehradun',  b: 'uttarkashi', km: 145, mins: 330, via: ['Chamba', 'Chinyalisaur', 'Dharasu'], busy: 2 },
    { id: 'r3',  a: 'haridwar',  b: 'uttarkashi', km: 190, mins: 400, via: ['Rishikesh', 'Chamba', 'Chinyalisaur'], busy: 1 },
    { id: 'r4',  a: 'rishikesh', b: 'tehri',      km: 75,  mins: 150, via: ['Narendranagar', 'Chamba'], busy: 2 },
    { id: 'r5',  a: 'rishikesh', b: 'srinagar',   km: 105, mins: 210, via: ['Shivpuri', 'Byasi', 'Devprayag'], busy: 2 },
    { id: 'r6',  a: 'rishikesh', b: 'rudraprayag',km: 140, mins: 270, via: ['Byasi', 'Devprayag', 'Srinagar'], busy: 2 },
    { id: 'r7',  a: 'rishikesh', b: 'sonprayag',  km: 210, mins: 450, via: ['Devprayag', 'Srinagar', 'Rudraprayag', 'Guptkashi'], busy: 2 },
    { id: 'r8',  a: 'rishikesh', b: 'joshimath',  km: 255, mins: 540, via: ['Devprayag', 'Srinagar', 'Rudraprayag', 'Karnaprayag', 'Chamoli'], busy: 1 },
    { id: 'r9',  a: 'rishikesh', b: 'badrinath',  km: 295, mins: 630, via: ['Srinagar', 'Rudraprayag', 'Chamoli', 'Joshimath'], busy: 1 },
    { id: 'r10', a: 'dehradun',  b: 'barkot',     km: 130, mins: 300, via: ['Mussoorie', 'Kempty', 'Naugaon'], busy: 1 },
    { id: 'r11', a: 'uttarkashi',b: 'gangotri',   km: 100, mins: 210, via: ['Bhatwari', 'Gangnani', 'Harsil'], busy: 2 },
    { id: 'r12', a: 'dehradun',  b: 'mussoorie',  km: 35,  mins: 75,  via: ['Kolhukhet'], busy: 2 },
    { id: 'r13', a: 'rishikesh', b: 'chopta',     km: 200, mins: 420, via: ['Srinagar', 'Rudraprayag', 'Ukhimath'], busy: 1 },
    { id: 'r14', a: 'uttarkashi',b: 'harsil',     km: 75,  mins: 150, via: ['Bhatwari', 'Gangnani'], busy: 1 }
  ];

  // Seat layouts: rows of cells. 'D' = driver, null = gap, string = seat id.
  // seatRate = ₹/km per shared seat; hireRate = ₹/km for the whole vehicle.
  const vehicles = {
    bolero: { name: 'Bolero / Sumo', short: 'Bolero', kind: 'Shared jeep', seats: 8, seatRate: 3.8, hireRate: 15,
      layout: [['D', null, 'F1'], ['M1', 'M2', 'M3'], ['B1', null, 'B3'], ['B2', null, 'B4']], luggage: 'Roof carrier' },
    tempo:  { name: 'Tempo Traveller', short: 'Tempo', kind: 'Mini bus', seats: 12, seatRate: 3.6, hireRate: 24,
      layout: [['D', null, null, 'F1'], ['1A', '1B', null, '1C'], ['2A', '2B', null, '2C'], ['3A', '3B', null, '3C'], ['4A', null, null, '4B']], luggage: 'Rear boot + roof' },
    ertiga: { name: 'Ertiga', short: 'Ertiga', kind: 'MUV', seats: 6, seatRate: 4.4, hireRate: 14,
      layout: [['D', null, 'F1'], ['M1', 'M2', 'M3'], ['B1', null, 'B2']], luggage: 'Small boot' },
    innova: { name: 'Innova Crysta', short: 'Innova', kind: 'Premium MUV', seats: 7, seatRate: 5.0, hireRate: 18,
      layout: [['D', null, 'F1'], ['M1', 'M2', 'M3'], ['B1', 'B2', 'B3']], luggage: 'Boot + roof carrier' },
    dzire:  { name: 'Swift Dzire', short: 'Dzire', kind: 'Sedan', seats: 4, seatRate: 5.2, hireRate: 12,
      layout: [['D', null, 'F1'], ['M1', 'M2', 'M3']], luggage: 'Boot' }
  };

  // Front seat is the one people ask for on hill roads (less motion sickness).
  const FRONT_SEAT_EXTRA = 50;

  const drivers = [
    { id: 'd1',  name: 'Rajesh Negi',     phone: '+91 90000 11001', vehicle: 'bolero', vehicleNo: 'UK14 TA 2231', operator: 'Negi Jeep Sewa',        rating: 4.8, trips: 1240, since: 2016, base: 'rishikesh',  status: 'approved' },
    { id: 'd2',  name: 'Sunil Rawat',     phone: '+91 90000 11002', vehicle: 'tempo',  vehicleNo: 'UK07 PA 8812', operator: 'Garhwal Travellers',    rating: 4.6, trips: 860,  since: 2018, base: 'rishikesh',  status: 'approved' },
    { id: 'd3',  name: 'Deepak Bisht',    phone: '+91 90000 11003', vehicle: 'innova', vehicleNo: 'UK07 TB 4410', operator: 'Bisht Cabs',            rating: 4.9, trips: 530,  since: 2019, base: 'dehradun',   status: 'approved' },
    { id: 'd4',  name: 'Manoj Panwar',    phone: '+91 90000 11004', vehicle: 'ertiga', vehicleNo: 'UK10 TA 1187', operator: 'Uttarkashi Taxi Union', rating: 4.5, trips: 940,  since: 2017, base: 'uttarkashi', status: 'approved' },
    { id: 'd5',  name: 'Vikram Chauhan',  phone: '+91 90000 11005', vehicle: 'bolero', vehicleNo: 'UK10 TA 3302', operator: 'Uttarkashi Taxi Union', rating: 4.4, trips: 1510, since: 2014, base: 'uttarkashi', status: 'approved' },
    { id: 'd6',  name: 'Harish Semwal',   phone: '+91 90000 11006', vehicle: 'dzire',  vehicleNo: 'UK07 TC 9021', operator: 'Doon Drive',            rating: 4.7, trips: 410,  since: 2020, base: 'dehradun',   status: 'approved' },
    { id: 'd7',  name: 'Pradeep Rana',    phone: '+91 90000 11007', vehicle: 'bolero', vehicleNo: 'UK13 TA 5540', operator: 'Rudra Jeep Sewa',       rating: 4.6, trips: 1120, since: 2015, base: 'rudraprayag',status: 'approved' },
    { id: 'd8',  name: 'Anil Kandari',    phone: '+91 90000 11008', vehicle: 'tempo',  vehicleNo: 'UK07 PB 6619', operator: 'Char Dham Yatra Co.',   rating: 4.5, trips: 720,  since: 2017, base: 'haridwar',   status: 'approved' },
    { id: 'd9',  name: 'Sandeep Thapliyal',phone:'+91 90000 11009', vehicle: 'innova', vehicleNo: 'UK14 TB 7718', operator: 'Himalayan Rides',       rating: 4.8, trips: 380,  since: 2021, base: 'rishikesh',  status: 'approved' },
    { id: 'd10', name: 'Kuldeep Butola',  phone: '+91 90000 11010', vehicle: 'ertiga', vehicleNo: 'UK11 TA 2093', operator: 'Chamoli Cabs',          rating: 4.3, trips: 650,  since: 2018, base: 'joshimath',  status: 'approved' },
    { id: 'd11', name: 'Mohit Joshi',     phone: '+91 90000 11011', vehicle: 'dzire',  vehicleNo: 'UK14 TC 1104', operator: 'Self',                  rating: 0,   trips: 0,    since: 2026, base: 'rishikesh',  status: 'pending' },
    { id: 'd12', name: 'Gaurav Nautiyal', phone: '+91 90000 11012', vehicle: 'bolero', vehicleNo: 'UK10 TA 4471', operator: 'Self',                  rating: 0,   trips: 0,    since: 2026, base: 'uttarkashi', status: 'pending' }
  ];

  // Daily departures. dir 'ab' = a -> b, 'ba' = b -> a. ret = return-trip deal.
  // Rishikesh <-> Uttarkashi is filled by hand (the launch route); the rest are
  // generated in api.js from route.busy.
  const schedules = [
    { route: 'r1', dir: 'ab', time: '05:30', vehicle: 'bolero', driver: 'd1' },
    { route: 'r1', dir: 'ab', time: '06:30', vehicle: 'tempo',  driver: 'd2' },
    { route: 'r1', dir: 'ab', time: '08:00', vehicle: 'ertiga', driver: 'd4', ret: true },
    { route: 'r1', dir: 'ab', time: '09:30', vehicle: 'bolero', driver: 'd5', ret: true },
    { route: 'r1', dir: 'ab', time: '11:00', vehicle: 'innova', driver: 'd9' },
    { route: 'r1', dir: 'ab', time: '14:00', vehicle: 'bolero', driver: 'd1' },
    { route: 'r1', dir: 'ba', time: '06:00', vehicle: 'bolero', driver: 'd5' },
    { route: 'r1', dir: 'ba', time: '07:00', vehicle: 'ertiga', driver: 'd4' },
    { route: 'r1', dir: 'ba', time: '12:30', vehicle: 'bolero', driver: 'd1', ret: true },
    { route: 'r1', dir: 'ba', time: '13:30', vehicle: 'tempo',  driver: 'd2', ret: true },
    { route: 'r1', dir: 'ba', time: '15:00', vehicle: 'innova', driver: 'd9', ret: true }
  ];

  return { places, routes, vehicles, drivers, schedules, FRONT_SEAT_EXTRA };
})();
