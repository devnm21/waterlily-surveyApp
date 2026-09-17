import session from "express-session";
import { sqlite } from "./index.js";

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function expiry(data: session.SessionData): number {
  const expires = data.cookie.expires;
  return expires ? new Date(expires).getTime() : Date.now() + SESSION_MAX_AGE_MS;
}

export class SqliteSessionStore extends session.Store {
  get(
    sid: string,
    callback: (error: unknown, data?: session.SessionData | null) => void,
  ): void {
    try {
      const row = sqlite
        .prepare("SELECT data, expires_at FROM sessions WHERE id = ?")
        .get(sid) as { data: string; expires_at: number } | undefined;
      if (!row || row.expires_at <= Date.now()) {
        if (row) this.destroy(sid);
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.data) as session.SessionData);
    } catch (error) {
      callback(error);
    }
  }

  set(
    sid: string,
    data: session.SessionData,
    callback?: (error?: unknown) => void,
  ): void {
    try {
      sqlite.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
      sqlite
        .prepare(`
          INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at
        `)
        .run(sid, JSON.stringify(data), expiry(data));
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid: string, callback?: (error?: unknown) => void): void {
    try {
      sqlite.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
      callback?.();
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid: string, data: session.SessionData, callback?: () => void): void {
    sqlite
      .prepare("UPDATE sessions SET expires_at = ? WHERE id = ?")
      .run(expiry(data), sid);
    callback?.();
  }
}
