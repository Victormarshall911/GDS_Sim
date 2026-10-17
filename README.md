# GDS Terminal Simulator — SIWES Industrial Attachment Training (Sabre & Amadeus)

A realistic web-based dual-GDS (Global Distribution System) terminal simulator designed for travel agency and airline reservation training in Nigeria. It reproduces the authentic CRT phosphor command-line interface, entry-based commands, flight schedules, pricing engines, PNR creation, and automated practice scenario grading across both **Sabre** and **Amadeus** dialects.

---

## Architecture Overview

- **Dual-Dialect Command Engine**: Pure TypeScript engine in `server/src/command-engine/` implementing a unified `Dialect` interface (`sabre` and `amadeus`). Both dialects share the same session model, working-PNR structure, SQLite database, and terminal UI.
- **Dynamic Dialect Switching**: Switch seamlessly via commands (`SET DIALECT AMADEUS`, `SET DIALECT SABRE`, `SET AMADEUS`, `SET SABRE`) or via the UI header badge. Status bar, brand title, welcome banner, delimiter button, and cheat sheet instantly adapt to the active dialect.
- **Auto Sign-In on Load**: Every session starts already signed in with configurable default agents (`7890` for Sabre, `1234AA/SU` for Amadeus). Session state persists across refreshes via cookies.
- **Command Stacking**:
  - Amadeus uses delimiter `+` (e.g., `NM1SMITH/JOHN MR+APLOS 08012345678+TKOK+RFJOHN+ER`).
  - Sabre uses delimiter `¥` (e.g., `-SMITH/JOHN MR¥9234-802-123-4567-A¥6JOHN`).
  - Execution runs sequentially and halts immediately on validation errors (`NEED `, `INVALID `, `NO `, `ERROR`, `CHECK FORMAT`).
