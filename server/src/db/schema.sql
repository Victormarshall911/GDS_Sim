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

CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(origin, destination);
CREATE INDEX IF NOT EXISTS idx_flight_classes_flight ON flight_classes(flight_id);
CREATE INDEX IF NOT EXISTS idx_pnr_segments_locator ON pnr_segments(pnr_locator);
CREATE INDEX IF NOT EXISTS idx_pnr_passengers_locator ON pnr_passengers(pnr_locator);
