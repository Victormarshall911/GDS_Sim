# Sabre GDS Terminal Simulator — SIWES Industrial Attachment Training

A realistic web-based GDS (Global Distribution System) terminal simulator designed for travel-agency training in Nigeria. It reproduces the authentic green-phosphor Sabre command-line interface, entry-based commands, flight availability, pricing, PNR creation, and automated practice scenario grading.

---

## Architecture Overview

- **Dialect System**: Pure TypeScript command engine in `server/src/command-engine/` implementing a common `Dialect` interface. Fully architected to add Amadeus as a second dialect (`SET AMADEUS` / `SET SABRE`).
- **Backend**: Node.js + Express + `better-sqlite3` with in-memory sessions keyed by cookie.
- **Frontend**: Single full-screen terminal UI (Vite + React) with green-on-black phosphor aesthetic, custom blinking cursor, command history (Up/Down arrows), CRT scanline toggle, and slide-over side drawers.
- **Database Tables**:
  - `airports`: 40+ Nigerian, African, and international hubs (LOS, ABV, PHC, KAN, ACC, LHR, DXB, JFK, CDG, etc.)
  - `airlines`: 18 airlines including Arik Air (`W3`), Air Peace (`P4`), Ibom Air (`QI`), British Airways (`BA`), Virgin Atlantic (`VS`), Emirates (`EK`), Qatar (`QR`), etc.
  - `flights` & `flight_classes`: schedules and seat availability across classes (`J`, `C`, `D`, `Y`, `B`, `M`, `H`, `K`)
  - `fares`: tariffs in NGN (kobo) and USD (cents)
  - `pnrs`, `pnr_passengers`, `pnr_segments`: saved bookings
  - `agents`: agent identities and PCCs
  - `command_log`: persistent audit log of every command executed per session
  - `practice_attempts`: records of evaluated training scenarios with scores and feedback
- **Configurable Pricing**: `server/src/pricing-config.json` stores fuel surcharges (`YQ`), airport security taxes, and passenger discounts.

---

## Quick Start

### 1. Installation & Setup
```bash
# Install dependencies across all npm workspaces
npm run setup
```

### 2. Run Locally (Server + Client)
```bash
npm run dev
```
- Web Terminal UI: [http://localhost:5173](http://localhost:5173)
- Express API: [http://localhost:3001](http://localhost:3001)

### 3. Run Unit Tests (Vitest)
```bash
npm test
```
Runs all 37 unit tests covering availability, sell from availability, direct sell, name parsing, phone, ticketing, received from, strict `E`/`ER` validation order, segment status transition (`SS` -> `HK`), `I`/`XI`/`X1` cancellations, and `WP` pricing.

---

## Core Sabre Commands Reference

| Category | Command | Description | Example |
| :--- | :--- | :--- | :--- |
| **Sign In** | `SI*<ID>` | Sign in with agent ID | `SI*7890` |
| **Sign Out** | `SO` | Sign out of session | `SO` |
| **Help** | `HELP` | Display command reference | `HELP` |
| **Availability** | `1<ORIG><DEST><DATE>` | Search flights | `1LOSLHR15NOV` |
| | `1<DATE><ORIG><DEST>` | Date first search | `115NOVLOSABV` |
| **Sell** | `0<LINE><CLASS><SEATS>` | Sell from availability line | `01Y1` (Status: `SS`) |
| | `0<AIRLINE><FLT><CLS><DATE><ORIG><DEST><SEATS>` | Direct sell | `0W3501Y15NOVLOSLHR1` |
| **Name** | `-<LAST>/<FIRST> <TITLE>` | Adult passenger | `-SMITH/JOHN MR` |
| | `-<LAST>/<FIRST> <TITLE>(CHD/<DOB>)` | Child passenger | `-DOE/TOM MSTR(CHD/15JAN20)` |
| | `-<LAST>/<FIRST>(INF)` | Infant passenger | `-DOE/BABY(INF)` |
| **Phone** | `9<NUMBER>-<TYPE>` | Agency or home phone | `9234-802-123-4567-A` |
| **Ticketing** | `7TAW/` or `7TAW/<DATE>` | Ticket time limit | `7TAW/` or `7TAW/25NOV` |
| **Received From**| `6<NAME>` | Booking requester | `6SMITH` |
| **Pricing** | `WP` | Price itinerary (Base + YQ + Taxes) | `WP` |
| | `WPNC` | Price with no commission | `WPNC` |
| **End Transaction** | `E` | End and save (generates 6-char locator) | `E` |
| | `ER` | End, save, and redisplay PNR | `ER` (Status becomes `HK`) |
| **Display** | `*A` | Display all fields | `*A` |
| | `*I` | Display itinerary only | `*I` |
| | `*N` | Display passenger names only | `*N` |
| | `*<LOCATOR>` | Retrieve PNR by record locator | `*WLXJFH` |
| **Cancel / Ignore**| `I` | Ignore: wipe working area without saving | `I` |
| | `XI` | Cancel itinerary | `XI` |
| | `X1` | Cancel segment 1 | `X1` |
| **Encode / Decode**| `DAN <CITY>` | Encode city to airport code | `DAN LAGOS` |
| | `DAC <CODE>` | Decode airport code | `DAC LOS` |
| | `W/*<AIRLINE>` | Encode/decode airline name/code | `W/*BRITISH` or `W/*W3` |
| **Dialect Switch**| `SET AMADEUS` | Switch to Amadeus mode | `SET AMADEUS` |
| | `SET SABRE` | Switch to Sabre mode | `SET SABRE` |

---

## Validation & Status Rules Implemented

1. **Segment Status Lifecycle**:
   - Freshly sold segments in the working PNR are displayed as `SS` (e.g. `01 W3 101Y 15NOV LOSLHR SS1`).
   - Upon transaction completion (`E` or `ER`), segments are committed to the database and status transitions to `HK` (Confirmed, e.g. `1 W3 101Y 15NOV LOSLHR HK1`).
2. **Strict Validation Order on `E`/`ER`**:
   1. `NEED NAME`
   2. `NEED ITINERARY`
   3. `NEED PHONE`
   4. `NEED TICKETING`
   5. `NEED RECEIVED FROM`
3. **Cancellation & Ignore**:
   - `I`: Discards the working PNR without writing to the database.
   - `XI`: Cancels segments in the working PNR or flags segments as `XX` (Cancelled) on a retrieved PNR.
   - `X<n>`: Cancels segment `<n>` in working or retrieved PNR.
4. **Class Pricing Check**:
   - `WP` verifies that the booked class code actually exists on that scheduled flight.
5. **Interactive Practice Mode**:
   - Practice scenarios can be graded in one click via the slide-over drawer, verifying sign-in, routes, passenger types, phone, ticketing, received from, and record locator generation with persistent score tracking in `practice_attempts`.
