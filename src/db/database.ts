import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('labtracker.db');

export type Session = {
  id: number;
  check_in: number;
  check_out: number | null;
  date: string;
};

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_in INTEGER NOT NULL,
      check_out INTEGER,
      date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  cleanupStaleSessions();
}

// check_out が NULL のまま日付をまたいだセッションをその日の23:59:59に自動クローズする
function cleanupStaleSessions() {
  const today = new Date().toISOString().split('T')[0];
  const staleSessions = db.getAllSync<Session>(
    'SELECT * FROM sessions WHERE check_out IS NULL AND date < ?',
    today
  );
  for (const s of staleSessions) {
    const endOfDay = new Date(s.date);
    endOfDay.setHours(23, 59, 59, 999);
    db.runSync(
      'UPDATE sessions SET check_out = ? WHERE id = ?',
      endOfDay.getTime(),
      s.id
    );
  }
}

export function startSession(): number {
  const now = Date.now();
  const date = new Date().toISOString().split('T')[0];
  const result = db.runSync(
    'INSERT INTO sessions (check_in, date) VALUES (?, ?)',
    now,
    date
  );
  return result.lastInsertRowId;
}

export function endSession(sessionId: number) {
  db.runSync(
    'UPDATE sessions SET check_out = ? WHERE id = ?',
    Date.now(),
    sessionId
  );
}

export function getActiveSession(): Session | null {
  return db.getFirstSync<Session>(
    'SELECT * FROM sessions WHERE check_out IS NULL ORDER BY check_in DESC LIMIT 1'
  );
}

export function getTodaySessions(): Session[] {
  const date = new Date().toISOString().split('T')[0];
  return db.getAllSync<Session>(
    'SELECT * FROM sessions WHERE date = ? ORDER BY check_in DESC',
    date
  );
}

export function getSessionsByDateRange(startDate: string, endDate: string): Session[] {
  return db.getAllSync<Session>(
    'SELECT * FROM sessions WHERE date >= ? AND date <= ? AND check_out IS NOT NULL ORDER BY date ASC',
    startDate,
    endDate
  );
}

export function getSetting(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.runSync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    key,
    value
  );
}
