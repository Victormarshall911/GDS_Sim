import { getDatabase } from './connection';
import type { Database as DatabaseType } from 'better-sqlite3';

export function seedDatabase(targetDb?: DatabaseType | string): void {
  const db =
    typeof targetDb === 'object' && targetDb !== null
      ? targetDb
      : getDatabase(typeof targetDb === 'string' ? targetDb : undefined);


  console.log('Seeding GDS Simulator database...');

  const insertAgent = db.prepare(
    'INSERT OR REPLACE INTO agents (id, name, pcc) VALUES (?, ?, ?)'
  );

  const insertAirport = db.prepare(
    'INSERT OR REPLACE INTO airports (code, name, city, city_code, country, timezone) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertAirline = db.prepare(
    'INSERT OR REPLACE INTO airlines (code, name, numeric) VALUES (?, ?, ?)'
  );

  const insertFlight = db.prepare(
    `INSERT INTO flights (airline_code, flight_number, origin, destination, departure_time, arrival_time, aircraft, days_of_week, effective_from, effective_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertClass = db.prepare(
    'INSERT INTO flight_classes (flight_id, class_code, seats_available) VALUES (?, ?, ?)'
  );

  const insertFare = db.prepare(
    `INSERT INTO fares (airline_code, origin, destination, class_code, base_fare_ngn, base_fare_usd, fare_basis, pax_type, validity_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const runSeed = db.transaction(() => {
    // 1. Agents
    const agents = [
      ['7890', 'Victor (SIWES Trainee)', 'LOS01'],
      ['1234', 'Junior Agent Lagos', 'LOS01'],
      ['5678', 'Senior Ticketer Abuja', 'ABV02'],
      ['9999', 'Supervisor Test', 'HQ001'],
    ];
    for (const [id, name, pcc] of agents) {
      insertAgent.run(id, name, pcc);
    }

    // 2. Airports (40+)
    const airports = [
      // Nigeria
      ['LOS', 'Murtala Muhammed International', 'Lagos', 'LOS', 'NG', 'Africa/Lagos'],
      ['ABV', 'Nnamdi Azikiwe International', 'Abuja', 'ABV', 'NG', 'Africa/Lagos'],
      ['PHC', 'Port Harcourt International', 'Port Harcourt', 'PHC', 'NG', 'Africa/Lagos'],
      ['KAN', 'Mallam Aminu Kano International', 'Kano', 'KAN', 'NG', 'Africa/Lagos'],
      ['ENU', 'Akanu Ibiam International', 'Enugu', 'ENU', 'NG', 'Africa/Lagos'],
      ['QOW', 'Sam Mbakwe International Cargo', 'Owerri', 'QOW', 'NG', 'Africa/Lagos'],
      ['BNI', 'Benin Airport', 'Benin City', 'BNI', 'NG', 'Africa/Lagos'],
      ['CBQ', 'Margaret Ekpo International', 'Calabar', 'CBQ', 'NG', 'Africa/Lagos'],
      ['ABB', 'Asaba International Airport', 'Asaba', 'ABB', 'NG', 'Africa/Lagos'],
      ['ILR', 'Ilorin International', 'Ilorin', 'ILR', 'NG', 'Africa/Lagos'],
      ['SKO', 'Sultan Saddik Abubakar III', 'Sokoto', 'SKO', 'NG', 'Africa/Lagos'],
      ['MIU', 'Maiduguri International', 'Maiduguri', 'MIU', 'NG', 'Africa/Lagos'],
      ['YOL', 'Yola Airport', 'Yola', 'YOL', 'NG', 'Africa/Lagos'],
      ['AKR', 'Akure Airport', 'Akure', 'AKR', 'NG', 'Africa/Lagos'],

      // West & Central Africa
      ['ACC', 'Kotoka International', 'Accra', 'ACC', 'GH', 'Africa/Accra'],
      ['DSS', 'Blaise Diagne International', 'Dakar', 'DKR', 'SN', 'Africa/Dakar'],
      ['BJL', 'Banjul International', 'Banjul', 'BJL', 'GM', 'Africa/Banjul'],
      ['FNA', 'Freetown International', 'Freetown', 'FNA', 'SL', 'Africa/Freetown'],
      ['ROB', 'Roberts International', 'Monrovia', 'MLW', 'LR', 'Africa/Monrovia'],
      ['LFW', 'Gnassingbe Eyadema International', 'Lome', 'LFW', 'TG', 'Africa/Lome'],
      ['COO', 'Cadjehoun Airport', 'Cotonou', 'COO', 'BJ', 'Africa/Porto-Novo'],
      ['DLA', 'Douala International', 'Douala', 'DLA', 'CM', 'Africa/Douala'],

      // East & South Africa
      ['NBO', 'Jomo Kenyatta International', 'Nairobi', 'NBO', 'KE', 'Africa/Nairobi'],
      ['ADD', 'Addis Ababa Bole International', 'Addis Ababa', 'ADD', 'ET', 'Africa/Addis_Ababa'],
      ['KGL', 'Kigali International', 'Kigali', 'KGL', 'RW', 'Africa/Kigali'],
      ['JNB', 'O. R. Tambo International', 'Johannesburg', 'JNB', 'ZA', 'Africa/Johannesburg'],
      ['CPT', 'Cape Town International', 'Cape Town', 'CPT', 'ZA', 'Africa/Johannesburg'],
      ['CAI', 'Cairo International', 'Cairo', 'CAI', 'EG', 'Africa/Cairo'],

      // Europe & UK
      ['LHR', 'London Heathrow', 'London', 'LON', 'GB', 'Europe/London'],
      ['LGW', 'London Gatwick', 'London', 'LON', 'GB', 'Europe/London'],
      ['MAN', 'Manchester Airport', 'Manchester', 'MAN', 'GB', 'Europe/London'],
      ['CDG', 'Charles de Gaulle', 'Paris', 'PAR', 'FR', 'Europe/Paris'],
      ['FRA', 'Frankfurt Airport', 'Frankfurt', 'FRA', 'DE', 'Europe/Berlin'],
      ['AMS', 'Amsterdam Schiphol', 'Amsterdam', 'AMS', 'NL', 'Europe/Amsterdam'],
      ['IST', 'Istanbul Airport', 'Istanbul', 'IST', 'TR', 'Europe/Istanbul'],

      // Middle East
      ['DXB', 'Dubai International', 'Dubai', 'DXB', 'AE', 'Asia/Dubai'],
      ['DOH', 'Hamad International', 'Doha', 'DOH', 'QA', 'Asia/Qatar'],

      // North America
      ['JFK', 'John F. Kennedy International', 'New York', 'NYC', 'US', 'America/New_York'],
      ['ATL', 'Hartsfield-Jackson Atlanta International', 'Atlanta', 'ATL', 'US', 'America/New_York'],
      ['IAH', 'George Bush Intercontinental', 'Houston', 'HOU', 'US', 'America/Chicago'],
      ['ORD', 'OHare International', 'Chicago', 'CHI', 'US', 'America/Chicago'],
      ['IAD', 'Washington Dulles International', 'Washington', 'WAS', 'US', 'America/New_York'],
      ['YYZ', 'Toronto Pearson International', 'Toronto', 'YTO', 'CA', 'America/Toronto'],

      // India & Asia (for Amadeus reference examples)
      ['BOM', 'Chhatrapati Shivaji Maharaj International', 'Mumbai', 'BOM', 'IN', 'Asia/Kolkata'],
      ['DEL', 'Indira Gandhi International', 'Delhi', 'DEL', 'IN', 'Asia/Kolkata'],
    ];

    for (const [code, name, city, city_code, country, timezone] of airports) {
      insertAirport.run(code, name, city, city_code, country, timezone);
    }

    // 3. Airlines (20)
    const airlines = [
      ['W3', 'Arik Air', '725'],
      ['P4', 'Air Peace', '810'],
      ['QI', 'Ibom Air', '820'],
      ['OF', 'Overland Airways', '830'],
      ['UN', 'United Nigeria Airlines', '840'],
      ['VM', 'Max Air', '850'],
      ['AW', 'Africa World Airlines', '394'],
      ['9J', 'Dana Air', '086'],
      ['AI', 'Air India', '098'],
      ['BA', 'British Airways', '125'],
      ['VS', 'Virgin Atlantic', '932'],
      ['EK', 'Emirates', '176'],
      ['QR', 'Qatar Airways', '157'],
      ['DL', 'Delta Air Lines', '006'],
      ['AF', 'Air France', '057'],
      ['LH', 'Lufthansa', '220'],
      ['ET', 'Ethiopian Airlines', '071'],
      ['KQ', 'Kenya Airways', '706'],
      ['TK', 'Turkish Airlines', '235'],
      ['MS', 'EgyptAir', '077'],
      ['RW', 'RwandAir', '459'],
    ];

    for (const [code, name, num] of airlines) {
      insertAirline.run(code, name, num);
    }

    // 4. Flights
    db.prepare('DELETE FROM flights').run();
    db.prepare('DELETE FROM flight_classes').run();
    db.prepare('DELETE FROM fares').run();

    const flightDefinitions = [
      // Nigeria Domestic Routes
      // LOS - ABV
      { airline: 'W3', flightNum: 501, orig: 'LOS', dest: 'ABV', dep: '07:00', arr: '08:15', ac: '738', days: '1234567' },
      { airline: 'P4', flightNum: 7120, orig: 'LOS', dest: 'ABV', dep: '08:30', arr: '09:45', ac: '738', days: '1234567' },
      { airline: 'QI', flightNum: 301, orig: 'LOS', dest: 'ABV', dep: '10:00', arr: '11:10', ac: 'A220', days: '1234567' },
      { airline: 'UN', flightNum: 601, orig: 'LOS', dest: 'ABV', dep: '12:30', arr: '13:45', ac: 'E145', days: '1234567' },
      { airline: 'P4', flightNum: 7124, orig: 'LOS', dest: 'ABV', dep: '15:00', arr: '16:15', ac: '738', days: '1234567' },
      { airline: 'W3', flightNum: 507, orig: 'LOS', dest: 'ABV', dep: '18:00', arr: '19:15', ac: '738', days: '1234567' },

      // ABV - LOS
      { airline: 'W3', flightNum: 502, orig: 'ABV', dest: 'LOS', dep: '09:00', arr: '10:15', ac: '738', days: '1234567' },
      { airline: 'P4', flightNum: 7121, orig: 'ABV', dest: 'LOS', dep: '10:30', arr: '11:45', ac: '738', days: '1234567' },
      { airline: 'QI', flightNum: 302, orig: 'ABV', dest: 'LOS', dep: '12:00', arr: '13:10', ac: 'A220', days: '1234567' },
      { airline: 'UN', flightNum: 602, orig: 'ABV', dest: 'LOS', dep: '14:30', arr: '15:45', ac: 'E145', days: '1234567' },
      { airline: 'P4', flightNum: 7125, orig: 'ABV', dest: 'LOS', dep: '17:00', arr: '18:15', ac: '738', days: '1234567' },
      { airline: 'W3', flightNum: 508, orig: 'ABV', dest: 'LOS', dep: '20:00', arr: '21:15', ac: '738', days: '1234567' },

      // LOS - PHC
      { airline: 'P4', flightNum: 7130, orig: 'LOS', dest: 'PHC', dep: '08:00', arr: '09:10', ac: '738', days: '1234567' },
      { airline: 'QI', flightNum: 315, orig: 'LOS', dest: 'PHC', dep: '11:30', arr: '12:35', ac: 'CRJ9', days: '1234567' },
      { airline: 'W3', flightNum: 520, orig: 'LOS', dest: 'PHC', dep: '16:00', arr: '17:10', ac: '738', days: '1234567' },

      // PHC - LOS
      { airline: 'P4', flightNum: 7131, orig: 'PHC', dest: 'LOS', dep: '10:00', arr: '11:10', ac: '738', days: '1234567' },
      { airline: 'QI', flightNum: 316, orig: 'PHC', dest: 'LOS', dep: '13:30', arr: '14:35', ac: 'CRJ9', days: '1234567' },
      { airline: 'W3', flightNum: 521, orig: 'PHC', dest: 'LOS', dep: '18:00', arr: '19:10', ac: '738', days: '1234567' },

      // LOS - KAN
      { airline: 'P4', flightNum: 7140, orig: 'LOS', dest: 'KAN', dep: '09:30', arr: '11:00', ac: '738', days: '1234567' },
      { airline: 'VM', flightNum: 801, orig: 'LOS', dest: 'KAN', dep: '13:00', arr: '14:30', ac: '738', days: '1234567' },

      // KAN - LOS
      { airline: 'P4', flightNum: 7141, orig: 'KAN', dest: 'LOS', dep: '12:00', arr: '13:30', ac: '738', days: '1234567' },
      { airline: 'VM', flightNum: 802, orig: 'KAN', dest: 'LOS', dep: '15:30', arr: '17:00', ac: '738', days: '1234567' },

      // LOS - ENU
      { airline: 'P4', flightNum: 7150, orig: 'LOS', dest: 'ENU', dep: '08:45', arr: '09:50', ac: 'E195', days: '1234567' },
      { airline: 'QI', flightNum: 320, orig: 'LOS', dest: 'ENU', dep: '14:15', arr: '15:15', ac: 'CRJ9', days: '1234567' },

      // ENU - LOS
      { airline: 'P4', flightNum: 7151, orig: 'ENU', dest: 'LOS', dep: '10:45', arr: '11:50', ac: 'E195', days: '1234567' },
      { airline: 'QI', flightNum: 321, orig: 'ENU', dest: 'LOS', dep: '16:00', arr: '17:00', ac: 'CRJ9', days: '1234567' },

      // Regional Routes
      // LOS - ACC
      { airline: 'P4', flightNum: 7160, orig: 'LOS', dest: 'ACC', dep: '07:30', arr: '07:35', ac: '738', days: '1234567' },
      { airline: 'W3', flightNum: 550, orig: 'LOS', dest: 'ACC', dep: '15:00', arr: '15:05', ac: '738', days: '1234567' },

      // ACC - LOS
      { airline: 'P4', flightNum: 7161, orig: 'ACC', dest: 'LOS', dep: '08:45', arr: '10:50', ac: '738', days: '1234567' },
      { airline: 'W3', flightNum: 551, orig: 'ACC', dest: 'LOS', dep: '16:15', arr: '18:20', ac: '738', days: '1234567' },

      // Major International Routes
      // LOS - LHR
      { airline: 'BA', flightNum: 74, orig: 'LOS', dest: 'LHR', dep: '22:55', arr: '05:25', ac: '77W', days: '1234567' },
      { airline: 'VS', flightNum: 412, orig: 'LOS', dest: 'LHR', dep: '10:10', arr: '16:30', ac: '359', days: '1234567' },
      { airline: 'W3', flightNum: 101, orig: 'LOS', dest: 'LHR', dep: '08:30', arr: '14:45', ac: '738', days: '1234567' },

      // LHR - LOS
      { airline: 'BA', flightNum: 75, orig: 'LHR', dest: 'LOS', dep: '11:50', arr: '18:15', ac: '77W', days: '1234567' },
      { airline: 'VS', flightNum: 411, orig: 'LHR', dest: 'LOS', dep: '22:30', arr: '05:05', ac: '359', days: '1234567' },
      { airline: 'W3', flightNum: 102, orig: 'LHR', dest: 'LOS', dep: '16:30', arr: '23:00', ac: '738', days: '1234567' },

      // ABV - LHR
      { airline: 'BA', flightNum: 82, orig: 'ABV', dest: 'LHR', dep: '08:00', arr: '14:15', ac: '788', days: '1234567' },
      { airline: 'BA', flightNum: 83, orig: 'LHR', dest: 'ABV', dep: '22:15', arr: '05:10', ac: '788', days: '1234567' },

      // LOS - DXB
      { airline: 'EK', flightNum: 784, orig: 'LOS', dest: 'DXB', dep: '17:30', arr: '04:45', ac: '77W', days: '1234567' },
      { airline: 'EK', flightNum: 783, orig: 'DXB', dest: 'LOS', dep: '10:30', arr: '15:30', ac: '77W', days: '1234567' },

      // LOS - DOH
      { airline: 'QR', flightNum: 1408, orig: 'LOS', dest: 'DOH', dep: '15:20', arr: '00:15', ac: '788', days: '1234567' },
      { airline: 'QR', flightNum: 1407, orig: 'DOH', dest: 'LOS', dep: '07:45', arr: '13:40', ac: '788', days: '1234567' },

      // LOS - CDG
      { airline: 'AF', flightNum: 105, orig: 'LOS', dest: 'CDG', dep: '23:15', arr: '06:10', ac: '333', days: '1234567' },
      { airline: 'AF', flightNum: 104, orig: 'CDG', dest: 'LOS', dep: '13:45', arr: '19:25', ac: '333', days: '1234567' },

      // LOS - FRA
      { airline: 'LH', flightNum: 569, orig: 'LOS', dest: 'FRA', dep: '22:20', arr: '05:40', ac: '333', days: '1234567' },
      { airline: 'LH', flightNum: 568, orig: 'FRA', dest: 'LOS', dep: '11:30', arr: '17:40', ac: '333', days: '1234567' },

      // LOS - ATL
      { airline: 'DL', flightNum: 55, orig: 'LOS', dest: 'ATL', dep: '12:30', arr: '19:45', ac: '339', days: '1234567' },
      { airline: 'DL', flightNum: 54, orig: 'ATL', dest: 'LOS', dep: '17:50', arr: '10:15', ac: '339', days: '1234567' },

      // LOS - ADD
      { airline: 'ET', flightNum: 900, orig: 'LOS', dest: 'ADD', dep: '13:40', arr: '21:00', ac: '359', days: '1234567' },
      { airline: 'ET', flightNum: 901, orig: 'ADD', dest: 'LOS', dep: '09:00', arr: '12:25', ac: '359', days: '1234567' },

      // LOS - NBO
      { airline: 'KQ', flightNum: 533, orig: 'LOS', dest: 'NBO', dep: '12:15', arr: '19:25', ac: '788', days: '1234567' },
      { airline: 'KQ', flightNum: 532, orig: 'NBO', dest: 'LOS', dep: '07:20', arr: '11:00', ac: '788', days: '1234567' },

      // LOS - IST
      { airline: 'TK', flightNum: 626, orig: 'LOS', dest: 'IST', dep: '21:05', arr: '05:55', ac: '333', days: '1234567' },
      { airline: 'TK', flightNum: 625, orig: 'IST', dest: 'LOS', dep: '14:15', arr: '19:35', ac: '333', days: '1234567' },

      // LOS - JNB
      // LOS - ABV additional flights
      { airline: 'AW', flightNum: 201, orig: 'LOS', dest: 'ABV', dep: '11:15', arr: '12:30', ac: '738', days: '1234567' },
      { airline: 'AW', flightNum: 205, orig: 'LOS', dest: 'ABV', dep: '16:30', arr: '17:45', ac: '738', days: '1234567' },
      // ABV - LOS additional flights
      { airline: 'AW', flightNum: 202, orig: 'ABV', dest: 'LOS', dep: '13:30', arr: '14:45', ac: '738', days: '1234567' },
      { airline: 'AW', flightNum: 206, orig: 'ABV', dest: 'LOS', dep: '18:30', arr: '19:45', ac: '738', days: '1234567' },
      // Dana Air (9J) domestic
      { airline: '9J', flightNum: 350, orig: 'LOS', dest: 'ABV', dep: '09:15', arr: '10:30', ac: 'M88', days: '1234567' },
      { airline: '9J', flightNum: 351, orig: 'ABV', dest: 'LOS', dep: '11:30', arr: '12:45', ac: 'M88', days: '1234567' },
      // ABV - PHC
      { airline: 'P4', flightNum: 7170, orig: 'ABV', dest: 'PHC', dep: '09:00', arr: '10:05', ac: '738', days: '1234567' },
      { airline: 'W3', flightNum: 560, orig: 'ABV', dest: 'PHC', dep: '14:00', arr: '15:05', ac: '738', days: '1234567' },
      // PHC - ABV
      { airline: 'P4', flightNum: 7171, orig: 'PHC', dest: 'ABV', dep: '11:00', arr: '12:05', ac: '738', days: '1234567' },
      { airline: 'W3', flightNum: 561, orig: 'PHC', dest: 'ABV', dep: '16:00', arr: '17:05', ac: '738', days: '1234567' },
      // India Routes (for Amadeus documentation examples: BOM-DEL)
      { airline: 'AI', flightNum: 101, orig: 'BOM', dest: 'DEL', dep: '08:00', arr: '10:15', ac: '788', days: '1234567' },
      { airline: 'AI', flightNum: 103, orig: 'BOM', dest: 'DEL', dep: '17:30', arr: '19:45', ac: '788', days: '1234567' },
      { airline: 'AI', flightNum: 102, orig: 'DEL', dest: 'BOM', dep: '11:00', arr: '13:15', ac: '788', days: '1234567' },
      { airline: 'AI', flightNum: 104, orig: 'DEL', dest: 'BOM', dep: '20:30', arr: '22:45', ac: '788', days: '1234567' },
    ];

    const standardClasses = [
      { code: 'J', seats: 4 },
      { code: 'C', seats: 4 },
      { code: 'D', seats: 2 },
      { code: 'Y', seats: 9 },
      { code: 'B', seats: 9 },
      { code: 'M', seats: 7 },
      { code: 'H', seats: 7 },
      { code: 'K', seats: 4 },
    ];

    for (const f of flightDefinitions) {
      const info = insertFlight.run(
        f.airline,
        f.flightNum,
        f.orig,
        f.dest,
        f.dep,
        f.arr,
        f.ac,
        f.days,
        '2020-01-01',
        '2035-12-31'
      );
      const flightId = Number(info.lastInsertRowid);

      for (const cls of standardClasses) {
        insertClass.run(flightId, cls.code, cls.seats);
      }
    }

    // 5. Fares
    // Route pricing tables:
    // Domestic: Y ~ 95k NGN, B ~ 85k NGN, M ~ 75k NGN, J ~ 220k NGN
    // Regional: Y ~ 450k NGN ($280), J ~ 1.2M NGN ($750)
    // International Europe: Y ~ 1.2M NGN ($750), J ~ 4.5M NGN ($2800)
    // International Middle East: Y ~ 1.1M NGN ($690), J ~ 4.2M NGN ($2600)
    // International US: Y ~ 1.8M NGN ($1100), J ~ 5.5M NGN ($3400)

    const fareTemplates = [
      // Domestic LOS <-> ABV
      { orig: 'LOS', dest: 'ABV', airline: 'W3', class: 'Y', ngn: 9500000, usd: 6000, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'LOS', dest: 'ABV', airline: 'W3', class: 'B', ngn: 8500000, usd: 5300, basis: 'BOWNG', pax: 'ADT' },
      { orig: 'LOS', dest: 'ABV', airline: 'W3', class: 'M', ngn: 7500000, usd: 4700, basis: 'MOWNG', pax: 'ADT' },
      { orig: 'LOS', dest: 'ABV', airline: 'W3', class: 'J', ngn: 22000000, usd: 13700, basis: 'JOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: 'W3', class: 'Y', ngn: 9500000, usd: 6000, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: 'W3', class: 'B', ngn: 8500000, usd: 5300, basis: 'BOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: 'W3', class: 'J', ngn: 22000000, usd: 13700, basis: 'JOWNG', pax: 'ADT' },

      { orig: 'LOS', dest: 'ABV', airline: 'P4', class: 'Y', ngn: 9000000, usd: 5600, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'LOS', dest: 'ABV', airline: 'P4', class: 'B', ngn: 8000000, usd: 5000, basis: 'BOWNG', pax: 'ADT' },
      { orig: 'LOS', dest: 'ABV', airline: 'P4', class: 'J', ngn: 20000000, usd: 12500, basis: 'JOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: 'P4', class: 'Y', ngn: 9000000, usd: 5600, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: 'P4', class: 'B', ngn: 8000000, usd: 5000, basis: 'BOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: 'P4', class: 'J', ngn: 20000000, usd: 12500, basis: 'JOWNG', pax: 'ADT' },

      // Domestic LOS <-> ABV (AW - Africa World Airlines)
      { orig: 'LOS', dest: 'ABV', airline: 'AW', class: 'Y', ngn: 8900000, usd: 5550, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: 'AW', class: 'Y', ngn: 8900000, usd: 5550, basis: 'YOWNG', pax: 'ADT' },

      // Domestic LOS <-> ABV (9J - Dana Air)
      { orig: 'LOS', dest: 'ABV', airline: '9J', class: 'Y', ngn: 8800000, usd: 5500, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: '9J', class: 'Y', ngn: 8800000, usd: 5500, basis: 'YOWNG', pax: 'ADT' },

      // Domestic LOS <-> PHC
      { orig: 'LOS', dest: 'PHC', airline: 'P4', class: 'Y', ngn: 9800000, usd: 6100, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'LOS', dest: 'PHC', airline: 'P4', class: 'J', ngn: 21000000, usd: 13100, basis: 'JOWNG', pax: 'ADT' },
      { orig: 'PHC', dest: 'LOS', airline: 'P4', class: 'Y', ngn: 9800000, usd: 6100, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'PHC', dest: 'LOS', airline: 'P4', class: 'J', ngn: 21000000, usd: 13100, basis: 'JOWNG', pax: 'ADT' },

      // Domestic LOS <-> KAN
      { orig: 'LOS', dest: 'KAN', airline: 'P4', class: 'Y', ngn: 11000000, usd: 6900, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'KAN', dest: 'LOS', airline: 'P4', class: 'Y', ngn: 11000000, usd: 6900, basis: 'YOWNG', pax: 'ADT' },

      // Domestic LOS <-> ENU
      { orig: 'LOS', dest: 'ENU', airline: 'P4', class: 'Y', ngn: 9200000, usd: 5750, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'ENU', dest: 'LOS', airline: 'P4', class: 'Y', ngn: 9200000, usd: 5750, basis: 'YOWNG', pax: 'ADT' },

      // Regional LOS <-> ACC
      { orig: 'LOS', dest: 'ACC', airline: 'P4', class: 'Y', ngn: 32000000, usd: 20000, basis: 'YOWAC', pax: 'ADT' },
      { orig: 'LOS', dest: 'ACC', airline: 'P4', class: 'J', ngn: 65000000, usd: 40600, basis: 'JOWAC', pax: 'ADT' },
      { orig: 'ACC', dest: 'LOS', airline: 'P4', class: 'Y', ngn: 32000000, usd: 20000, basis: 'YOWAC', pax: 'ADT' },

      // International LOS <-> LHR
      { orig: 'LOS', dest: 'LHR', airline: 'W3', class: 'Y', ngn: 95000000, usd: 59400, basis: 'YOWGB', pax: 'ADT' },
      { orig: 'LOS', dest: 'LHR', airline: 'W3', class: 'B', ngn: 88000000, usd: 55000, basis: 'BOWGB', pax: 'ADT' },
      { orig: 'LOS', dest: 'LHR', airline: 'W3', class: 'M', ngn: 78000000, usd: 48750, basis: 'MOWGB', pax: 'ADT' },
      { orig: 'LOS', dest: 'LHR', airline: 'W3', class: 'J', ngn: 280000000, usd: 175000, basis: 'JOWGB', pax: 'ADT' },
      { orig: 'LHR', dest: 'LOS', airline: 'W3', class: 'Y', ngn: 95000000, usd: 59400, basis: 'YOWGB', pax: 'ADT' },

      { orig: 'LOS', dest: 'LHR', airline: 'BA', class: 'Y', ngn: 120000000, usd: 75000, basis: 'YOWGB', pax: 'ADT' },
      { orig: 'LOS', dest: 'LHR', airline: 'BA', class: 'B', ngn: 105000000, usd: 65600, basis: 'BOWGB', pax: 'ADT' },
      { orig: 'LOS', dest: 'LHR', airline: 'BA', class: 'M', ngn: 92000000, usd: 57500, basis: 'MOWGB', pax: 'ADT' },
      { orig: 'LOS', dest: 'LHR', airline: 'BA', class: 'J', ngn: 420000000, usd: 262500, basis: 'JOWGB', pax: 'ADT' },
      { orig: 'LHR', dest: 'LOS', airline: 'BA', class: 'Y', ngn: 120000000, usd: 75000, basis: 'YOWGB', pax: 'ADT' },

      { orig: 'LOS', dest: 'LHR', airline: 'VS', class: 'Y', ngn: 115000000, usd: 71800, basis: 'YOWGB', pax: 'ADT' },
      { orig: 'LOS', dest: 'LHR', airline: 'VS', class: 'J', ngn: 395000000, usd: 246800, basis: 'JOWGB', pax: 'ADT' },

      // ABV <-> LHR
      { orig: 'ABV', dest: 'LHR', airline: 'BA', class: 'Y', ngn: 125000000, usd: 78100, basis: 'YOWGB', pax: 'ADT' },
      { orig: 'ABV', dest: 'LHR', airline: 'BA', class: 'J', ngn: 430000000, usd: 268750, basis: 'JOWGB', pax: 'ADT' },

      // International LOS <-> DXB
      { orig: 'LOS', dest: 'DXB', airline: 'EK', class: 'Y', ngn: 110000000, usd: 68750, basis: 'YOWAE', pax: 'ADT' },
      { orig: 'LOS', dest: 'DXB', airline: 'EK', class: 'B', ngn: 98000000, usd: 61250, basis: 'BOWAE', pax: 'ADT' },
      { orig: 'LOS', dest: 'DXB', airline: 'EK', class: 'M', ngn: 89000000, usd: 55600, basis: 'MOWAE', pax: 'ADT' },
      { orig: 'LOS', dest: 'DXB', airline: 'EK', class: 'J', ngn: 380000000, usd: 237500, basis: 'JOWAE', pax: 'ADT' },
      { orig: 'DXB', dest: 'LOS', airline: 'EK', class: 'Y', ngn: 110000000, usd: 68750, basis: 'YOWAE', pax: 'ADT' },

      // International LOS <-> DOH
      { orig: 'LOS', dest: 'DOH', airline: 'QR', class: 'Y', ngn: 108000000, usd: 67500, basis: 'YOWQA', pax: 'ADT' },
      { orig: 'LOS', dest: 'DOH', airline: 'QR', class: 'J', ngn: 375000000, usd: 234000, basis: 'JOWQA', pax: 'ADT' },

      // International LOS <-> ATL
      { orig: 'LOS', dest: 'ATL', airline: 'DL', class: 'Y', ngn: 165000000, usd: 103000, basis: 'YOWUS', pax: 'ADT' },
      { orig: 'LOS', dest: 'ATL', airline: 'DL', class: 'J', ngn: 520000000, usd: 325000, basis: 'JOWUS', pax: 'ADT' },

      // International LOS <-> CDG
      { orig: 'LOS', dest: 'CDG', airline: 'AF', class: 'Y', ngn: 118000000, usd: 73750, basis: 'YOWFR', pax: 'ADT' },
      { orig: 'LOS', dest: 'CDG', airline: 'AF', class: 'J', ngn: 410000000, usd: 256000, basis: 'JOWFR', pax: 'ADT' },

      // International LOS <-> FRA
      { orig: 'LOS', dest: 'FRA', airline: 'LH', class: 'Y', ngn: 122000000, usd: 76250, basis: 'YOWDE', pax: 'ADT' },
      { orig: 'LOS', dest: 'FRA', airline: 'LH', class: 'J', ngn: 425000000, usd: 265600, basis: 'JOWDE', pax: 'ADT' },

      // International LOS <-> ADD
      { orig: 'LOS', dest: 'ADD', airline: 'ET', class: 'Y', ngn: 72000000, usd: 45000, basis: 'YOWET', pax: 'ADT' },
      { orig: 'LOS', dest: 'ADD', airline: 'ET', class: 'J', ngn: 210000000, usd: 131250, basis: 'JOWET', pax: 'ADT' },

      // International LOS <-> NBO
      { orig: 'LOS', dest: 'NBO', airline: 'KQ', class: 'Y', ngn: 78000000, usd: 48750, basis: 'YOWKE', pax: 'ADT' },
      { orig: 'LOS', dest: 'NBO', airline: 'KQ', class: 'J', ngn: 230000000, usd: 143750, basis: 'JOWKE', pax: 'ADT' },

      // International LOS <-> IST
      { orig: 'LOS', dest: 'IST', airline: 'TK', class: 'Y', ngn: 98000000, usd: 61250, basis: 'YOWTR', pax: 'ADT' },
      { orig: 'LOS', dest: 'IST', airline: 'TK', class: 'J', ngn: 340000000, usd: 212500, basis: 'JOWTR', pax: 'ADT' },

      // Dana Air (AW) LOS <-> ABV
      { orig: 'LOS', dest: 'ABV', airline: 'AW', class: 'Y', ngn: 8800000, usd: 5500, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'ABV', dest: 'LOS', airline: 'AW', class: 'Y', ngn: 8800000, usd: 5500, basis: 'YOWNG', pax: 'ADT' },

      // ABV <-> PHC
      { orig: 'ABV', dest: 'PHC', airline: 'P4', class: 'Y', ngn: 9200000, usd: 5750, basis: 'YOWNG', pax: 'ADT' },
      { orig: 'PHC', dest: 'ABV', airline: 'P4', class: 'Y', ngn: 9200000, usd: 5750, basis: 'YOWNG', pax: 'ADT' },

      // BOM <-> DEL (Air India)
      { orig: 'BOM', dest: 'DEL', airline: 'AI', class: 'Y', ngn: 12000000, usd: 7500, basis: 'YOWIN', pax: 'ADT' },
      { orig: 'BOM', dest: 'DEL', airline: 'AI', class: 'J', ngn: 35000000, usd: 22000, basis: 'JOWIN', pax: 'ADT' },
      { orig: 'DEL', dest: 'BOM', airline: 'AI', class: 'Y', ngn: 12000000, usd: 7500, basis: 'YOWIN', pax: 'ADT' },
      { orig: 'DEL', dest: 'BOM', airline: 'AI', class: 'J', ngn: 35000000, usd: 22000, basis: 'JOWIN', pax: 'ADT' },
    ];

    for (const f of fareTemplates) {
      // ADT fare
      insertFare.run(
        f.airline,
        f.orig,
        f.dest,
        f.class,
        f.ngn,
        f.usd,
        f.basis,
        'ADT',
        365
      );
      // CHD fare (~75%)
      insertFare.run(
        f.airline,
        f.orig,
        f.dest,
        f.class,
        Math.round(f.ngn * 0.75),
        Math.round(f.usd * 0.75),
        `${f.basis}CH`,
        'CHD',
        365
      );
      // INF fare (~10%)
      insertFare.run(
        f.airline,
        f.orig,
        f.dest,
        f.class,
        Math.round(f.ngn * 0.10),
        Math.round(f.usd * 0.10),
        `${f.basis}IN`,
        'INF',
        365
      );
    }

    // 6. Queues & Queue Items
    db.prepare('DELETE FROM queues').run();
    db.prepare('DELETE FROM queue_items').run();

    const insertQueue = db.prepare('INSERT OR REPLACE INTO queues (queue_number, name, description) VALUES (?, ?, ?)');
    insertQueue.run(1, 'GENERAL', 'General incoming messages and schedule alerts');
    insertQueue.run(8, 'TICKETING TIME LIMIT', 'PNRs awaiting ticket issuance deadline');
    insertQueue.run(12, 'SCHEDULE CHANGE', 'Airline schedule adjustments');
    insertQueue.run(20, 'SUPERVISOR', 'Supervisor escalations and VIP bookings');

    const insertQueueItem = db.prepare(
      'INSERT INTO queue_items (queue_number, pnr_locator, pax_name, message) VALUES (?, ?, ?, ?)'
    );
    insertQueueItem.run(1, 'WLXJFH', 'SMITH/JOHN MR', 'SCHEDULE CONFIRMATION RECEIVED FROM AIRLINE');
    insertQueueItem.run(8, 'ABC789', 'DOE/JANE MRS', 'TICKET TIME LIMIT EXPIRING 1800');
    insertQueueItem.run(8, 'XYZ123', 'BELLO/TUNDE MR', 'TICKET TIME LIMIT EXPIRING 2000');

    // 7. Hotels (Tier 2)
    db.prepare('DELETE FROM hotels').run();
    const insertHotel = db.prepare(
      'INSERT INTO hotels (city_code, chain_code, name, address, rate_ngn, currency, stars) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertHotel.run('LOS', 'HL', 'EKO HOTEL & SUITES', 'Plot 1415 Adetokunbo Ademola St, VI', 18500000, 'NGN', 5);
    insertHotel.run('LOS', 'RA', 'RADISSON BLU ANCHORAGE', '1A Ozumba Mbadiwe Ave, VI', 16000000, 'NGN', 5);
    insertHotel.run('LOS', 'SI', 'LAGOS CONTINENTAL HOTEL', '52A Kofo Abayomi St, VI', 14000000, 'NGN', 4);
    insertHotel.run('ABV', 'HL', 'TRANSCORP HILTON ABUJA', '1 Aguiyi Ironsi St, Maitama', 19500000, 'NGN', 5);
    insertHotel.run('ABV', 'SI', 'SHERATON ABUJA HOTEL', 'Ladi Kwali St, Wuse Zone 4', 13500000, 'NGN', 4);
    insertHotel.run('LON', 'HL', 'HILTON LONDON PADDINGTON', '146 Praed St, London', 24000000, 'GBP', 4);
    insertHotel.run('LON', 'MC', 'MARRIOTT LONDON GROSVENOR SQ', 'Grosvenor Square, London', 28000000, 'GBP', 5);
    insertHotel.run('LHR', 'HL', 'HILTON LONDON HEATHROW AIRPORT', 'Terminal 4, Heathrow Airport', 24000000, 'NGN', 4);
    insertHotel.run('BOM', 'HL', 'THE TAJ MAHAL PALACE MUMBAI', 'Apollo Bunder, Colaba', 32000000, 'NGN', 5);
    insertHotel.run('PAR', 'HL', 'HILTON PARIS OPERA', '108 Rue Saint-Lazare', 38000000, 'NGN', 4);

    // 8. Car Rental Locations (Tier 2)
    db.prepare('DELETE FROM car_locations').run();
    const insertCar = db.prepare(
      'INSERT INTO car_locations (city_code, vendor_code, name, location_type, daily_rate_ngn, currency) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertCar.run('LOS', 'ZE', 'HERTZ LAGOS AIRPORT', 'AIRPORT', 4500000, 'NGN');
    insertCar.run('LOS', 'ZI', 'AVIS LAGOS IKEJA', 'DOWNTOWN', 4200000, 'NGN');
    insertCar.run('LOS', 'SX', 'SIXT LAGOS VI', 'DOWNTOWN', 4800000, 'NGN');
    insertCar.run('ABV', 'ZE', 'HERTZ ABUJA AIRPORT', 'AIRPORT', 4600000, 'NGN');
    insertCar.run('ABV', 'ZI', 'AVIS ABUJA MAITAMA', 'DOWNTOWN', 4300000, 'NGN');
    insertCar.run('LON', 'ZE', 'HERTZ LONDON MARBLE ARCH', 'DOWNTOWN', 6500000, 'GBP');
    insertCar.run('LON', 'ZI', 'AVIS LONDON VICTORIA', 'DOWNTOWN', 6200000, 'GBP');
    insertCar.run('LHR', 'ZE', 'HERTZ HEATHROW T4', 'AIRPORT', 6500000, 'NGN');
    insertCar.run('LHR', 'EP', 'EUROPCAR HEATHROW', 'AIRPORT', 6200000, 'NGN');
    insertCar.run('BOM', 'ZE', 'HERTZ MUMBAI AIRPORT', 'AIRPORT', 5000000, 'NGN');
    insertCar.run('PAR', 'ZE', 'HERTZ CDG AIRPORT', 'AIRPORT', 7000000, 'NGN');
  });

  runSeed();
  console.log('Seeding completed successfully.');
}

// When run directly as a script
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase();
}
