# Batoi Travels: v1 prototype

Long-distance hill travel booking for Uttarakhand. It works like redBus for seats in shared jeeps, cabs and Tempo Travellers, plus Uber-style hire of a whole vehicle.

This is a working **click-through prototype**. It runs entirely in the browser on demo data. Payments are simulated and nothing is sent to a server.

## Run it

No build step: it is plain HTML, CSS and JavaScript. From this folder:
```
python -m http.server 8895
```
Open http://localhost:8895. On a phone, open the page and use "Add to Home screen".

## Three apps in one (switch at the top)

| Tab | Who | What works |
|---|---|---|
| **Travel** | Traveller | Search route + date, date strip with lowest fares, filters, seat map (front seat +₹50), pickup point, 20% UPI advance (demo), ticket with OTP, live tracking, cancel with refund rules, rating, alerts. **Hire full vehicle**: one-way / round-trip quotes, "cars going home empty" at 40% off with instant confirm, or a request that drivers accept. |
| **Drive** | Driver | Demo login, trips for the week with seats filled, tap seats filled at the stand so they aren't sold online, start trip, check passenger OTP, complete trip, cash to collect + Batoi payout, hire requests (accept/decline), post a trip (repeat daily, return deal), register with document upload → pending review. Key labels in Hindi. |
| **Admin** | Batoi team | Bookings, value, revenue, money collected; approve/reject/suspend drivers; close a road for a date (stops sales, alerts booked travellers, full refund); season pricing per route; all bookings. "Reset demo data" clears everything. |

## Demo walk-through

1. Travel → Rishikesh → Uttarkashi, Tomorrow, 2 seats → pick a trip → pick seats → pay.
2. Drive → log in as that trip's driver → open the trip → Start → enter the ticket's OTP.
3. Back in Travel → My trips → ticket shows live tracking (sped up: 1 minute = 1 hour).
4. Travel → Hire full vehicle → Innova → pay → Drive → log in as an Innova driver → Requests → Accept.
5. Admin → Routes & alerts → close the road on that date → Travel → Alerts.

## Money rules (in `js/api.js` → `RULES`)

- Traveller pays **20% advance + ₹25 fee** online. The rest goes to the driver at pickup.
- Batoi keeps **10%** of the fare, taken from the advance. Batoi pays the driver advance − commission.
- Cancellation: more than 24 h before → advance back; 6–24 h → half; under 6 h → nothing. Road closed → everything back.
- One-way hire = km × rate × 1.5 (covers the empty run home). Round trip = km × 2 × rate + ₹600 per extra day.

## Files

- `js/data.js`: places, pickup points, 14 routes (km/time/via), vehicle seat layouts and rates, 12 demo drivers, Rishikesh–Uttarkashi timetable
- `js/api.js`: **the only data layer**. A real backend replaces this file; the screens stay as they are.
- `js/traveller.js`, `js/driver.js`, `js/admin.js`: the three apps
- `js/ui.js`: shared helpers (seat map, sheets, formatting); `js/app.js`: router

## Licence

[MIT](LICENSE).

## Not real yet

- No server: data lives in this browser's localStorage. Driver and traveller "talk" only inside one browser.
- No real payments (Razorpay), SMS/WhatsApp, OTP login, maps or GPS. Tracking is simulated.
- Distances and times are approximate. Drivers, phone numbers and vehicle numbers are fictional.
- **Legal check before launch:** selling single seats on contract-carriage (taxi) permits is a grey area. The aggregator licence comes from Uttarakhand Transport.