- **Interactive Monospace Terminal UI**:
  - CRT scanlines toggle, phosphor themes (Green, Amber, Matrix).
  - Native cursor/caret navigation, middle-of-text insertion, Home/End, arrow-key command history, and Tab/paste retention.
  - Stacking character button (`+` in Amadeus mode, `¥` in Sabre mode) that inserts directly at the caret without losing focus.
  - Keyboard shortcut: typing the backtick key (`` ` ``) inserts `¥` in Sabre mode only.
- **Database Schema (`better-sqlite3`)**:
  - `airports`: Domestic Nigerian hubs (LOS, ABV, PHC, KAN, ENU, etc.) and international destinations (LHR, DXB, JFK, BOM, DEL, etc.).
  - `airlines`: Air Peace (`P4`), Arik Air (`W3`), Dana Air (`AW`), Air India (`AI`), British Airways (`BA`), Emirates (`EK`), Qatar Airways (`QR`), etc.
  - `flights` & `flight_classes`: Multiple daily domestic & international schedules across classes (`J`, `C`, `D`, `Y`, `B`, `M`, `H`, `K`).
  - `fares`: Tariffs in NGN and USD.
  - `pnrs`, `pnr_passengers`, `pnr_segments`: Stored PNR records.
  - `pnr_elements`: Numbered generic elements for contacts (`AP`), SSRs (`SR`), OSIs (`OS`), ticketing (`TK`), endorsements, and e-tickets.
  - `tst`: Stored Transitional Stored Tickets per PNR.
  - `e_tickets`: Issued 13-digit electronic tickets with 3-digit airline prefixes.
  - `queues` & `queue_items`: Simulated agency queues.
  - `hotels` & `car_locations`: Ancillary hotel properties and car rental stations.
  - `command_log`: Audit log of executed commands with dialect tracking.

---

## Quick Start

### 1. Installation
```bash
# Install dependencies across all npm workspaces
npm run setup
```

### 2. Run Locally (Dev Server & Client)
```bash
npm run dev
```
- **Web Terminal UI**: [http://localhost:5173](http://localhost:5173)
- **Express Backend API**: [http://localhost:3001](http://localhost:3001)

### 3. Run Automated Tests
```bash
# Run full test suite (75 server tests + 9 client tests)
npm test
```

---

## Command Coverage & Tier Status

Every command in the Amadeus reference is classified into one of three tiers:
- **Tier 1 (Fully Functional)**: Complete logic, database updates, PNR mutations, pricing/ticketing calculations, and tests.
- **Tier 2 (Simulated)**: Believable simulated display and state management with test coverage.
- **Tier 3 (Recognized Fallback)**: Formatted recognizer returning `COMMAND RECOGNISED - NOT YET SIMULATED: <cmd>` instead of `CHECK FORMAT` or `INVALID ENTRY`.

### Amadeus Command Matrix

| Command | Description | Tier | Status | Example |
| :--- | :--- | :---: | :---: | :--- |
| `JI` | Jump In / Sign In | Tier 1 | ✅ Functional | `JI 1234AA/SU` |
| `JO` | Jump Out / Sign Out | Tier 1 | ✅ Functional | `JO` |
| `JD` | Display Session Status | Tier 1 | ✅ Functional | `JD` |
| `HELP` | System Help | Tier 1 | ✅ Functional | `HELP AN` |
| `MD` / `MU` | Move Down / Move Up (Pagination) | Tier 1 | ✅ Functional | `MD` |
| `MN` / `MY` | Move Next Day / Move Yesterday | Tier 1 | ✅ Functional | `MN` |
| `MP` / `MT` | Move First Page / Move Top | Tier 1 | ✅ Functional | `MP` |
| `DAN` | Encode City to IATA code | Tier 1 | ✅ Functional | `DAN MUMBAI` (returns BOM) |
| `DAC` | Decode City / Airport code | Tier 1 | ✅ Functional | `DAC JFK` (returns NEW YORK) |
| `DNA` | Encode/Decode Airline name/code | Tier 1 | ✅ Functional | `DNA EK` or `DNA EMIRATES` |
| `DC` | Encode/Decode Country name/code | Tier 1 | ✅ Functional | `DC INDIA` or `DC IN` |
| `DNE` | Encode/Decode Aircraft Equipment | Tier 1 | ✅ Functional | `DNE/320` or `DNE/AIRBUS` |
| `DNC` | Encode/Decode Car Rental Vendor | Tier 1 | ✅ Functional | `DNC HERTZ` or `DNC ZE` |
| `DNH` | Encode/Decode Hotel Chain Brand | Tier 1 | ✅ Functional | `DNH HILTON` or `DNH HL` |
| `AN` | Neutral Flight Availability | Tier 1 | ✅ Functional | `AN15MARBOMDEL` |
| `AN.../A` | Availability with Airline Filter | Tier 1 | ✅ Functional | `AN19OCTLOSABV/AP4` |
| `AN*` | Round Trip Simultaneous Availability | Tier 1 | ✅ Functional | `AN15MARBOMDEL*22MAR` |
| `AD` / `AE` | Availability by Departure/Elapsed Time | Tier 1 | ✅ Functional | `AD15MARBOMDEL0800` |
| `AA` | Availability by Arrival Time | Tier 1 | ✅ Functional | `AA15MARDELLHR1700` |
| `AC` | Availability Change (Date/Airline) | Tier 1 | ✅ Functional | `AC20MAR` |
| `SN` | Schedule Neutral (incl. sold out) | Tier 1 | ✅ Functional | `SN15MARBOMDEL` |
| `TN` | Timetable Display with Frequencies | Tier 1 | ✅ Functional | `TN15MARBOMDEL` |
| `SS` (Short) | Sell Segment from Availability | Tier 1 | ✅ Functional | `SS1Y1` (Status: `HK1`) |
| `SS` (Long) | Direct Long Sell | Tier 1 | ✅ Functional | `SSAI101Y15MARBOMDEL1` |
| `NM1` | Add Adult Passenger Name | Tier 1 | ✅ Functional | `NM1SHARMA/RAHUL MR` |
| `NM2` | Add Two Passengers (Shared Surname) | Tier 1 | ✅ Functional | `NM2SHARMA/RAJ MR/PRIYA MRS` |
| `NM CHD` | Add Child Passenger with Date of Birth | Tier 1 | ✅ Functional | `NM1KAPOOR/ANJALI MISS(CHD/15MAR18)` |
| `NM INF` | Add Infant Passenger Linked to Adult | Tier 1 | ✅ Functional | `NM1SHARMA/RAJ MR(INF/BABY MISS/01DEC24)` |
| `AP` | Add General Agency Phone | Tier 1 | ✅ Functional | `APBOM 022-12345678` |
| `APM` | Add Direct Mobile Phone | Tier 1 | ✅ Functional | `APM-9876543210` |
| `APE` | Add General Email Address | Tier 1 | ✅ Functional | `APE-TEST@EMAIL.COM` |
| `SR CTCM` | Preferred Mobile Contact SSR | Tier 1 | ✅ Functional | `SR CTCM-2349165283674` |
| `SR CTCE` | Preferred Email Contact SSR (`//` → `@`) | Tier 1 | ✅ Functional | `SR CTCE-NAME//GMAIL.COM` |
| `SR` | General Special Service Request | Tier 1 | ✅ Functional | `SR VGML/P1/S2` |
| `OS` | Other Service Information | Tier 1 | ✅ Functional | `OS AI VIP PAX` |
| `FFN` | Frequent Flyer Number (FQTV) | Tier 1 | ✅ Functional | `FFNAI-1234567890/P1` |
| `TKOK` | Ticketing OK (Immediate arrangement) | Tier 1 | ✅ Functional | `TKOK` |
| `TKTL` | Ticket Time Limit Deadline | Tier 1 | ✅ Functional | `TKTL20MAR/1800` |
| `RF` | Received From (Mandatory for commit) | Tier 1 | ✅ Functional | `RF RAHUL` |
| `ER` | End & Retrieve (Commit & redisplay) | Tier 1 | ✅ Functional | `ER` |
| `ET` | End Transaction (Commit & clear area) | Tier 1 | ✅ Functional | `ET` |
| `IG` | Ignore Unsaved Changes | Tier 1 | ✅ Functional | `IG` |
| `IR` | Ignore Changes & Reload Saved PNR | Tier 1 | ✅ Functional | `IR` |
| `RT` | Retrieve PNR by Record Locator | Tier 1 | ✅ Functional | `RTABC123` |
| `XE` | Cancel Specific Element Lines | Tier 1 | ✅ Functional | `XE5`, `XE2,4`, `XE2-4` |
| `XI` | Cancel Entire Itinerary | Tier 1 | ✅ Functional | `XI` |
| `SB` | Rebook Segment Class or Date | Tier 1 | ✅ Functional | `SBY2` or `SB20OCT1` |
| `FXP` | Price Itinerary + Store TST | Tier 1 | ✅ Functional | `FXP` (Generates `TST 01 STORED`) |
| `FXX` | Price Itinerary Informative (No TST) | Tier 1 | ✅ Functional | `FXX` |
| `FXA` | Best Pricer Display Cheaper Options | Tier 1 | ✅ Functional | `FXA` |
| `FXR` | Best Pricer Rebook to Lowest Fare | Tier 1 | ✅ Functional | `FXR` |
| `FQD` | Published Fares Display for City Pair | Tier 1 | ✅ Functional | `FQDBOMDEL` |
| `FQN` | Fare Notes and Penalty Rules | Tier 1 | ✅ Functional | `FQN1` |
| `TTP` | Issue E-Tickets for Stored TSTs | Tier 1 | ✅ Functional | `TTP` (Generates 13-digit ticket) |
| `TTP/RT` | Issue E-Tickets and Redisplay PNR | Tier 1 | ✅ Functional | `TTP/RT` (Adds `FA PAX ...`) |
| `FM` | Agency Commission Percentage | Tier 1 | ✅ Functional | `FM5` (5%) |
| `FP` | Form of Payment | Tier 1 | ✅ Functional | `FPCCVI4111222233334444/1225` |
| `FV` | Validating Airline Carrier Stock | Tier 1 | ✅ Functional | `FV AI` or `FV P4` |
| `TWD` | Display Issued Electronic Ticket | Tier 1 | ✅ Functional | `TWD` |
| `SP` | Split Passenger into New PNR | Tier 2 | 🔶 Simulated | `SP2,3` |
| `SM` | Aircraft Interactive Seat Map | Tier 2 | 🔶 Simulated | `SM1` |
| `ST` | Assign Specific Seat | Tier 2 | 🔶 Simulated | `ST/12A/P1/S1` |
| `ST/W` | Request Window Seat Preference | Tier 2 | 🔶 Simulated | `ST/W/P1/S1` |
| `SX` | Cancel Seat Assignment | Tier 2 | 🔶 Simulated | `SX/P1/S1` or `SXALL` |
| `QT` | Queue Count Summary | Tier 2 | 🔶 Simulated | `QT` |
| `QS` | Start Working Specific Queue | Tier 2 | 🔶 Simulated | `QS8` |
| `QN` | Display Next Queue Item | Tier 2 | 🔶 Simulated | `QN` |
| `QI` | Ignore & Leave on Queue | Tier 2 | 🔶 Simulated | `QI` |
| `QF` | Finish & Remove from Queue | Tier 2 | 🔶 Simulated | `QF` |
| `HL` | Hotel Property Directory | Tier 2 | 🔶 Simulated | `HLLON` |
| `HA` | Hotel Room Availability | Tier 2 | 🔶 Simulated | `HALON15JUN-3` |
| `HS` | Sell Hotel Room from Display | Tier 2 | 🔶 Simulated | `HS1` |
| `CL` | Car Rental Stations Directory | Tier 2 | 🔶 Simulated | `CLPAR` |
| `CA` | Car Availability & Rates | Tier 2 | 🔶 Simulated | `CALHR15JUN-3/ARR-1000-1000` |

---

## Tier 3 Commands (Recognized for Upcoming Phases)

The following commands are recognized by the Amadeus tokenizer and return `COMMAND RECOGNISED - NOT YET SIMULATED: <cmd>` rather than syntax errors, queued for future expansion:

| Prefix / Command | Functional Area | Planned Scope |
| :--- | :--- | :--- |
| `TTU` | Ticketing | Manual ticket update and re-validation |
| `TQT` | Transitional Stored Tickets | Display raw stored TST record details |
| `TRDC` | Ticket Refund / Cancellation | Voluntary ticket refund calculation |
| `GG` | Amadeus Information System (AIS) | Agency and carrier news pages (e.g. `GG AIR P4`) |
| `FI` / `FO` | Financial / Invoice Records | Back-office accounting invoice generation |
| `FD` / `FQ` | Advanced Fare Search | Detailed historical and passenger-type fare quotes |
| `RL` / `RLS` | Record Locator Sync | Airline partner record locator lookups |
| `QE` | Queue Routing | Forwarding PNRs to branch office queues |
| `FXZ` / `FXB` | Automated Best Pricer Fares | Instant auto-book pricing options with class exchange |
| `FXK` | Group / Negotiated Fares | Corporate contracted private fare pricing |
| `TWD/TAX` | E-Ticket Breakdown | Detailed tax breakdown display for issued tickets |

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

## Validation & Business Rules

1. **Segment Status Lifecycle**:
   - **Amadeus**: Sold segments (`SS`) immediately assume `HK1` status in the working PNR.
   - **Sabre**: Freshly sold segments in the working PNR display as `SS1`; upon `E`/`ER`, status transitions to `HK1`.
2. **Commit Validation Hierarchy on `ER` / `ET` / `E`**:
   The simulator enforces the realistic GDS validation order before issuing a record locator:
   1. Names (`NEED NAME`)
   2. Flight Segments (`NEED ITINERARY`)
   3. Contact Information (`NEED CONTACT` in Amadeus / `NEED PHONE` in Sabre)
   4. Ticketing Arrangement (`NEED TICKETING ARRANGEMENT`)
   5. Received From (`NEED RECEIVED FROM`)
3. **Date Parser & Rolling Dates**:
   - Supports formats `DDMMM` (e.g. `19OCT`), `DDMMMYY` (e.g. `19OCT26`), and day-only `DD` (e.g. `19`).
   - Dates in the past automatically roll forward to their next occurrence based on the current UTC date.
4. **Email SSR Formatting**:
   - In Amadeus `SR CTCE` commands, `//` represents the `@` character (e.g. `SR CTCE-NAME//GMAIL.COM` stores and displays `NAME@GMAIL.COM`).
5. **Electronic Ticket Numbering**:
   - Tickets generated with `TTP` create realistic 13-digit numbers using authentic 3-digit IATA airline prefixes (`240-` for Air Peace P4, `098-` for Air India AI, `725-` for Arik Air W3, `086-` for Dana Air AW, `125-` for British Airways BA).

---

## Practice Mode (SIWES Scenarios)

The simulator includes automated practice scenarios for industrial training with instantaneous grading and step-by-step feedback:
- **Sabre Scenarios**:
  1. Solo Traveler Lagos to London Heathrow (`solo-lagos-london`)
  2. Roundtrip Domestic Lagos to Abuja (`roundtrip-domestic`)
  3. Family Vacation with Child & Infant (`family-vacation`)
  4. Regional West Africa Booking (`regional-west-africa`)
  5. Multi-City Corporate Itinerary (`multi-city-corporate`)
- **Amadeus Scenarios**:
  1. Domestic Nigeria Air Peace Return (`amadeus-domestic-p4`)
  2. Solo Executive BOM to DEL on Air India (`amadeus-solo-executive`)
  3. Family Booking with Child and Infant (`amadeus-family-chd-inf`)
  4. Best Pricer & Stored TST Pricing (`amadeus-best-pricer`)
  5. Split Passenger Booking (`amadeus-split-pnr`)
  6. E-Ticket Issuance with Cash Payment Form (`amadeus-eticket-issuance`)

Users can filter practice scenarios by dialect or select **All** directly inside the side drawer.
