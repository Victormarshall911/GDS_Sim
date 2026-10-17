-- GDS Terminal Simulator SQLite Schema

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pcc TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS airports (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  city_code TEXT NOT NULL,
  country TEXT NOT NULL,
  timezone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS airlines (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  numeric TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  airline_code TEXT NOT NULL,
  flight_number INTEGER NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  aircraft TEXT NOT NULL,
  days_of_week TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT NOT NULL,
  FOREIGN KEY (airline_code) REFERENCES airlines(code),
  FOREIGN KEY (origin) REFERENCES airports(code),
  FOREIGN KEY (destination) REFERENCES airports(code)
);

CREATE TABLE IF NOT EXISTS flight_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flight_id INTEGER NOT NULL,
  class_code TEXT NOT NULL,
  seats_available INTEGER NOT NULL DEFAULT 9,
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  airline_code TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  class_code TEXT NOT NULL,
  base_fare_ngn INTEGER NOT NULL,
  base_fare_usd INTEGER NOT NULL,
  fare_basis TEXT NOT NULL,
  pax_type TEXT NOT NULL DEFAULT 'ADT',
  validity_days INTEGER NOT NULL DEFAULT 365,
  FOREIGN KEY (airline_code) REFERENCES airlines(code)
);

CREATE TABLE IF NOT EXISTS pnrs (
  record_locator TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  agent_id TEXT,
  received_from TEXT NOT NULL,
  phone TEXT NOT NULL,
  ticketing TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS pnr_passengers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pnr_locator TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  title TEXT NOT NULL,
  pax_type TEXT NOT NULL DEFAULT 'ADT',
  dob TEXT,
  associated_adult INTEGER,
  FOREIGN KEY (pnr_locator) REFERENCES pnrs(record_locator) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pnr_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pnr_locator TEXT NOT NULL,
  segment_number INTEGER NOT NULL,
  airline_code TEXT NOT NULL,
  flight_number INTEGER NOT NULL,
  class_code TEXT NOT NULL,
  travel_date TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'HK',
  num_seats INTEGER NOT NULL DEFAULT 1,
  aircraft TEXT,
  FOREIGN KEY (pnr_locator) REFERENCES pnrs(record_locator) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS command_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  dialect TEXT NOT NULL DEFAULT 'sabre',
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  input TEXT NOT NULL,
  output TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  score INTEGER NOT NULL,
  feedback TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS active_sessions (
  session_id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Stored TST (Transitional Stored Ticket / pricing records)
CREATE TABLE IF NOT EXISTS tst (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pnr_locator TEXT NOT NULL,
  tst_number INTEGER NOT NULL DEFAULT 1,
  pax_type TEXT NOT NULL DEFAULT 'ADT',
  base_fare_ngn INTEGER NOT NULL,
  taxes_ngn INTEGER NOT NULL,
  total_fare_ngn INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  fare_basis TEXT NOT NULL,
  validating_carrier TEXT NOT NULL DEFAULT 'P4',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pnr_locator) REFERENCES pnrs(record_locator) ON DELETE CASCADE
);

-- Generic Numbered PNR Elements (for Amadeus element numbering: AP, SR, OS, FFN, TK, RF, FP, etc.)
CREATE TABLE IF NOT EXISTS pnr_elements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pnr_locator TEXT NOT NULL,
  element_number INTEGER NOT NULL,
  element_type TEXT NOT NULL,
  content TEXT NOT NULL,
  pax_ref TEXT,
  seg_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pnr_locator) REFERENCES pnrs(record_locator) ON DELETE CASCADE
);

-- Queues & Queue Items
CREATE TABLE IF NOT EXISTS queues (
  queue_number INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS queue_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_number INTEGER NOT NULL,
  pnr_locator TEXT NOT NULL,
  pax_name TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (queue_number) REFERENCES queues(queue_number)
);

-- Hotel Inventory (Tier 2)
CREATE TABLE IF NOT EXISTS hotels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_code TEXT NOT NULL,
  chain_code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  rate_ngn INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  stars INTEGER NOT NULL DEFAULT 4
);

-- Car Rental Locations (Tier 2)
CREATE TABLE IF NOT EXISTS car_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_code TEXT NOT NULL,
  vendor_code TEXT NOT NULL,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'AIRPORT',
  daily_rate_ngn INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN'
);

-- Issued E-Tickets
CREATE TABLE IF NOT EXISTS e_tickets (
  ticket_number TEXT PRIMARY KEY,
  pnr_locator TEXT NOT NULL,
  pax_name TEXT NOT NULL,
  airline_code TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ISSUED',
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pnr_locator) REFERENCES pnrs(record_locator) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(origin, destination);
CREATE INDEX IF NOT EXISTS idx_flight_classes_flight ON flight_classes(flight_id);
CREATE INDEX IF NOT EXISTS idx_pnr_segments_locator ON pnr_segments(pnr_locator);
CREATE INDEX IF NOT EXISTS idx_pnr_passengers_locator ON pnr_passengers(pnr_locator);
CREATE INDEX IF NOT EXISTS idx_tst_locator ON tst(pnr_locator);
CREATE INDEX IF NOT EXISTS idx_pnr_elements_locator ON pnr_elements(pnr_locator);
CREATE INDEX IF NOT EXISTS idx_queue_items_q ON queue_items(queue_number);
CREATE INDEX IF NOT EXISTS idx_e_tickets_pnr ON e_tickets(pnr_locator);


